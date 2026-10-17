import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const SUPERVISOR = ['owner','admin','manager','supervisor']
const assignable = (role, memberRole) => role === 'lead_supervisor' || role === 'supervisor'
  ? SUPERVISOR.includes(memberRole)
  : role === 'technician' ? ['technician','inspector'].includes(memberRole) : memberRole === 'maintenance'

export default function FieldProjects({ organizationId, role, sites = [] }) {
 const owner = ['owner','admin'].includes(role)
 const [projects,setProjects] = useState([])
 const [assignments,setAssignments] = useState([])
 const [staff,setStaff] = useState([])
 const [title,setTitle] = useState('')
 const [site,setSite] = useState('')
 const [jobNumber,setJobNumber] = useState('')
 const [selection,setSelection] = useState({})
 const [error,setError] = useState('')
 const [message,setMessage] = useState('')
 const [busy,setBusy] = useState(false)
 const load = async () => {
  const [p,a,s] = await Promise.all([
   supabase.from('field_projects').select('*').eq('organization_id',organizationId).order('created_at',{ascending:false}),
   supabase.from('field_project_assignments').select('*').eq('organization_id',organizationId),
   owner ? supabase.rpc('list_field_project_staff',{p_org:organizationId}) : Promise.resolve({data:[],error:null}),
  ])
  for(const item of [p,a,s]) if(item.error) throw item.error
  setProjects(p.data||[]);setAssignments(a.data||[]);setStaff(s.data||[])
 }
 useEffect(()=>{load().catch(e=>setError(e.message))},[organizationId])
 const act=async(fn)=>{setBusy(true);setError('');setMessage('');try{await fn();await load()}catch(e){setError(e.message||'Action failed')}finally{setBusy(false)}}
 const rpc=async(name,args)=>{const {data,error:e}=await supabase.rpc(name,args);if(e)throw e;return data}
 const create=async(e)=>{e.preventDefault();await act(async()=>{await rpc('create_field_project',{p_org:organizationId,p_title:title.trim(),p_site:site||null,p_job_number:jobNumber||null});setTitle('');setSite('');setJobNumber('');setMessage('Project created for Owner review.')})}
 const assign=(project)=>act(async()=>{
  const value=selection[project.id]||{}
  if(!value.user||!value.role)throw Error('Select an employee and assignment role.')
  await rpc('assign_field_project_member',{p_project:project.id,p_user:value.user,p_role:value.role})
  setMessage('Assignment saved.')
 })
 const transition=(p,status)=>act(async()=>{await rpc('transition_field_project',{p_project:p.id,p_status:status});setMessage('Project status updated.')})
 return <div className="page-stack">
  <div className="page-heading"><div><p className="eyebrow">Corporate project workflow</p><h1>Projects</h1><p>Owner review, supervisor assignment, scheduling, and controlled closure.</p></div></div>
  {owner&&<form className="panel form-stack" onSubmit={create}><h2>Create project</h2><label>Project / jobsite name<input value={title} required onChange={e=>setTitle(e.target.value)}/></label><label>Job number<input value={jobNumber} onChange={e=>setJobNumber(e.target.value)}/></label><label>Jobsite<select value={site} onChange={e=>setSite(e.target.value)}><option value="">Not linked yet</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button className="primary-button" disabled={busy}>Create for Owner review</button><p className="muted">Zoho Job Won import is not connected yet. Create project records here while we build that trigger.</p></form>}
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  <section className="panel"><h2>{owner?'All corporate projects':'My assigned projects'}</h2>{!projects.length&&<p className="muted">No accessible projects yet.</p>}
  <div className="activity-list">{projects.map(p=>{
   const assigned=assignments.filter(a=>a.project_id===p.id)
   const value=selection[p.id]||{role:'lead_supervisor',user:''}
   const options=staff.filter(s=>assignable(value.role,s.role))
   return <article key={p.id}><div style={{width:'100%'}}><strong>{p.title}</strong><p>{p.job_number||'No job number'} · {p.status.replaceAll('_',' ')}</p>
   <p className="muted">{assigned.map(a=>{const s=staff.find(x=>x.user_id===a.member_id);return (s?.email||'Assigned employee')+' ('+a.assignment_role.replaceAll('_',' ')+')'}).join(' · ')||'No assigned crew'}</p>
   {owner&&p.status!=='closed'&&<div className="form-stack">
    <label>Assignment type<select value={value.role} onChange={e=>setSelection(v=>({...v,[p.id]:{role:e.target.value,user:''}}))}><option value="lead_supervisor">Lead supervisor</option><option value="supervisor">Supporting supervisor</option><option value="technician">Technician</option><option value="maintenance">Maintenance</option></select></label>
    <label>Employee<select value={value.user} onChange={e=>setSelection(v=>({...v,[p.id]:{...value,user:e.target.value}}))}><option value="">Select employee</option>{options.map(s=><option key={s.user_id} value={s.user_id}>{s.email} ({s.role})</option>)}</select></label>
    <button type="button" className="secondary-button" disabled={busy||!value.user} onClick={()=>assign(p)}>Assign employee</button>
   </div>}
   <div className="section-actions" style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
   {owner&&p.status==='owner_review'&&<button className="primary-button" disabled={busy} onClick={()=>transition(p,'work_scheduled')}>Move to Work Scheduled</button>}
   {owner&&p.status==='work_scheduled'&&<button className="primary-button" disabled={busy} onClick={()=>transition(p,'active')}>Start project</button>}
   {p.status==='active'&&<button className="secondary-button" disabled={busy} onClick={()=>transition(p,'submitted_for_close')}>Submit completion</button>}
   {owner&&p.status==='submitted_for_close'&&<button className="primary-button" disabled={busy} onClick={()=>transition(p,'closed')}>Approve and close — revoke crew access</button>}
   {owner&&p.status==='closed'&&<button className="secondary-button" disabled={busy} onClick={()=>transition(p,'owner_review')}>Reopen for Owner review</button>}
   </div>
   </div></article>
  })}</div></section>
  <p className="muted">Project-list access ends at closure for assigned staff. Existing asset, inspection, storage and payroll access still require separate project-level policies before this is used for sensitive customer records.</p>
 </div>
}