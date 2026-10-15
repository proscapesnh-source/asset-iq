import SitePersonnel from './SitePersonnel'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const empty = { site_id: '', title: '', instructions: '', document_url: '', required: true, shared_network: false }
export default function SiteTraining({ sites = [], organizationId, userId, role }) {
  const canManage = ['owner', 'admin', 'manager', 'supervisor'].includes(role)
  const [siteId, setSiteId] = useState('')
  const [modules, setModules] = useState([])
  const [completed, setCompleted] = useState([])
  const [form, setForm] = useState(empty)
  const [trainingPhoto, setTrainingPhoto] = useState(null)
  const [photoLinks, setPhotoLinks] = useState({})
  const [showNetwork, setShowNetwork] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [importNotes, setImportNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!organizationId) return
    let active = true
    async function load() {
      const { data, error: loadError } = await supabase.rpc('network_site_training')
      if (loadError) throw loadError
      const { data: acknowledgments, error: ackError } = await supabase.from('site_training_acknowledgments')
        .select('module_id,user_id,module_version,acknowledged_at').eq('organization_id', organizationId)
      if (ackError) throw ackError
      if (active) {
        setModules(data || []); setCompleted(acknowledgments || []); setError('')
        const links = await Promise.all((data || []).filter(m => m.photo_path).map(async m => {
          const { data: signed, error: signError } = await supabase.storage.from('site-training').createSignedUrl(m.photo_path, 3600)
          return [m.id, signError ? null : signed?.signedUrl]
        }))
        if (active) setPhotoLinks(Object.fromEntries(links))
      }
    }
    load().catch(e => { if (active) setError(e.message || 'Unable to load site training.') })
    return () => { active = false }
  }, [organizationId, revision])

  async function importPhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoBusy(true); setError(''); setImportNotes('')
    try {
      if (!file.type.startsWith('image/')) throw new Error('Select a photo of the training document.')
      const imageDataUrl = await new Promise((resolve,reject) => {
        const reader = new FileReader()
        reader.onerror=()=>reject(new Error('Unable to read photo.'))
        reader.onload=()=>{
          const image = new Image()
          image.onerror=()=>reject(new Error('Invalid image.'))
          image.onload=()=>{
            const scale=Math.min(1,1600/Math.max(image.width,image.height))
            const canvas=document.createElement('canvas')
            canvas.width=Math.round(image.width*scale)
            canvas.height=Math.round(image.height*scale)
            canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height)
            resolve(canvas.toDataURL('image/jpeg',0.8))
          }
          image.src=reader.result
        }
        reader.readAsDataURL(file)
      })
      const response=await fetch('/api/analyze-photo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'training-document',imageDataUrl})})
      const body=await response.json().catch(()=>({}))
      if(!response.ok) throw new Error(body.error||'Training photo extraction failed.')
      const draft=body.analysis||{}
      setForm(previous=>({...previous,title:draft.title||previous.title,instructions:draft.instructions||previous.instructions}))
      setImportNotes(draft.notes||'Photo transcription ready. Check every field before publishing.')
      setMessage('Photo converted to an editable training draft. Review before publishing.')
    } catch(e) {setError(e.message)} finally {setPhotoBusy(false);event.target.value=''}
  }

  async function create(event) {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    try {
      if (!form.site_id || !form.title.trim() || !form.instructions.trim()) throw new Error('Site, title and training instructions are required.')
      if (form.document_url && !/^https:\/\//i.test(form.document_url.trim())) throw new Error('Resource link must use HTTPS.')
      if (trainingPhoto && (!['image/jpeg','image/png','image/webp'].includes(trainingPhoto.type) || trainingPhoto.size > 10 * 1024 * 1024)) throw new Error('Choose a JPEG, PNG or WebP image smaller than 10 MB.')
      const { data: saved, error: saveError } = await supabase.from('site_training_modules').insert({
        organization_id: organizationId, site_id: form.site_id, title: form.title.trim(),
        instructions: form.instructions.trim(), document_url: form.document_url.trim() || null,
        required: form.required, shared_network:form.shared_network, created_by: userId
      }).select('id').single()
      if (saveError) throw saveError
      if (trainingPhoto) {
        const extension = trainingPhoto.type === 'image/png' ? 'png' : trainingPhoto.type === 'image/webp' ? 'webp' : 'jpg'
        const storagePath = organizationId + '/' + saved.id + '/training-' + crypto.randomUUID() + '.' + extension
        const { error: uploadError } = await supabase.storage.from('site-training').upload(storagePath, trainingPhoto, { contentType: trainingPhoto.type, upsert: false })
        if (uploadError) throw new Error('Training created but image upload failed: ' + uploadError.message)
        const { error: linkError } = await supabase.from('site_training_modules').update({ photo_path: storagePath }).eq('id', saved.id).eq('organization_id', organizationId)
        if (linkError) throw new Error('Training created but image could not be linked: ' + linkError.message)
      }
      setTrainingPhoto(null)
      setForm(empty); setMessage('Site training published.'); setRevision(n => n + 1)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function acknowledge(module) {
    if (!window.confirm('Confirm you reviewed this training and understood the site requirements? This is an acknowledgment, not a competency certificate or entry permit.')) return
    setBusy(true); setError(''); setMessage('')
    try {
      const { error: saveError } = await supabase.rpc('acknowledge_site_training', { p_module_id: module.id })
      if (saveError) throw saveError
      setMessage('Acknowledgment recorded.'); setRevision(n => n + 1)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function toggleNetwork(module) {
    if (!canManage || module.organization_id !== organizationId) return
    setBusy(true); setError(''); setMessage('')
    try {
      const { error: updateError } = await supabase.from('site_training_modules')
        .update({ shared_network: !module.shared_network })
        .eq('id', module.id).eq('organization_id', organizationId)
      if (updateError) throw updateError
      setMessage(module.shared_network ? 'Training is now private to your organization.' : 'Training is now available across the enrolled technician network.')
      setRevision(n => n + 1)
    } catch(e) { setError(e.message) } finally { setBusy(false) }
  }

  const visible = modules.filter(m => (!siteId || m.site_id === siteId) && (showNetwork || m.organization_id === organizationId))
  const siteName = m => m.site_name || sites.find(s => s.id === m.site_id)?.name || 'Enrolled site'
  const completedByMe = m => completed.some(a => a.module_id === m.id && a.module_version === m.version)
  const remaining = visible.filter(m => m.required && !completedByMe(m)).length

  return <div className="page-stack">
    <div className="page-heading"><div><p className="eyebrow">Site-specific readiness</p><h1>Site Safety Training</h1><p>Review required site training, acknowledge completion and share approved modules between your organization's locations.</p></div></div>
    <section className="panel"><label><input type="checkbox" checked={showNetwork} onChange={e=>setShowNetwork(e.target.checked)} /> Include training shared by other enrolled sites</label><label>Filter by site
      <select value={siteId} onChange={e => setSiteId(e.target.value)}><option value="">All sites</option>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select>
    </label><p className="muted">{remaining} required module{remaining === 1 ? '' : 's'} awaiting your acknowledgment in this view. Completion does not replace site authorization, permits, or practical competency checks.</p></section>
    {error && <section className="error-banner" role="alert">{error}</section>}
    {message && <p role="status">{message}</p>}
    {canManage && <section className="panel"><h2>Publish site training</h2><div className="form-stack"><label>Import existing training from a photo<input type="file" accept="image/*" capture="environment" disabled={photoBusy || busy} onChange={importPhoto}/></label><p className="muted">Take a picture of a site induction, training sheet or safety notice. AI transcribes it as an editable draft; a supervisor must check it before publishing. The picture is processed for extraction and is not saved to the training record.</p>{photoBusy && <p>Reading training photo…</p>}{importNotes && <p role="status">{importNotes}</p>}</div><form className="form-stack" onSubmit={create}>
      <label>Site<select required value={form.site_id} onChange={e => setForm({ ...form, site_id: e.target.value })}><option value="">Select site</option>{sites.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
      <label>Training title<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Site orientation / fall protection / confined space" /></label>
      <label>Safety training content<textarea rows="6" required value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} placeholder="Site hazards, PPE, emergency procedures, isolation requirements, contacts and required training instructions" /></label>
      <label>Photo of existing training sheet or safety notice (optional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setTrainingPhoto(e.target.files?.[0] || null)} /></label>
      <label>Approved document or video link (optional)<input type="url" value={form.document_url} onChange={e => setForm({ ...form, document_url: e.target.value })} placeholder="https://..." /></label>
      <label><input type="checkbox" checked={form.required} onChange={e => setForm({ ...form, required: e.target.checked })} /> Required training</label>
      <label><input type="checkbox" checked={form.shared_network} onChange={e => setForm({ ...form, shared_network: e.target.checked })} /> Publish to all enrolled PolyShield technicians, regardless of their site or organization</label>
      <button className="primary-button" disabled={busy || !sites.length}>{busy ? 'Saving…' : 'Publish training'}</button>
    </form></section>}
    <section className="panel"><h2>Training library</h2>
      {!visible.length ? <p className="muted">No published training for the selected site.</p> :
      <div className="activity-list">{visible.map(module => <article key={module.id}><div>
        <strong>{module.title}</strong><p className="muted">{siteName(module)} · Version {module.version} · {module.required ? 'Required' : 'Optional'}</p>
        <p style={{whiteSpace:'pre-wrap'}}>{module.instructions}</p>
        {module.photo_path && (photoLinks[module.id] ? <p><a href={photoLinks[module.id]} target="_blank" rel="noopener noreferrer"><img src={photoLinks[module.id]} alt={'Site training document: ' + module.title} style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain' }} /></a></p> : <p className="muted">Training photo unavailable. Refresh the page or contact the site supervisor.</p>)}
        {module.document_url && <p><a href={module.document_url} target="_blank" rel="noopener noreferrer">Open training resource</a></p>}
        <p>{completedByMe(module) ? '✓ You acknowledged this version' : 'Not yet acknowledged'}</p>
        <button className="secondary-button" disabled={busy || completedByMe(module)} onClick={() => acknowledge(module)}>Acknowledge training</button>
        {canManage && module.organization_id === organizationId && <button className="secondary-button" disabled={busy} onClick={() => toggleNetwork(module)}>{module.shared_network ? 'Stop sharing across sites' : 'Share with all enrolled technicians'}</button>}
      </div></article>)}</div>}
    </section>
    <SitePersonnel organizationId={organizationId} sites={sites} modules={modules} role={role} userId={userId} />
  </div>
}
