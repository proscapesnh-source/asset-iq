import { useState } from 'react'
import { compressImage, makeId } from '../utils'

export default function RepairRecord({ asset, onBack, onSave }) {
  const [form, setForm] = useState({
    title: '', contractor: '', technician: '', status: 'Completed',
    repairType: 'Localized repair', area: '', condition: '', workPerformed: '',
    materials: '', testing: '', verification: '', warranty: '', notes: '',
  })
  const [photos, setPhotos] = useState([])
  const [saving, setSaving] = useState(false)
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const addPhotos = async (event) => {
    const files = Array.from(event.target.files || [])
    const next = []
    for (const file of files) {
      try {
        next.push({ id: makeId('PH'), url: await compressImage(file), name: file.name, context: 'During Repair' })
      } catch {
        // Skip unreadable files instead of crashing the form.
      }
    }
    setPhotos((items) => [...items, ...next])
  }

  const submit = async () => {
    setSaving(true)
    onSave({ ...form, id: makeId('REP'), assetId: asset.id, date: new Date().toISOString().slice(0, 10), photos })
  }

  return <div className="page-stack">
    <button className="back-link" type="button" onClick={onBack}>← Back to passport</button>
    <section className="panel">
      <p className="eyebrow">Repair accountability</p>
      <h2>{asset.name}</h2>
      <p className="muted">Document who performed the work, what was done, the evidence, and who verified completion.</p>
    </section>
    <section className="panel onboarding-form">
      <Field label="Repair title" value={form.title} onChange={(v) => update('title', v)} />
      <Field label="Contractor" value={form.contractor} onChange={(v) => update('contractor', v)} />
      <Field label="Technician or crew lead" value={form.technician} onChange={(v) => update('technician', v)} />
      <Select label="Status" value={form.status} options={['Requested','Assigned','In Progress','Awaiting Verification','Completed']} onChange={(v) => update('status', v)} />
      <Select label="Repair type" value={form.repairType} options={['Localized repair','Coating or lining repair','Structural repair','Component replacement','Full rehabilitation','Other']} onChange={(v) => update('repairType', v)} />
      <Field label="Area repaired" value={form.area} onChange={(v) => update('area', v)} />
      <LongField label="Pre-repair condition" value={form.condition} onChange={(v) => update('condition', v)} />
      <LongField label="Work performed" value={form.workPerformed} onChange={(v) => update('workPerformed', v)} />
      <LongField label="Materials, products, and batch numbers" value={form.materials} onChange={(v) => update('materials', v)} />
      <LongField label="Testing and quality control" value={form.testing} onChange={(v) => update('testing', v)} />
      <Field label="Verified by" value={form.verification} onChange={(v) => update('verification', v)} />
      <Field label="Warranty or follow-up date" value={form.warranty} onChange={(v) => update('warranty', v)} />
      <LongField label="Additional notes" value={form.notes} onChange={(v) => update('notes', v)} />
    </section>
    <section className="panel">
      <div className="section-header"><div><p className="eyebrow">Evidence</p><h2>Repair photos</h2></div><label className="upload-button">Add photos<input type="file" accept="image/*" multiple onChange={addPhotos} /></label></div>
      {!photos.length ? <p className="empty-state">Add before, during, and after photos.</p> : <div className="photo-list">{photos.map((photo) => <article className="photo-card" key={photo.id}><img src={photo.url} alt={photo.name}/><label>Context<select value={photo.context} onChange={(e) => setPhotos((items) => items.map((item) => item.id === photo.id ? {...item, context: e.target.value} : item))}><option>Before Repair</option><option>During Repair</option><option>After Repair</option><option>Testing</option><option>Final Acceptance</option></select></label></article>)}</div>}
    </section>
    <button className="sticky-primary" disabled={saving || !form.title.trim()} type="button" onClick={submit}>{saving ? 'Saving…' : 'Save repair record'}</button>
  </div>
}

function Field({ label, value, onChange }) { return <label>{label}<input value={value} onChange={(e) => onChange(e.target.value)} /></label> }
function LongField({ label, value, onChange }) { return <label>{label}<textarea rows="4" value={value} onChange={(e) => onChange(e.target.value)} /></label> }
function Select({ label, value, options, onChange }) { return <label>{label}<select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label> }
