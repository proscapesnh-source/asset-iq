import { useEffect, useState } from 'react'

const blank = { asset_tag: '', name: '', asset_type: 'Tank / Vessel', facility: '', location: '', contents: '', manufacturer: '', model: '', serial_number: '', install_date: '', next_inspection_date: '', notes: '' }

function normalizeInitial(values = {}) {
  return Object.fromEntries(Object.keys(blank).map((key) => [key, values?.[key] ?? blank[key]]))
}

export default function AddAssetForm({ onCancel, onSave, initialValues = null, mode = 'create', currentCoverUrl = '' }) {
  const editing = mode === 'edit'
  const [form, setForm] = useState(() => normalizeInitial(initialValues))
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(currentCoverUrl || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    setForm(normalizeInitial(initialValues))
    setPreview(currentCoverUrl || null)
    setFile(null)
  }, [initialValues, currentCoverUrl])

  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview) }, [preview])

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await onSave(form, file) } catch (e) { setError(e.message || `Could not ${editing ? 'update' : 'create'} asset.`); setBusy(false) }
  }

  const choosePhoto = (event) => {
    const next = event.target.files?.[0] || null
    setFile(next)
    setPreview((current) => {
      if (current?.startsWith('blob:')) URL.revokeObjectURL(current)
      return next ? URL.createObjectURL(next) : (currentCoverUrl || null)
    })
  }

  return <div className="page-stack"><button className="back-button" onClick={onCancel}>← Back</button><div className="page-heading"><div><p className="eyebrow">{editing ? 'Digital asset passport' : 'New digital passport'}</p><h1>{editing ? 'Edit asset' : 'Add asset'}</h1><p>{editing ? 'Update the equipment record without changing inspection history or calculated health.' : 'Create the permanent record and start with a real cover photo.'}</p></div></div><form className="panel form-grid" onSubmit={submit}>
    <label>Asset tag *<input required value={form.asset_tag} onChange={(e) => set('asset_tag', e.target.value)} placeholder="PS-1001" /></label><label>Asset name *<input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="North Process Tank" /></label>
    <label>Asset type<select value={form.asset_type} onChange={(e) => set('asset_type', e.target.value)}><option>Tank / Vessel</option><option>Piping</option><option>Scrubber</option><option>Containment</option><option>Process Equipment</option><option>Other</option></select></label><label>Contents<input value={form.contents} onChange={(e) => set('contents', e.target.value)} placeholder="Water, acid, fuel…" /></label>
    <label>Facility<input value={form.facility} onChange={(e) => set('facility', e.target.value)} /></label><label>Location<input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Building / area / coordinates" /></label>
    <label>Manufacturer<input value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} /></label><label>Model<input value={form.model} onChange={(e) => set('model', e.target.value)} /></label>
    <label>Serial number<input value={form.serial_number} onChange={(e) => set('serial_number', e.target.value)} /></label><label>Install date<input type="date" value={form.install_date || ''} onChange={(e) => set('install_date', e.target.value)} /></label>
    <label>Next inspection<input type="date" value={form.next_inspection_date || ''} onChange={(e) => set('next_inspection_date', e.target.value)} /></label><label>{editing ? 'Replace cover photo' : 'Cover photo'}<input type="file" accept="image/*" onChange={choosePhoto} /></label>
    {preview && <div className="form-photo-preview"><img src={preview} alt="Selected cover" /></div>}
    <label className="full-width">Notes<textarea rows="4" value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></label>
    {editing && <div className="field-help full-width">Inspection history, health score, and lifecycle records are protected and are not changed from this screen.</div>}
    {error && <div className="error-message full-width">{error}</div>}
    <div className="form-actions full-width"><button type="button" className="secondary-button" onClick={onCancel} disabled={busy}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? (editing ? 'Saving…' : 'Creating…') : (editing ? 'Save changes' : 'Create asset')}</button></div>
  </form></div>
}
