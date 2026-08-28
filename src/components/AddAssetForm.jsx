import { useEffect, useRef, useState } from 'react'
import { analyzeAssetNameplate } from '../lib/ai'
import { saveCapturedPhotoToDevice } from '../lib/devicePhotos'

const blank = { asset_tag: '', name: '', asset_type: 'Tank / Vessel', site_id: '', facility: '', location: '', contents: '', manufacturer: '', model: '', serial_number: '', install_date: '', next_inspection_date: '', notes: '' }

function normalizeInitial(values = {}) {
  return Object.fromEntries(Object.keys(blank).map((key) => [key, values?.[key] ?? blank[key]]))
}

export default function AddAssetForm({ onCancel, onSave, initialValues = null, mode = 'create', currentCoverUrl = '', sites = [] }) {
  const editing = mode === 'edit'
  const [form, setForm] = useState(() => normalizeInitial(initialValues))
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(currentCoverUrl || null)
  const [busy, setBusy] = useState(false)
  const [readingNameplate, setReadingNameplate] = useState(false)
  const [nameplateResult, setNameplateResult] = useState(null)
  const [error, setError] = useState('')
  const nameplateInputRef = useRef(null)
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

  const readNameplate = async (event) => {
    const nameplateFile = event.target.files?.[0]
    event.target.value = ''
    if (!nameplateFile) return
    saveCapturedPhotoToDevice(nameplateFile, 'polyshield-nameplate')
    setReadingNameplate(true); setError('')
    try {
      const result = await analyzeAssetNameplate(nameplateFile)
      setNameplateResult(result)
      setForm((current) => {
        const specifications = [result.capacity&&`Capacity: ${result.capacity}`,result.design_pressure&&`Design pressure: ${result.design_pressure}`,result.design_temperature&&`Design temperature: ${result.design_temperature}`,result.material&&`Material: ${result.material}`,result.notes].filter(Boolean).join(' · ')
        return {...current,asset_tag:current.asset_tag||result.asset_tag||'',name:current.name||result.name||'',asset_type:result.asset_type||current.asset_type,manufacturer:current.manufacturer||result.manufacturer||'',model:current.model||result.model||'',serial_number:current.serial_number||result.serial_number||'',install_date:current.install_date||result.install_date||'',notes:[current.notes,specifications].filter(Boolean).join('\n')}
      })
    } catch (e) { setError(e.message || 'Could not read this nameplate. Retake it square-on with better light.') }
    finally { setReadingNameplate(false) }
  }

  return <div className="page-stack"><button className="back-button" onClick={onCancel}>← Back</button><div className="page-heading"><div><p className="eyebrow">{editing ? 'Digital asset passport' : 'New digital passport'}</p><h1>{editing ? 'Edit asset' : 'Add asset'}</h1><p>{editing ? 'Update the equipment record without changing inspection history or calculated health.' : 'Create the permanent record and start with a real cover photo.'}</p></div></div><form className="panel form-grid" onSubmit={submit}>
    <div className="nameplate-reader full-width"><div><strong>📷 Read vessel nameplate</strong><p className="muted">Photograph the data tag and AI will draft the visible manufacturer, model, serial number, asset tag, date, and ratings for your review.</p></div><button type="button" className="primary-button" disabled={readingNameplate||busy} onClick={()=>nameplateInputRef.current?.click()}>{readingNameplate?'Reading nameplate…':'Scan nameplate'}</button><input ref={nameplateInputRef} className="visually-hidden-file" type="file" accept="image/*" capture="environment" onChange={readNameplate}/></div>
    {nameplateResult&&<div className="info-message full-width"><strong>Nameplate draft applied · {nameplateResult.confidence}% confidence</strong><span>Review every field before creating the asset.{nameplateResult.visible_text?.length?` Text read: ${nameplateResult.visible_text.join(' · ')}`:''}</span></div>}
    <label>Asset tag *<input required value={form.asset_tag} onChange={(e) => set('asset_tag', e.target.value)} placeholder="PS-1001" /></label><label>Asset name *<input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="North Process Tank" /></label>
    <label>Asset type<select value={form.asset_type} onChange={(e) => set('asset_type', e.target.value)}><option>Tank / Vessel</option><option>Piping</option><option>Scrubber</option><option>Containment</option><option>Process Equipment</option><option>Other</option></select></label><label>Contents<input value={form.contents} onChange={(e) => set('contents', e.target.value)} placeholder="Water, acid, fuel…" /></label>
    <label>Site / Facility<select value={form.site_id || ''} onChange={(e) => { const site = sites.find(s => s.id === e.target.value); setForm(current => ({ ...current, site_id:e.target.value, facility:site?.name || current.facility })) }}><option value="">Legacy / unassigned</option>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label><label>Location<input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Building / area / coordinates" /></label>
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
