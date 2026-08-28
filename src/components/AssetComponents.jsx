import { useEffect, useRef, useState } from 'react'
import StatusBadge from './StatusBadge'
import { analyzeComponentPhoto } from '../lib/ai'
import { saveCapturedPhotoToDevice } from '../lib/devicePhotos'

const blank={component_tag:'',name:'',component_type:'Other',location:'',manufacturer:'',model:'',serial_number:'',condition:'Unknown',notes:'',ai_confidence:null,ai_identified:false,ai_visible_text:[]}
const types=['Valve','Pump','Nozzle','Manway','Hatch','Agitator / Mixer','Level Sensor','Temperature Sensor','Pressure Gauge','Anode','Ladder','Platform','Vent','Drain','Heat Exchanger','Piping','Other']
const conditions=['Unknown','Excellent','Good','Fair','Poor','Critical']

export default function AssetComponents({asset,components=[],ready=true,onCreate,onUpdate,onDelete,onRetire,onRestore}){
  const [form,setForm]=useState(blank),[editing,setEditing]=useState(null),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[analyzing,setAnalyzing]=useState(false),[error,setError]=useState(''),[photoFile,setPhotoFile]=useState(null),[photoPreview,setPhotoPreview]=useState('')
  const cameraRef=useRef(null),libraryRef=useRef(null)
  const activeComponents=components.filter(item=>(item.lifecycle_status||'active')==='active')
  const retiredComponents=components.filter(item=>item.lifecycle_status==='retired')
  useEffect(()=>{if(!open){if(photoPreview?.startsWith('blob:'))URL.revokeObjectURL(photoPreview);setForm(blank);setEditing(null);setPhotoFile(null);setPhotoPreview('');setError('')}},[open])
  const change=(k,v)=>setForm(f=>({...f,[k]:v}))
  const identify=async(file)=>{
    if(!file)return
    if(photoPreview?.startsWith('blob:'))URL.revokeObjectURL(photoPreview)
    setPhotoFile(file);setPhotoPreview(URL.createObjectURL(file));setAnalyzing(true);setError('')
    try{
      const a=await analyzeComponentPhoto(file,asset)
      setForm(f=>({...f,name:a.name||f.name,component_type:a.component_type||f.component_type,component_tag:a.component_tag||f.component_tag,manufacturer:a.manufacturer||f.manufacturer,model:a.model||f.model,serial_number:a.serial_number||f.serial_number,location:a.location||f.location,condition:a.condition||f.condition,notes:a.notes||a.observed||f.notes,ai_confidence:a.confidence,ai_identified:true,ai_visible_text:a.visible_text||[]}))
    }catch(e){setError(e.message||'AI could not identify this photo. You can still enter the component manually.')}
    finally{setAnalyzing(false)}
  }
  const edit=item=>{setEditing(item);setForm({component_tag:item.component_tag||'',name:item.name||'',component_type:item.component_type||'Other',location:item.location||'',manufacturer:item.manufacturer||'',model:item.model||'',serial_number:item.serial_number||'',condition:item.condition||'Good',notes:item.notes||'',ai_confidence:item.ai_confidence,ai_identified:Boolean(item.ai_identified),ai_visible_text:Array.isArray(item.ai_visible_text)?item.ai_visible_text:[]});setPhotoPreview(item.photo_url||'');setOpen(true);setTimeout(()=>document.getElementById('component-editor')?.scrollIntoView({behavior:'smooth',block:'start'}),50)}
  const save=async()=>{if(!form.name.trim()){setError('Take a clearer photo or enter the component name.');return}setBusy(true);setError('');try{editing?await onUpdate(editing.id,form,photoFile,editing.photo_storage_path):await onCreate(form,photoFile);setOpen(false)}catch(e){setError(e.message||'Could not save component.')}finally{setBusy(false)}}
  if(!ready)return <section className="panel"><h2>Components</h2><div className="info-message">Run the v2.0 and v2.1 component SQL migrations in Supabase.</div></section>
  return <section className="panel components-panel">
    <div className="section-header"><div><p className="eyebrow">Vessel hierarchy</p><h2>Components</h2><p className="muted">Photo first. AI identifies the component and fills the record; typing is last.</p></div><button className="primary-button" onClick={()=>setOpen(!open)}>{open?'Cancel':'＋ Add component'}</button></div>
    {error&&<div className="error-message">{error}</div>}
    {open&&<div className="component-editor" id="component-editor">
      <div className="photo-first-header"><div><p className="eyebrow">Step 1 · Photo first</p><h3>{editing?'Re-scan or edit component':'Photograph the component'}</h3><p className="muted">Try to include the full component and its nameplate/tag in the photo.</p></div>{form.ai_identified&&<div className="ai-confidence">AI {form.ai_confidence??0}%</div>}</div>
      <input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={e=>{const file=e.target.files?.[0];if(file)saveCapturedPhotoToDevice(file,'polyshield-component');identify(file);e.target.value=''}}/>
      <input ref={libraryRef} hidden type="file" accept="image/*" onChange={e=>identify(e.target.files?.[0])}/>
      <div className="component-photo-actions"><button className="primary-button" disabled={analyzing} onClick={()=>cameraRef.current?.click()}>📷 Take photo</button><button className="secondary-button" disabled={analyzing} onClick={()=>libraryRef.current?.click()}>▣ Photo library</button></div>
      {photoPreview&&<div className="component-ai-photo"><img src={photoPreview} alt="Component"/></div>}
      {analyzing&&<div className="ai-working"><strong>AI is identifying the component…</strong><span>Reading visible nameplate/tag information and visible condition.</span></div>}
      <div className="review-fields"><p className="eyebrow">Step 2 · Review AI draft</p><h3>{form.ai_identified?'AI filled these fields':'Fields fill after the photo'}</h3>
        {form.ai_visible_text?.length>0&&<div className="visible-text"><strong>Text seen:</strong> {form.ai_visible_text.join(' · ')}</div>}
        <div className="form-grid">
          <label>Component name<input value={form.name} onChange={e=>change('name',e.target.value)} placeholder="AI will suggest"/></label>
          <label>Type<select value={form.component_type} onChange={e=>change('component_type',e.target.value)}>{types.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Component tag<input value={form.component_tag} onChange={e=>change('component_tag',e.target.value)} placeholder="Only if visible"/></label>
          <label>Location<input value={form.location} onChange={e=>change('location',e.target.value)} placeholder="Confirm if needed"/></label>
          <label>Manufacturer<input value={form.manufacturer} onChange={e=>change('manufacturer',e.target.value)} placeholder="Only if readable"/></label>
          <label>Model<input value={form.model} onChange={e=>change('model',e.target.value)} placeholder="Only if readable"/></label>
          <label>Serial number<input value={form.serial_number} onChange={e=>change('serial_number',e.target.value)} placeholder="Only if readable"/></label>
          <label>Visible condition<select value={form.condition} onChange={e=>change('condition',e.target.value)}>{conditions.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="full-width">AI / technician notes<textarea rows="3" value={form.notes} onChange={e=>change('notes',e.target.value)} placeholder="AI drafts visible findings"/></label>
        </div>
      </div>
      <div className="form-actions"><button className="secondary-button" onClick={()=>setOpen(false)}>Cancel</button><button className="primary-button" disabled={busy||analyzing||!form.name.trim()} onClick={save}>{busy?'Saving…':'✓ Confirm & save component'}</button></div>
    </div>}
    {!activeComponents.length?<div className="empty-state"><strong>No components recorded yet.</strong><p>Tap Add component, take a photo, and let AI build the record.</p></div>:<div className="component-grid">{activeComponents.map(item=><article className="component-card" key={item.id}>
      {item.photo_url&&<img className="component-card-photo" src={item.photo_url} alt={item.name}/>}
      <div className="component-card-main"><div><small>{item.component_type}{item.component_tag?` · ${item.component_tag}`:''}</small><h3>{item.name}</h3><p>{item.location||'Location not recorded'}</p></div><div className="component-mini-health"><strong>{item.health_score}</strong><small>HEALTH</small></div></div>
      <div className="component-meta"><span><small>Condition</small><StatusBadge status={item.status}/></span><span><small>Manufacturer</small><strong>{item.manufacturer||'Not recorded'}</strong></span><span><small>Model / Serial</small><strong>{[item.model,item.serial_number].filter(Boolean).join(' · ')||'Not recorded'}</strong></span></div>
      {item.ai_identified&&<div className="ai-component-badge">AI identified · {item.ai_confidence??0}% confidence</div>}
      {item.notes&&<p className="record-note">{item.notes}</p>}
      <div className="component-actions"><button className="secondary-button" onClick={()=>edit(item)}>Edit / re-scan</button><button className="secondary-button" onClick={async()=>{const reason=prompt(`Why is ${item.name} being removed or replaced?`,'Replaced during maintenance');if(reason!==null)await onRetire(item.id,reason)}}>Replace / retire</button><button className="text-button danger-link" onClick={async()=>{if(confirm(`Permanently delete ${item.name}? Use this only for a mistake or duplicate. Change-out history will be lost.`))await onDelete(item.id)}}>Delete</button></div>
    </article>)}</div>}

    {retiredComponents.length>0&&<div className="retired-components">
      <div className="section-header"><div><p className="eyebrow">Change-out history</p><h3>Retired / replaced components</h3><p className="muted">These no longer count as active vessel components, but their service history is preserved.</p></div></div>
      <div className="component-grid">{retiredComponents.map(item=><article className="component-card retired-component" key={item.id}>
        {item.photo_url&&<img className="component-card-photo" src={item.photo_url} alt={item.name}/>}
        <div className="component-card-main"><div><small>{item.component_type}{item.component_tag?` · ${item.component_tag}`:''}</small><h3>{item.name}</h3><p>Removed {item.removed_at?new Date(item.removed_at).toLocaleDateString():'date not recorded'}</p></div><div className="retired-badge">RETIRED</div></div>
        {item.removal_reason&&<p className="record-note"><strong>Reason:</strong> {item.removal_reason}</p>}
        <div className="component-actions"><button className="secondary-button" onClick={()=>onRestore(item.id)}>Restore</button><button className="text-button danger-link" onClick={async()=>{if(confirm(`Permanently delete retired component ${item.name}? This removes its change-out history.`))await onDelete(item.id)}}>Delete permanently</button></div>
      </article>)}</div>
    </div>}
  </section>
}
