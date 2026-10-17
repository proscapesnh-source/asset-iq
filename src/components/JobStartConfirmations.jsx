import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const managerRoles = ['owner','admin','manager','supervisor']
export default function JobStartConfirmations({ organizationId, userEmail, role, sites = [] }) {
 const manager = managerRoles.includes(role)
 const [jobs,setJobs] = useState([])
 const [techs,setTechs] = useState([])
 const [events,setEvents] = useState([])
 const [form,setForm] = useState({job_title:'',technician_email:'',start_date:'',start_time:'',site_id:'',notes:''})
 const [note,setNote] = useState({})
 const [busy,setBusy] = useState(false)
 const [error,setError] = useState('')
 const [message,setMessage] = useState('')
 const [revision,setRevision] = useState(0)
 useEffect(()=>{
  if(!organizationId)return
  let live=true
  const run=async()=>{
   const {data,error:e}=await supabase.from('job_start_confirmations').select('*').eq('organization_id',organizationId).order('start_date',{ascending:true})
   if(e)throw e
   if(live)setJobs(data||[])
   if(manager){
    const [t,a]=await Promise.all([
     supabase.rpc('list_technicians',{p_organization_id:organizationId}),
     supabase.from('job_start_confirmation_events').select('*').eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(100)
    ])
    if(t.error)throw t.error
    if(a.error)throw a.error
    if(live){setTechs(t.data||[]);setEvents(a.data||[])}
   }
  }
  run().catch(e=>{if(live)setError(e.message)})
  return ()=>{live=false}
 },[organizationId,manager,revision])
 async function execute(task,success){
  setBusy(true);setError('');setMessage('')
  try{await task();setMessage(success);setRevision(x=>x+1)}
  catch(e){setError(e.message||'Unable to save confirmation')}
  finally{setBusy(false)}
 }
 const submit=e=>{e.preventDefault();execute(async()=>{
  const {error:e}=await supabase.rpc('schedule_job_start',{p_org:organizationId,p_title:form.job_title,p_email:form.technician_email,p_date:form.start_date,p_time:form.start_time||null,p_notes:form.notes||null,p_site:form.site_id||null})
  if(e)throw e
  setForm({job_title:'',technician_email:'',start_date:'',start_time:'',site_id:'',notes:''})
 },'Job start sent to technician for confirmation.')}
 const respond=(job,status)=>execute(async()=>{
  const {error:e}=await supabase.rpc('respond_job_start',{p_id:job.id,p_status:status,p_note:note[job.id]||null})
  if(e)throw e
 },status==='confirmed'?'Start date confirmed.':'Change request sent to supervisor.')
 const reschedule=(job)=>{
  const date=window.prompt('New start date (YYYY-MM-DD)',job.start_date)
  if(date===null)return
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){setError('Enter a date in YYYY-MM-DD format.');return}
  execute(async()=>{
   const {error:e}=await supabase.rpc('reschedule_job_start',{p_id:job.id,p_date:date,p_time:job.start_time||null,p_notes:job.notes||null})
   if(e)throw e
  },'New date saved; technician confirmation reset to pending.')
 }
 const counts={pending:jobs.filter(j=>j.status==='pending').length,confirmed:jobs.filter(j=>j.status==='confirmed').length,change_requested:jobs.filter(j=>j.status==='change_requested').length}
 return <section className="panel">
  <div className="section-header"><div><p className="eyebrow">Crew scheduling</p><h2>Job start confirmations</h2><p className="muted">Every technician response is timestamped and retained in the schedule history.</p></div></div>
  {error&&<p role="alert" className="error-message">{error}</p>}
  {message&&<p role="status">{message}</p>}
  <p className="muted">{counts.pending} awaiting reply · {counts.confirmed} confirmed · {counts.change_requested} change requested</p>
  {manager&&<form className="form-stack" onSubmit={submit}>
   <h3>Request a start-date confirmation</h3>
   <label>Job / project<input required value={form.job_title} onChange={e=>setForm({...form,job_title:e.target.value})} /></label>
   <label>Technician<select required value={form.technician_email} onChange={e=>setForm({...form,technician_email:e.target.value})}>
    <option value="">Select a technician</option>
    {techs.map(t=><option key={t.member_id} value={t.member_email}>{t.member_email}</option>)}
   </select></label>
   <label>Site (optional)<select value={form.site_id} onChange={e=>setForm({...form,site_id:e.target.value})}><option value="">No site selected</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <label>Start date<input required type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></label>
   <label>Start time (optional)<input type="time" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})}/></label>
   <label>Instructions<textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
   <button className="primary-button" disabled={busy||!techs.length}>Request confirmation</button>
  </form>}
  <div className="activity-list">
   {!jobs.length&&<p className="muted">No job start dates assigned yet.</p>}
   {jobs.map(j=><article key={j.id}><div style={{width:'100%'}}>
    <strong>{j.job_title}</strong>
    <p>{j.start_date}{j.start_time?' · '+j.start_time.slice(0,5):''} · {j.status.replaceAll('_',' ')}</p>
    {manager&&<p className="muted">Technician: {j.technician_email}</p>}
    {j.notes&&<p>{j.notes}</p>}
    {j.technician_note&&<p>Technician note: {j.technician_note}</p>}
    {j.responded_at&&<small>Responded: {new Date(j.responded_at).toLocaleString()}</small>}
    {!manager&&j.status==='pending'&&<div className="form-stack">
     <label>Response note (optional)<textarea rows={2} value={note[j.id]||''} onChange={e=>setNote({...note,[j.id]:e.target.value})}/></label>
     <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" disabled={busy} className="primary-button" onClick={()=>respond(j,'confirmed')}>Confirm start date</button><button type="button" disabled={busy} className="secondary-button" onClick={()=>respond(j,'change_requested')}>Request a change</button></div>
    </div>}
    {manager&&<button type="button" disabled={busy} className="secondary-button" onClick={()=>reschedule(j)}>Change start date</button>}
    {manager&&<details><summary>Confirmation history</summary>{events.filter(e=>e.confirmation_id===j.id).map(e=><p key={e.id}>{new Date(e.created_at).toLocaleString()} · {e.action.replaceAll('_',' ')} {e.details||''}</p>)}</details>}
   </div></article>)}
  </div>
 </section>
}