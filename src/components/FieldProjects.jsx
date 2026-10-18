import ZohoAttachmentTools from './ZohoAttachmentTools'
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
 const [syncResult,setSyncResult] = useState(null)
 const [search,setSearch] = useState('')
 const [statusFilter,setStatusFilter] = useState('all')
 const visibleProjects = projects.filter(p => {
  if(statusFilter !== 'all' && p.status !== statusFilter)return false
  const siteName = sites.find(s=>s.id===p.site_id)?.name || ''
  const haystack = [p.title,p.job_number,p.zoho_record_id,p.description,siteName].filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(search.trim().toLowerCase())
 })
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
 const syncWonJobs=()=>act(async()=>{
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token)throw new Error('Please sign in again.')
  const response=await fetch('https://tntbijxtaatsycluiude.supabase.co/functions/v1/zoho-job-won-import',{
   method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
   body:JSON.stringify({organization_id:organizationId})
  })
  const result=await response.json()
  if(!response.ok)throw new Error(result.error||'Unable to import Purchase Order Received records.')
  setSyncResult(result)
  setMessage(result.created+' new Purchase Order Received project(s) sent to Owner Review; '+result.existing+' previously imported.')
 })
 const linkSite=(project,siteId)=>act(async()=>{
  const {error:e}=await supabase.rpc('set_field_project_site',{p_project:project.id,p_site:siteId||null})
  if(e)throw e
  setMessage('Jobsite link updated. Reopen Projects to refresh photo choices.')
 })
 const assign=(project)=>act(async()=>{
  const value=selection[project.id]||{}
  if(!value.user||!value.role)throw Error('Select an employee and assignment role.')
  await rpc('assign_field_project_member',{p_project:project.id,p_user:value.user,p_role:value.role})
  setMessage('Assignment saved.')
 })
 const transition=(p,status)=>act(async()=>{await rpc('transition_field_project',{p_project:p.id,p_status:status});setMessage('Project status updated.')})
 return <div className="page-stack">
  <div className="page-heading"><div><p className="eyebrow">Corporate project workflow</p><h1>Projects</h1><p>Owner review, supervisor assignment, scheduling, and controlled closure.</p></div></div>
  {owner&&<section className="panel"><h2>Zoho CRM — Purchase Order Received</h2><p>Import JobSites with the exact stage <strong>Purchase Order Received</strong> into Owner Review. Existing Zoho IDs are skipped. Nothing is scheduled and no Zoho records are changed.</p><button type="button" className="primary-button" disabled={busy} onClick={syncWonJobs}>{busy?'Checking Zoho…':'Import Purchase Order Received projects'}</button>{syncResult&&<p role="status">{syncResult.matched} matching JobSites checked · {syncResult.created} imported · {syncResult.existing} already present{syncResult.failures?.length?' · '+syncResult.failures.length+' errors':''}</p>}</section>}
  {owner&&<form className="panel form-stack" onSubmit={create}><h2>Create project</h2><label>Project / jobsite name<input value={title} required onChange={e=>setTitle(e.target.value)}/></label><label>Job number<input value={jobNumber} onChange={e=>setJobNumber(e.target.value)}/></label><label>Jobsite<select value={site} onChange={e=>setSite(e.target.value)}><option value="">Not linked yet</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button className="primary-button" disabled={busy}>Create for Owner review</button><p className="muted">Projects imported from Zoho appear above under Owner Review. You can also create test projects manually.</p></form>}
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  <section className="panel"><h2>{owner?'All corporate projects':'My assigned projects'}</h2><div className="form-stack" style={{marginBottom:16}}><label>Search projects<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Project, customer, job number, Zoho ID, jobsite" autoComplete="off" /></label><label>Project status<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="owner_review">Owner Review</option><option value="work_scheduled">Work Scheduled</option><option value="active">Active</option><option value="submitted_for_close">Awaiting Close Approval</option><option value="closed">Closed</option></select></label><p className="muted" role="status">Showing {visibleProjects.length} of {projects.length} projects</p></div>{!projects.length&&<p className="muted">No accessible projects yet.</p>}
  {projects.length>0&&visibleProjects.length===0&&<p className="muted">No projects match your search or status filter.</p>}<div className="activity-list">{visibleProjects.map(p=>{
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
   {owner&&p.zoho_record_id&&<label>Linked PolyShield jobsite<select value={p.site_id||''} disabled={busy} onChange={e=>linkSite(p,e.target.value)}><option value="">Select jobsite</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
   {owner&&p.zoho_record_id&&<ZohoAttachmentTools organizationId={organizationId} project={p} />}
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