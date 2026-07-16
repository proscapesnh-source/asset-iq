import { useState } from 'react'
import { compressImage, makeId } from '../utils'

const vocabulary = [
  'Liner present',
  'Liner absent',
  'Possible liner damage',
  'Exposed substrate',
  'Coating degradation',
  'Corrosion observed',
  'Material loss observed',
  'Pitting observed',
  'Surface contamination',
  'Unable to determine from image',
]

function ChoiceGroup({ label, value, options, onChange }) {
  return (
    <div className="question-block">
      <strong>{label}</strong>
      <div className="choice-grid">
        {options.map((option) => (
          <button key={option} type="button" className={value === option ? 'choice active' : 'choice'} onClick={() => onChange(option)}>{option}</button>
        ))}
      </div>
    </div>
  )
}

export default function QuickInspection({ asset, onBack, onComplete }) {
  const [linerPresent, setLinerPresent] = useState('Unknown')
  const [condition, setCondition] = useState('Good')
  const [action, setAction] = useState('None')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState([])

  const updatePhoto = (id, updates) => setPhotos((items) => items.map((item) => item.id === id ? { ...item, ...updates } : item))

  const addPhotos = async (event) => {
    const files = Array.from(event.target.files || [])
    const next = []
    for (const file of files) {
      try {
        next.push({
          id: makeId('PH'),
          url: await compressImage(file),
          title: file.name.replace(/\.[^/.]+$/, ''),
          category: 'Interior',
          notes: '',
          ai: null,
        })
      } catch {
        // Ignore unreadable images rather than crashing the inspection.
      }
    }
    setPhotos((items) => [...items, ...next])
  }

  const analyze = (photo) => {
    updatePhoto(photo.id, {
      ai: {
        title: 'Interior Liner - Lower Shell',
        category: 'Interior',
        observations: ['Liner present', 'Surface staining observed', 'No exposed substrate visible'],
        confidence: 91,
        note: 'Verify the observation in person. Liner chemistry is not inferred from the image.',
      },
    })
  }

  return (
    <div className="page-stack">
      <button className="back-link" type="button" onClick={onBack}>← Back</button>
      <section className="panel">
        <p className="eyebrow">Two-minute inspection</p>
        <h2>{asset?.name || 'Selected asset'}</h2>
        <p className="muted">AI assists. The inspector accepts, edits, or rejects every suggestion.</p>
      </section>

      <section className="panel">
        <ChoiceGroup label="Liner present?" value={linerPresent} options={['Yes', 'No', 'Unknown']} onChange={setLinerPresent} />
        <ChoiceGroup label="Overall condition?" value={condition} options={['Good', 'Fair', 'Poor']} onChange={setCondition} />
        <ChoiceGroup label="Action required?" value={action} options={['None', 'Monitor', 'Repair', 'Engineering Review']} onChange={setAction} />
      </section>

      <section className="panel">
        <div className="section-header">
          <div><p className="eyebrow">Photo intelligence</p><h2>Inspection evidence</h2></div>
          <label className="upload-button">Add photos<input type="file" accept="image/*" multiple onChange={addPhotos} /></label>
        </div>

        {photos.length === 0 ? <p className="empty-state">No photos added yet.</p> : (
          <div className="photo-list">
            {photos.map((photo) => (
              <article className="photo-card" key={photo.id}>
                <img src={photo.url} alt={photo.title} />
                <label>Photo title<input value={photo.title} onChange={(e) => updatePhoto(photo.id, { title: e.target.value })} /></label>
                <label>Category<select value={photo.category} onChange={(e) => updatePhoto(photo.id, { category: e.target.value })}>
                  <option>Interior</option><option>Exterior</option><option>Identification</option><option>Component</option><option>Defect</option><option>Before Repair</option><option>During Repair</option><option>After Repair</option><option>Final Acceptance</option>
                </select></label>
                <label>Inspector notes<textarea rows="3" value={photo.notes} onChange={(e) => updatePhoto(photo.id, { notes: e.target.value })} /></label>
                <button className="secondary-button" type="button" onClick={() => analyze(photo)}>AI suggest name and observations</button>

                {photo.ai ? (
                  <div className="ai-card">
                    <div className="ai-card-head"><strong>AI draft</strong><span>{photo.ai.confidence}% confidence</span></div>
                    <p><strong>{photo.ai.title}</strong></p>
                    <div className="tag-list">{photo.ai.observations.map((item) => <span key={item}>{item}</span>)}</div>
                    <p>{photo.ai.note}</p>
                    <div className="ai-actions">
                      <button type="button" className="primary-button" onClick={() => updatePhoto(photo.id, { title: photo.ai.title, category: photo.ai.category, notes: photo.ai.observations.join('. ') })}>Accept</button>
                      <button type="button" className="secondary-button" onClick={() => updatePhoto(photo.id, { ai: null })}>Reject</button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <p className="eyebrow">Standard vocabulary</p>
        <div className="tag-list">{vocabulary.map((item) => <span key={item}>{item}</span>)}</div>
        <label className="notes-label">Overall notes<textarea rows="4" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional voice-to-text or typed notes" /></label>
      </section>

      <button className="sticky-primary" type="button" onClick={() => onComplete({ assetId: asset?.id, linerPresent, condition, action, notes, photos })}>Complete inspection</button>
    </div>
  )
}
