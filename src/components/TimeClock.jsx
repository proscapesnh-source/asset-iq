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

export default function TimeClock({ organizationId, role, sites=[] }) {
 const manager = managers.includes(role)
 const [rows,setRows] = useState([])
 const [site,setSite] = useState('')
 const [type,setType] = useState('job')
 const [note,setNote] = useState('')
 const [busy,setBusy] = useState(false)
 const [error,setError] = useState('')
 const [message,setMessage] = useState('')
 const [email,setEmail] = useState('')
 const [days,setDays] = useState(14)
 const [gpsNotice,setGpsNotice] = useState('')
 const load = async () => {
  const [{data:records,error:readError},{data:auth}] = await Promise.all([
   supabase.rpc('list_technician_timesheet_gps',{p_org:organizationId,p_days:days}),
   supabase.auth.getUser()
  ])
  if(readError) throw readError
  setRows(records || [])
  setEmail(auth?.user?.email || '')
 }
 useEffect(()=>{ if(!organizationId)return; let active=true
  const refresh=async()=>{try{await load()}catch(e){if(active)setError(e.message)}}
  refresh();const onFocus=()=>refresh();window.addEventListener('focus',onFocus)
  return ()=>{active=false;window.removeEventListener('focus',onFocus)}
 },[organizationId,days])
 const own=rows.filter(r=>r.technician_email?.toLowerCase()===email.toLowerCase())
 const active=own.find(r=>!r.clock_out_at)
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
 const exportCsv=()=>{
  const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"'
  const lines=[['Technician','Site','Type','Clock in','Clock out','Hours','Note','In latitude','In longitude','In GPS accuracy m','Out latitude','Out longitude','Out GPS accuracy m'],...rows.map(r=>[r.technician_email,sites.find(s=>s.id===r.site_id)?.name||'',r.work_type,r.clock_in_at,r.clock_out_at||'',r.clock_out_at?hours(r):'',r.note||'',r.clock_in_lat??'',r.clock_in_lon??'',r.clock_in_accuracy_m??'',r.clock_out_lat??'',r.clock_out_lon??'',r.clock_out_accuracy_m??''])]
  const blob=new Blob([lines.map(line=>line.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='polyshield-timesheet.csv';a.click();URL.revokeObjectURL(url)
 }
 return <div className="page-stack">
  <div className="page-heading"><div><p className="eyebrow">Workforce time tracking</p><h1>Time clock</h1><p>Times are recorded by the server. Job and travel time are tracked separately.</p></div></div>
  {error&&<p className="error-message" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  <section className="panel">
   <h2>{active?'You are clocked in':'Start your shift'}</h2>
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
   <div className="section-header"><div><h2>{manager?'Crew timesheets':'My timesheet'}</h2><p className="muted">Hours shown are elapsed hours; breaks and payroll approval are not automated.</p></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><label>Period <select value={days} onChange={e=>setDays(+e.target.value)}><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>{manager&&<button type="button" className="secondary-button" onClick={exportCsv}>Export CSV</button>}</div></div>
   {manager&&Array.from(totals.entries()).map(([person,total])=><p key={person}><strong>{person}</strong> · {total.toFixed(2)} completed hours</p>)}
   <div className="activity-list">{rows.map(r=><article key={r.id}><div><strong>{manager?r.technician_email:sites.find(s=>s.id===r.site_id)?.name||'Shift'} · {r.work_type}</strong><p>{fmt(r.clock_in_at)} → {fmt(r.clock_out_at)}</p><p>{r.clock_out_at?hours(r)+' hours':'Shift in progress'}{r.site_id?' · '+(sites.find(s=>s.id===r.site_id)?.name||'Site'):''}</p>{r.note&&<small>{r.note}</small>}<p><small>Clock-in GPS: {gpsText(r.clock_in_lat,r.clock_in_lon,r.clock_in_accuracy_m)} {r.clock_in_lat!=null&&r.clock_in_lon!=null&&<a href={mapsLink(r.clock_in_lat,r.clock_in_lon)} target="_blank" rel="noopener noreferrer">View map</a>}</small></p><p><small>Clock-out GPS: {gpsText(r.clock_out_lat,r.clock_out_lon,r.clock_out_accuracy_m)} {r.clock_out_lat!=null&&r.clock_out_lon!=null&&<a href={mapsLink(r.clock_out_lat,r.clock_out_lon)} target="_blank" rel="noopener noreferrer">View map</a>}</small></p></div></article>)}{!rows.length&&<p className="muted">No recorded shifts in this period.</p>}</div>
  </section>
 </div>
}