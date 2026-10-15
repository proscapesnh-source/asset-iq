import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const empty = { site_id: '', title: '', instructions: '', document_url: '', required: true, shared_network: false }
export default function SiteTraining({ sites = [], organizationId, userId, role }) {
  const canManage = ['owner', 'admin', 'manager', 'supervisor'].includes(role)
  const [siteId, setSiteId] = useState('')
  const [modules, setModules] = useState([])
  const [completed, setCompleted] = useState([])
  const [form, setForm] = useState(empty)
  const [showNetwork, setShowNetwork] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
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
      if (active) { setModules(data || []); setCompleted(acknowledgments || []); setError('') }
    }
    load().catch(e => { if (active) setError(e.message || 'Unable to load site training.') })
    return () => { active = false }
  }, [organizationId, revision])

  async function create(event) {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    try {
      if (!form.site_id || !form.title.trim() || !form.instructions.trim()) throw new Error('Site, title and training instructions are required.')
      if (form.document_url && !/^https:\/\//i.test(form.document_url.trim())) throw new Error('Resource link must use HTTPS.')
      const { error: saveError } = await supabase.from('site_training_modules').insert({
        organization_id: organizationId, site_id: form.site_id, title: form.title.trim(),
        instructions: form.instructions.trim(), document_url: form.document_url.trim() || null,
        required: form.required, shared_network:form.shared_network, created_by: userId
      })
      if (saveError) throw saveError
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
    {canManage && <section className="panel"><h2>Publish site training</h2><form className="form-stack" onSubmit={create}>
      <label>Site<select required value={form.site_id} onChange={e => setForm({ ...form, site_id: e.target.value })}><option value="">Select site</option>{sites.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
      <label>Training title<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Site orientation / fall protection / confined space" /></label>
      <label>Safety training content<textarea rows="6" required value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} placeholder="Site hazards, PPE, emergency procedures, isolation requirements, contacts and required training instructions" /></label>
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
        {module.document_url && <p><a href={module.document_url} target="_blank" rel="noopener noreferrer">Open training resource</a></p>}
        <p>{completedByMe(module) ? '✓ You acknowledged this version' : 'Not yet acknowledged'}</p>
        <button className="secondary-button" disabled={busy || completedByMe(module)} onClick={() => acknowledge(module)}>Acknowledge training</button>
        {canManage && module.organization_id === organizationId && <p className="muted">{module.shared_network ? 'Shared with the enrolled technician network' : 'Visible to this organization only'}</p>}
      </div></article>)}</div>}
    </section>
  </div>
}
