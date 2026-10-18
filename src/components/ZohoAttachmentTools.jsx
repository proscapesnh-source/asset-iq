import {useEffect,useState} from 'react'
import {supabase} from '../lib/supabase'
export default function ZohoAttachmentTools({organizationId,project}){
 const [photos,setPhotos]=useState([]),[queue,setQueue]=useState([]),[photo,setPhoto]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 const refresh=async()=>{
  const {data:q,error:qe}=await supabase.from('zoho_attachment_queue').select('id,source_id,file_name,status,last_error,zoho_attachment_id').eq('project_id',project.id).eq('organization_id',organizationId).order('created_at',{ascending:false})
  if(qe)throw qe
  setQueue(q||[])
  if(!project.site_id){setPhotos([]);return}
  const {data:assets,error:ae}=await supabase.from('assets').select('id').eq('organization_id',organizationId).eq('site_id',project.site_id)
  if(ae)throw ae
  const ids=(assets||[]).map(a=>a.id)
  if(!ids.length){setPhotos([]);return}
  const {data:p,error:pe}=await supabase.from('inspection_photos').select('id,file_name,asset_id').eq('organization_id',organizationId).in('asset_id',ids).limit(100)
  if(pe)throw pe
  setPhotos(p||[])
 }
 useEffect(()=>{refresh().catch(e=>setError(e.message))},[project.id,project.site_id])
 const act=async(fn)=>{setBusy(true);setError('');setMessage('');try{await fn();await refresh()}catch(e){setError(e.message||'Operation failed')}finally{setBusy(false)}}
 const queuePhoto=()=>act(async()=>{
  const {error:e}=await supabase.rpc('queue_zoho_project_photo',{p_project:project.id,p_photo:photo,p_source:'inspection_photo'})
  if(e)throw e
  setMessage('Photo queued. No upload has occurred.')
 })
 const sendTest=(item)=>act(async()=>{
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token)throw Error('Sign in again.')
  const res=await fetch('https://tntbijxtaatsycluiude.supabase.co/functions/v1/zoho-attachment-test',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({organization_id:organizationId,queue_id:item.id})})
  const result=await res.json()
  if(!res.ok)throw Error(result.error||'Upload failed')
  setMessage('Zoho confirmed the test attachment was uploaded.')
 })
 return <section className="panel">
  <h3>Zoho attachments — controlled test</h3>
  <p className="muted">Only photos from assets linked to this project's jobsite are eligible. Test uploads change the Zoho JobSite, so use only a sample record.</p>
  {!project.site_id?<p>Link the project to a PolyShield jobsite before selecting attachments.</p>:<>
   <label>Inspection photo <select value={photo} onChange={e=>setPhoto(e.target.value)}><option value="">Select a test photo</option>{photos.map(p=><option key={p.id} value={p.id}>{p.file_name||p.id}</option>)}</select></label>
   <button type="button" className="secondary-button" onClick={queuePhoto} disabled={busy||!photo}>Queue photo without uploading</button>
  </>}
  {queue.map(item=><div key={item.id} style={{padding:'10px 0',borderBottom:'1px solid #ddd'}}><strong>{item.file_name}</strong> · {item.status}
   {item.last_error&&<p role="alert">{item.last_error}</p>}
   {['pending','failed'].includes(item.status)&&<button type="button" className="secondary-button" disabled={busy} onClick={()=>sendTest(item)}>Upload this test photo to Zoho</button>}
  </div>)}
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 </section>
}