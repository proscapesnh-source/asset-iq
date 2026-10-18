import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PROVIDERS = [['zoho','Zoho CRM'],['salesforce','Salesforce'],['hubspot','HubSpot'],['maintainx','MaintainX'],['upkeep','UpKeep'],['custom','Custom software']]
const ENTITIES = [['customers','Customers'],['sites','Sites'],['assets','Assets'],['work_orders','Work orders'],['inspections','Inspections']]
const initialPermissions = () => Object.fromEntries(ENTITIES.map(([key]) => [key,{read:true,write:false}]))
export default function IntegrationHub({ organizationId, role }) {
 const canManage = ['owner','admin'].includes(role)
 const [connections,setConnections] = useState([])
 const [provider,setProvider] = useState('zoho')
 const [displayName,setDisplayName] = useState('')
 const [direction,setDirection] = useState('two_way')
 const [permissions,setPermissions] = useState(initialPermissions)
 const [mapping,setMapping] = useState('{}')
 const [editing,setEditing] = useState(null)
 const [busy,setBusy] = useState(false)
 const [error,setError] = useState('')
 const [message,setMessage] = useState('')
 const [zohoProgress,setZohoProgress] = useState('')
 const load=async()=>{const {data,error:e}=await supabase.from('integration_connections').select('*').eq('organization_id',organizationId).order('created_at',{ascending:false});if(e)throw e;setConnections(data||[])}
 useEffect(()=>{load().catch(e=>setError(e.message))},[organizationId])
 const setPermission=(key,field,value)=>setPermissions(p=>({...p,[key]:{...p[key],[field]:value}}))
 const reset=()=>{setEditing(null);setProvider('zoho');setDisplayName('');setDirection('two_way');setPermissions(initialPermissions());setMapping('{}')}
 const save=async(e)=>{
  e.preventDefault();if(!canManage)return
  setError('');setMessage('');setBusy(true)
  try {
   const parsed=JSON.parse(mapping)
   if(!parsed || Array.isArray(parsed) || typeof parsed!=='object')throw new Error('Field mapping must be a JSON object.')
   const payload={organization_id:organizationId,provider,display_name:displayName.trim(),direction,permissions,field_mapping:parsed,status:'setup_required'}
   const result=editing?await supabase.from('integration_connections').update(payload).eq('id',editing).eq('organization_id',organizationId):await supabase.from('integration_connections').insert(payload)
   if(result.error)throw result.error
   await load();reset();setMessage('Configuration saved. A verified server-side connector is required before synchronization can start.')
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 const edit=(item)=>{setEditing(item.id);setProvider(item.provider);setDisplayName(item.display_name);setDirection(item.direction);setPermissions(item.permissions||initialPermissions());setMapping(JSON.stringify(item.field_mapping||{},null,2));setMessage('');setError('')}
 const connectZoho=async()=>{setBusy(true);setError('');setMessage('');setZohoProgress('Checking your PolyShield session…');try{
  const {data:{session},error:sessionError}=await supabase.auth.getSession()
  if(sessionError||!session?.access_token)throw new Error('Please sign in again.')
  setZohoProgress('Contacting Zoho authorization service…')
  const result=await fetch('https://tntbijxtaatsycluiude.supabase.co/functions/v1/zoho-oauth-start',{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
   body:JSON.stringify({organization_id:organizationId})
  })
  const data=await result.json()
  if(!result.ok||!data.url)throw new Error(data.error||'Unable to start Zoho authorization.')
  setZohoProgress('Opening Zoho authorization…')
  window.location.assign(data.url)
 }catch(e){setError(e.message||'Could not reach the authorization service.');setZohoProgress('Connection could not start.')}finally{setBusy(false)}}
 const pause=async(item)=>{setBusy(true);setError('');try{const {error:e}=await supabase.from('integration_connections').update({status:'paused'}).eq('id',item.id).eq('organization_id',organizationId);if(e)throw e;await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <div className="page-stack">
  <div className="page-heading"><div><p className="eyebrow">Organization settings</p><h1>Integration Hub</h1><p>Configure controlled two-way data exchange with your CRM and maintenance systems.</p></div></div>
  {canManage&&<section className="panel"><h2>Zoho CRM — United States</h2><p className="muted">Authorize Zoho JobSites (Deals) read-only. No job records will be imported or changed during authorization.</p><button type="button" className="primary-button" onClick={connectZoho} disabled={busy}>{busy?'Connecting…':'Connect Zoho CRM'}</button>{zohoProgress&&<p role="status" style={{marginTop:12}}>{zohoProgress}</p>}{error&&<p role="alert" className="error-message" style={{marginTop:12}}>{error}</p>}</section>}
  <section className="panel"><h2>Connections</h2><p className="muted">Setup is disabled until a secure provider connection is verified. Saving settings does not start synchronization.</p>
   {connections.length ? <div className="activity-list">{connections.map(item=><article key={item.id}><div><strong>{item.display_name}</strong><p>{PROVIDERS.find(([id])=>id===item.provider)?.[1]} · {item.direction.replaceAll('_',' ')} · {item.status.replaceAll('_',' ')}</p></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{canManage&&<><button type="button" className="secondary-button" onClick={()=>edit(item)}>Configure</button>{item.status==='connected'&&<button type="button" className="secondary-button" onClick={()=>pause(item)} disabled={busy}>Pause sync</button>}</>}</div></article>)}</div> : <p className="muted">No CRM or maintenance integrations configured.</p>}
  </section>
  {canManage&&<section className="panel"><h2>{editing?'Edit integration':'Add integration'}</h2><form className="form-stack" onSubmit={save}>
  <label>Software provider<select value={provider} onChange={e=>setProvider(e.target.value)} disabled={!!editing}>{PROVIDERS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
  <label>Connection name<input required value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Example: Facilities CRM" /></label>
  <label>Sync direction<select value={direction} onChange={e=>setDirection(e.target.value)}><option value="two_way">Two-way</option><option value="incoming">Import to PolyShield</option><option value="outgoing">Export from PolyShield</option></select></label>
  <h3>Organization permissions</h3><p className="muted">Read means importing into PolyShield. Write means sending updates to the connected system. Server-side adapters must enforce these permissions.</p>
  {ENTITIES.map(([key,label])=><div key={key} style={{display:'flex',alignItems:'center',gap:18,flexWrap:'wrap'}}><strong style={{minWidth:125}}>{label}</strong><label><input type="checkbox" checked={!!permissions[key]?.read} onChange={e=>setPermission(key,'read',e.target.checked)} /> Read</label><label><input type="checkbox" checked={!!permissions[key]?.write} onChange={e=>setPermission(key,'write',e.target.checked)} /> Write</label></div>)}
  <label>Field mapping (JSON)<textarea value={mapping} onChange={e=>setMapping(e.target.value)} rows={4} spellCheck={false} /></label>
  <p className="muted">Never paste API keys, client secrets, passwords, or tokens here. Credentials must be connected through a secure server-side setup flow.</p>
  <div style={{display:'flex',gap:10}}><button className="primary-button" disabled={busy}>{busy?'Saving…':'Save configuration'}</button>{editing&&<button type="button" className="secondary-button" onClick={reset}>Cancel</button>}</div>
  </form></section>}
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 </div>
}
