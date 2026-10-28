import { useEffect, useRef, useState } from 'react'
import { addAssetPhoto } from '../lib/data'
import { supabase } from '../lib/supabase'

// Field updates are appended to an asset on the project's linked site.
// This does not grant project management or Zoho upload permissions.
export default function FieldProjectUpdates({ organizationId, project }) {
  const fileInput = useRef(null)
  const [assets, setAssets] = useState([])
  const [assetId, setAssetId] = useState('')
  const [file, setFile] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    if (!project.site_id) { setAssets([]); return () => { mounted = false } }
    supabase.from('assets').select('id,name').eq('organization_id', organizationId)
      .eq('site_id', project.site_id).then(({ data, error: err }) => {
        if (!mounted) return
        if (err) setError(err.message)
        else { setAssets(data || []); setAssetId(data?.[0]?.id || '') }
      })
    return () => { mounted = false }
  }, [organizationId, project.site_id])

  async function submit(event) {
    event.preventDefault()
    if (!assetId || !note.trim() || busy) return
    setBusy(true); setError(''); setFeedback('')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Sign in to record your field update.')
      // Require assignment to this specific project, not just an organization membership.
      const { data: assignments, error: assignmentError } = await supabase
        .from('field_project_assignments').select('id')
        .eq('project_id', project.id).eq('member_id', user.id).limit(1)
      if (assignmentError) throw assignmentError
      if (!assignments?.length) throw new Error('You must be assigned to this project.')
      const { data: current, error: projectError } = await supabase
        .from('field_projects').select('status,site_id').eq('id',project.id).single()
      if (projectError) throw projectError
      if (current.status !== 'active' || current.site_id !== project.site_id) throw new Error('Project is not active or its site changed.')
      const selected = assets.find(a => a.id === assetId)
      if (!selected) throw new Error('Select an asset belonging to this jobsite.')
      if (file) await addAssetPhoto(organizationId, assetId, file, '[Field update] ' + note.trim(), false)
      else {
        const { error: noteError } = await supabase.from('asset_service_events').insert({organization_id:organizationId,asset_id:assetId,event_type:'Field progress note',notes:'[Project '+(project.job_number || project.title)+'] '+note.trim()})
        if (noteError) throw noteError
      }
      setFile(null); setNote(''); if (fileInput.current) fileInput.current.value = ''
      setFeedback(file ? 'Photo and progress note saved to the asset in PolyShield. Zoho sync is not yet confirmed.' : 'Progress note saved to the asset in PolyShield. Zoho sync is not yet confirmed.')
    } catch (err) { setError(err.message || 'Could not save update.') }
    finally { setBusy(false) }
  }

  if (project.status !== 'active') return null
  return <section className="panel">
    <h3>Jobsite field update</h3>
    <p className="muted">Add a progress note with an optional photo to this jobsite. Updates remain in PolyShield until Zoho synchronization is confirmed.</p>
    {!project.site_id ? <p>Supervisor must link this project to a jobsite.</p> :
      !assets.length ? <p>No assets are registered at this site. Ask a supervisor to add one first.</p> :
      <form className="form-stack" onSubmit={submit}>
        <label>Jobsite asset<select required value={assetId} onChange={e => setAssetId(e.target.value)}>
          {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select></label>
        <label>Photo (optional)<input ref={fileInput} type="file" accept="image/*" capture="environment" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
        <label>Progress / work performed<textarea required maxLength={1500} value={note} onChange={e => setNote(e.target.value)} placeholder="Describe the condition or work completed" /></label>
        <button className="primary-button" disabled={busy || !note.trim()}>{busy ? 'Saving…' : 'Save jobsite update'}</button>
      </form>}
    {error && <p role="alert" className="error-message">{error}</p>}
    {feedback && <p role="status">{feedback}</p>}
  </section>
}
