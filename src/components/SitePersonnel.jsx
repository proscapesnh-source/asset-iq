import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SitePersonnel({ organizationId, sites = [], modules = [], role, userId }) {
 const canManage = ['owner','admin','manager','supervisor'].includes(role)
 const [people,setPeople] = useState([])
 const [checks,setChecks] = useState([])
 const [form,setForm] = useState({site_id:'',person_name:'',person_email:'',company:'',person_type:'employee',start_date:''})
 const [error,setError] = useState('')
 const [message,setMessage] = useState('')
 const [busy,setBusy] = useState(false)
 const [reload,setReload] = useState(0)
 useEffect(() => {
  if (!canManage || !organizationId) return
  let live = true
  Promise.all([
   supabase.from('site_personnel_assignments').select('*').eq('organization_id',organizationId).order('created_at',{ascending:false}),
   supabase.from('site_personnel_training_checks').select('assignment_id,module_id,module_version,verified_at')
  ]).then(([p,c]) => {
   if (!live) return
   if(p.error || c.error) {setError((p.error||c.error).message); return}
   setPeople(p.data || []);setChecks(c.data || [])
  }).catch(e=>{if(live)setError(e.message)})
  return ()=>{live=false}
 },[organizationId,canManage,reload])
 if(!canManage) return null
 async function add(e) {
  e.preventDefault();setBusy(true);setError('');setMessage('')
  try {
   const {error:err}=await supabase.from('site_personnel_assignments').insert({
    organization_id:organizationId,site_id:form.site_id,person_name:form.person_name.trim(),
    person_email:form.person_email.trim()||null,company:form.company.trim(),
    person_type:form.person_type,start_date:form.start_date||null,assigned_by:userId
   })
   if(err)throw err
   setMessage('Employee or vendor added to the site roster.')
   setForm({site_id:'',person_name:'',person_email:'',company:'',person_type:'employee',start_date:''})
   setReload(v=>v+1)
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 async function verify(person,mod) {
  if(!window.confirm('Confirm that you checked this person’s completion evidence for this module and version. This is not a safety certification or site-entry permit.'))return
  setBusy(true);setError('');setMessage('')
  try {
   const {error:err}=await supabase.from('site_personnel_training_checks').insert({
    assignment_id:person.id,module_id:mod.id,module_version:mod.version,verified_by:userId
   })
   if(err)throw err
   setReload(v=>v+1);setMessage('Training verification saved.')
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 async function setStatus(person,status) {
  setBusy(true);setError('')
  try {
   const {error:err}=await supabase.from('site_personnel_assignments').update({status}).eq('id',person.id).eq('organization_id',organizationId)
   if(err)throw err
   setReload(v=>v+1)
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 const name=id=>sites.find(s=>s.id===id)?.name||'Site'
 return <section className="panel">
  <div className="section-header"><div><p className="eyebrow">Site onboarding</p><h2>Employees and vendor arrivals</h2></div></div>
  <p className="muted">Assign new employees and contractors to a site, check their required training and record evidence reviewed by supervisors. Readiness does not grant entry permission.</p>
  {error && <p role="alert" className="error-message">{error}</p>}{message && <p role="status">{message}</p>}
  <form className="form-stack" onSubmit={add}>
   <label>Destination site<select required value={form.site_id} onChange={e=>setForm({...form,site_id:e.target.value})}><option value="">Select site</option>{sites.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
   <label>Employee or vendor<select value={form.person_type} onChange={e=>setForm({...form,person_type:e.target.value})}><option value="employee">Employee</option><option value="vendor">Vendor / contractor</option></select></label>
   <label>Full name<input required value={form.person_name} onChange={e=>setForm({...form,person_name:e.target.value})}/></label>
   <label>Company<input required value={form.company} onChange={e=>setForm({...form,company:e.target.value})}/></label>
   <label>Email (optional)<input type="email" value={form.person_email} onChange={e=>setForm({...form,person_email:e.target.value})}/></label>
   <label>Arrival date<input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></label>
   <button disabled={busy||!sites.length} className="primary-button">{busy?'Saving…':'Add to site roster'}</button>
  </form>
  <h3>Site readiness roster</h3>
  {!people.length && <p className="muted">No employees or vendors assigned yet.</p>}
  <div className="activity-list">{people.map(person=>{
   const required=modules.filter(m=>m.site_id===person.site_id&&m.required&&m.active!==false)
   const outstanding=required.filter(m=>!checks.some(c=>c.assignment_id===person.id&&c.module_id===m.id&&c.module_version===m.version))
   return <article key={person.id}><div><strong>{person.person_name} · {person.person_type}</strong><p>{person.company} · {name(person.site_id)} · {person.status}</p><p>{required.length-outstanding.length} of {required.length} required modules verified; {outstanding.length?'Training incomplete':'Training checks complete'}</p>
    {outstanding.map(m=><div key={m.id}><span>{m.title} (v{m.version}) </span><button type="button" className="secondary-button" disabled={busy} onClick={()=>verify(person,m)}>Verify evidence</button></div>)}
    <label>Assignment status<select disabled={busy} value={person.status} onChange={e=>setStatus(person,e.target.value)}><option value="scheduled">Scheduled</option><option value="active">Active</option><option value="departed">Departed</option></select></label></div></article>
  })}</div>
 </section>
}
