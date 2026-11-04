import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const getGPS = () => new Promise(resolve => {
 if (!navigator.geolocation || !window.isSecureContext) { resolve({p_lat:null,p_lon:null,p_accuracy:null,notice:'Location unavailable on this device or insecure connection.'}); return }
 navigator.geolocation.getCurrentPosition(
  ({coords})=>resolve({p_lat:coords.latitude,p_lon:coords.longitude,p_accuracy:coords.accuracy,notice:''}),
  ()=>resolve({p_lat:null,p_lon:null,p_accuracy:null,notice:'Location permission denied or GPS unavailable; time will still be recorded without coordinates.'}),
  {enableHighAccuracy:true,timeout:12000,maximumAge:0}
 )
})
const gpsText = (lat,lon,accuracy) => lat == null || lon == null ? 'Location not recorded' : `${lat.toFixed(5)}, ${lon.toFixed(5)} (±${Math.round(accuracy || 0)} m)`
const mapsLink = (lat,lon) => `https://www.google.com/maps?q=${encodeURIComponent(lat+','+lon)}`
const managers = ['owner','admin','manager','supervisor']
const fmt = value => value ? new Date(value).toLocaleString() : 'Active'
const hours = row => ((new Date(row.clock_out_at || Date.now()) - new Date(row.clock_in_at))/3600000).toFixed(2)

export default function TimeClock({ organizationId, role, sites=[], defaultSiteId='' }) {
 const manager = managers.includes(role)
 const [rows,setRows] = useState([])
 const [site,setSite] = useState(defaultSiteId)
 const [type,setType] = useState('job')
 const [note,setNote] = useState('')
 const [busy,setBusy] = useState(false)
 const [error,setError] = useState('')
 const [message,setMessage] = useState('')
 const [email,setEmail] = useState('')
 const [days,setDays] = useState(14)
 const [gpsNotice,setGpsNotice] = useState('')
 const [corrections,setCorrections] = useState([])
 const [editing,setEditing] = useState(null)
 const [editForm,setEditForm] = useState({start:'',end:'',reason:'',site:'',type:'job'})
 const [now,setNow] = useState(Date.now())
 const [alerted,setAlerted] = useState('')
 const [soundEnabled,setSoundEnabled] = useState(false)
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(id)},[])
 const localInput = value => {if(!value)return '';const d=new Date(value);const p=n=>String(n).padStart(2,'0');return [d.getFullYear(),'-',p(d.getMonth()+1),'-',p(d.getDate()),'T',p(d.getHours()),':',p(d.getMinutes())].join('')}
 const openCorrection = r => {setEditing(r.id);setEditForm({start:localInput(r.clock_in_at),end:localInput(r.clock_out_at),reason:'',site:r.site_id||'',type:r.work_type})}
 const saveCorrection = async r => {setBusy(true);setError('');setMessage('')
  try {if(!editForm.start||editForm.reason.trim().length<5)throw new Error('Enter a start time and reason (at least 5 characters).')
   const {error:e}=await supabase.rpc('correct_technician_time',{p_org:organizationId,p_entry:r.id,p_clock_in:new Date(editForm.start).toISOString(),p_clock_out:editForm.end?new Date(editForm.end).toISOString():null,p_reason:editForm.reason,p_site:editForm.site||null,p_work_type:editForm.type})
   if(e)throw e;setEditing(null);await load();setMessage('Supervisor correction saved with audit history.')
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 const playTone = () => {try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ctx=new C();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.frequency.value=880;gain.gain.value=0.18;osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+0.45);osc.onended=()=>ctx.close()}catch{}}

 const load = async () => {
  const [{data:records,error:readError},{data:auth}] = await Promise.all([
   supabase.rpc('list_technician_timesheet_gps',{p_org:organizationId,p_days:days}),
   supabase.auth.getUser()
  ])
  if(readError) throw readError
  const {data:edits,error:correctionError}=await supabase.rpc('list_time_clock_corrections',{p_org:organizationId,p_days:days})
  if(correctionError) throw correctionError
  const byId=new Map((edits||[]).map(c=>[c.entry_id,c]))
  setCorrections(edits||[])
  setRows((records||[]).map(r=>{const c=byId.get(r.id);return c?{...r,clock_in_at:c.corrected_clock_in_at,clock_out_at:c.corrected_clock_out_at,site_id:c.corrected_site_id,work_type:c.corrected_work_type,correction_reason:c.reason,corrected_at:c.corrected_at}:r}))

  setEmail(auth?.user?.email || '')
 }
 useEffect(()=>{ if(!organizationId)return; let active=true
  const refresh=async()=>{try{await load()}catch(e){if(active)setError(e.message)}}
  refresh();const onFocus=()=>refresh();window.addEventListener('focus',onFocus)
  return ()=>{active=false;window.removeEventListener('focus',onFocus)}
 },[organizationId,days])
 const own=rows.filter(r=>r.technician_email?.toLowerCase()===email.toLowerCase())
 const active=own.find(r=>!r.clock_out_at)
 const activeElapsed=active?(now-new Date(active.clock_in_at).getTime())/3600000:0
 const reminderLevel=activeElapsed>=14?'Supervisor review required (14+ hours)':activeElapsed>=12.5?'Second clock-out reminder (12.5 hours)':activeElapsed>=12?'12-hour shift reached — clock out or confirm you are still working':''
 useEffect(()=>{if(!active||activeElapsed<12||!soundEnabled)return
   const threshold=activeElapsed>=14?'14':activeElapsed>=12.5?'12.5':'12'
   const key=active.id+':'+threshold
   if(alerted===key)return
   setAlerted(key);playTone()
   if('Notification' in window && Notification.permission==='granted'&&document.visibilityState==='visible')new Notification('PolyShield: Clock-out reminder',{body:'You have been clocked in for '+threshold+' hours. Clock out if your shift has ended.'})
 },[active?.id,activeElapsed>=12,activeElapsed>=12.5,activeElapsed>=14,soundEnabled,alerted])

 const change=async(action)=>{
  setBusy(true);setError('');setMessage('')
  try {
   if(!navigator.onLine) throw new Error('An internet connection is required to clock in or out.')
   const gps=await getGPS()
   setGpsNotice(gps.notice)
   const {notice,...coords}=gps
   const {error:e}=await supabase.rpc(action==='in'?'clock_in_technician_gps':'clock_out_technician_gps',
    action==='in'?{p_org:organizationId,p_site:site||null,p_work_type:type,p_note:note,...coords}:{p_org:organizationId,p_note:note,...coords})
   if(e)throw e
   setNote('');await load();setMessage(action==='in'?'Clock-in saved.':'Clock-out saved.')
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 const totals=new Map()
 rows.filter(r=>r.clock_out_at).forEach(r=>totals.set(r.technician_email,(totals.get(r.technician_email)||0)+(+hours(r))))
 const csvDownload=(filename,columns,records)=>{
  const escapeCell=value=>{const raw=String(value??'');const safe=/^[\\s]*[=+@-]/.test(raw)&&!/^-[0-9.]+$/.test(raw)?"'"+raw:raw;return '"'+safe.replaceAll('"','""')+'"'}
  const lines=[columns,...records].map(line=>line.map(escapeCell).join(',')).join('\\r\\n')
  const blob=new Blob(['\\uFEFF'+lines],{type:'text/csv;charset=utf-8'})
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
 }
 const exportCsv=()=>csvDownload('polyshield-timesheet-sheets.csv',
  ['Technician','Site','Type','Clock in','Clock out','Hours','Note','Correction reason','Corrected at','In latitude','In longitude','In GPS accuracy m','Out latitude','Out longitude','Out GPS accuracy m'],
  rows.map(r=>[r.technician_email,sites.find(s=>s.id===r.site_id)?.name||'',r.work_type,r.clock_in_at,r.clock_out_at||'',r.clock_out_at?hours(r):'',r.note||'',r.correction_reason||'',r.corrected_at||'',r.clock_in_lat??'',r.clock_in_lon??'',r.clock_in_accuracy_m??'',r.clock_out_lat??'',r.clock_out_lon??'',r.clock_out_accuracy_m??'']))
 const exportWeeklyPayroll=()=>{
  const start=new Date();start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7)-7)
  const end=new Date(start);end.setDate(end.getDate()+7)
  const weekly=rows.filter(r=>new Date(r.clock_in_at)<end&&new Date(r.clock_out_at||Date.now())>=start)
  const grouped=new Map()
  for(const r of weekly){const key=[r.technician_email,r.site_id||'',r.work_type].join('|');if(!grouped.has(key))grouped.set(key,{email:r.technician_email,site:sites.find(s=>s.id===r.site_id)?.name||'',type:r.work_type,hours:0,shifts:0,open:0,adjusted:0})
   const g=grouped.get(key);g.shifts++;
   if(!r.clock_out_at){g.open++;continue}
   const begin=Math.max(new Date(r.clock_in_at).getTime(),start.getTime());const finish=Math.min(new Date(r.clock_out_at).getTime(),end.getTime());g.hours+=Math.max(0,finish-begin)/3600000;if(r.correction_reason)g.adjusted++
  }
  csvDownload('polyshield-payroll-week-'+start.toISOString().slice(0,10)+'.csv',
   ['Week start (local)','Week end exclusive (local)','Technician','Site','Type','Completed hours','Shifts','Open shifts (review)','Corrected shifts (review)','Status'],
   Array.from(grouped.values()).map(g=>[start.toLocaleDateString(),end.toLocaleDateString(),g.email,g.site,g.type,g.hours.toFixed(2),g.shifts,g.open,g.adjusted,g.open?'REVIEW OPEN SHIFT':'REVIEW BEFORE PAYROLL']))
 }

 return <div className="page-stack">
  <div className="page-heading"><div><p className="eyebrow">Workforce time tracking</p><h1>Time clock</h1><p>Times are recorded by the server. Job and travel time are tracked separately.</p></div></div>
  {error&&<p className="error-message" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  <section className="panel">
   <h2>{active?'You are clocked in':'Start your shift'}</h2>
   {active&&reminderLevel&&<p role="alert" className="error-message"><strong>{reminderLevel}</strong>. If your shift has ended, clock out now. The audible in-app tone works only while PolyShield is open.</p>}
   {active&&<button type="button" className="secondary-button" onClick={()=>{setSoundEnabled(true);playTone();if('Notification' in window&&Notification.permission==='default')Notification.requestPermission()}}>{soundEnabled?'Sound reminders enabled while app is open':'Enable and test reminder tone'}</button>}
   {active?<p><strong>Started:</strong> {fmt(active.clock_in_at)} · {active.work_type} · {hours(active)} hours elapsed</p>:<>
    <label>Work type <select value={type} onChange={e=>setType(e.target.value)}><option value="job">On-site work</option><option value="travel">Work travel</option></select></label>
    <label>Job site <select value={site} onChange={e=>setSite(e.target.value)}><option value="">No site selected</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   </>}
   <label>Notes (optional)<textarea maxLength={500} rows={2} value={note} onChange={e=>setNote(e.target.value)} /></label>
   <button className="primary-button" type="button" disabled={busy||!email} onClick={()=>change(active?'out':'in')}>{busy?'Saving…':active?'Clock out':'Clock in'}</button>
   <p className="muted">On each clock-in/out, your device requests your location once. No continuous tracking. You can deny permission; your hours will still be saved, with no GPS coordinates. Phone location can be inaccurate or spoofed and is not proof of presence.</p>
   {gpsNotice&&<p role="status" className="muted">{gpsNotice}</p>}
  </section>
  <section className="panel">
   <div className="section-header"><div><h2>{manager?'Crew timesheets':'My timesheet'}</h2><p className="muted">Hours shown are elapsed hours; breaks and payroll approval are not automated.</p></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><label>Period <select value={days} onChange={e=>setDays(+e.target.value)}><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>{manager&&<><button type="button" className="secondary-button" onClick={exportCsv}>Export for Google Sheets (CSV)</button><button type="button" className="secondary-button" onClick={exportWeeklyPayroll}>Last week payroll CSV</button></>}</div></div>
   {manager&&Array.from(totals.entries()).map(([person,total])=><p key={person}><strong>{person}</strong> · {total.toFixed(2)} completed hours</p>)}
   <div className="activity-list">{rows.map(r=><article key={r.id}><div><strong>{manager?r.technician_email:sites.find(s=>s.id===r.site_id)?.name||'Shift'} · {r.work_type}</strong><p>{fmt(r.clock_in_at)} → {fmt(r.clock_out_at)}</p><p>{r.clock_out_at?hours(r)+' hours':'Shift in progress'}{r.site_id?' · '+(sites.find(s=>s.id===r.site_id)?.name||'Site'):''}</p>{r.note&&<small>{r.note}</small>}{r.correction_reason&&<p><small><strong>Supervisor corrected:</strong> {r.correction_reason} ({fmt(r.corrected_at)})</small></p>}
   {manager&&<div style={{marginTop:8}}><button type="button" className="secondary-button" onClick={()=>editing===r.id?setEditing(null):openCorrection(r)}> {editing===r.id?'Cancel correction':'Correct technician time'}</button>
   {editing===r.id&&<div className="panel" style={{marginTop:10,display:'grid',gap:8}}>
     <label>Actual clock-in <input type="datetime-local" value={editForm.start} onChange={e=>setEditForm({...editForm,start:e.target.value})}/></label>
     <label>Actual clock-out <input type="datetime-local" value={editForm.end} onChange={e=>setEditForm({...editForm,end:e.target.value})}/></label>
     <label>Work type <select value={editForm.type} onChange={e=>setEditForm({...editForm,type:e.target.value})}><option value="job">On-site work</option><option value="travel">Travel</option></select></label>
     <label>Job site <select value={editForm.site} onChange={e=>setEditForm({...editForm,site:e.target.value})}><option value="">No site</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
     <label>Required correction reason <textarea rows={2} value={editForm.reason} onChange={e=>setEditForm({...editForm,reason:e.target.value})} placeholder="Forgot to clock out; confirmed actual end time with technician"/></label>
     <button className="primary-button" type="button" disabled={busy||!editForm.start||editForm.reason.trim().length<5} onClick={()=>saveCorrection(r)}>Save reviewed time correction</button>
   </div>}</div>}<p><small>Clock-in GPS: {gpsText(r.clock_in_lat,r.clock_in_lon,r.clock_in_accuracy_m)} {r.clock_in_lat!=null&&r.clock_in_lon!=null&&<a href={mapsLink(r.clock_in_lat,r.clock_in_lon)} target="_blank" rel="noopener noreferrer">View map</a>}</small></p><p><small>Clock-out GPS: {gpsText(r.clock_out_lat,r.clock_out_lon,r.clock_out_accuracy_m)} {r.clock_out_lat!=null&&r.clock_out_lon!=null&&<a href={mapsLink(r.clock_out_lat,r.clock_out_lon)} target="_blank" rel="noopener noreferrer">View map</a>}</small></p></div></article>)}{!rows.length&&<p className="muted">No recorded shifts in this period.</p>}</div>
  </section>
 </div>
}