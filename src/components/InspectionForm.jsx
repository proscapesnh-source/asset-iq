import { useEffect, useRef, useState } from 'react'
import { aiAnnotationLine, aiNotesDraft, analyzeInspectionPhoto } from '../lib/ai'
import { randomId } from '../lib/id'

function DictationTextarea({ label, value, onChange, rows = 3, placeholder = '' }) {
  const [listening, setListening] = useState(false)
  const [message, setMessage] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => () => { try { recognitionRef.current?.stop() } catch {} }, [])

  const dictate = () => {
    if (listening) {
      try { recognitionRef.current?.stop() } catch {}
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setMessage('Browser dictation is unavailable here. Tap the microphone on the iPhone keyboard to dictate into this field.')
      return
    }
    setMessage('')
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = navigator.language || 'en-US'
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = (event) => {
      setListening(false)
      setMessage(event.error === 'not-allowed' ? 'Microphone permission is needed for dictation.' : 'Dictation stopped. You can try again or use the keyboard microphone.')
    }
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).slice(event.resultIndex).map((result) => result[0]?.transcript || '').join(' ').trim()
      if (transcript) onChange(`${value}${value?.trim() ? ' ' : ''}${transcript}`)
    }
    recognition.start()
  }

  return <label className="dictation-field">{label}<textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}/><button type="button" className={listening ? 'dictation-button listening' : 'dictation-button'} onClick={dictate}>{listening ? '■ Stop dictation' : '🎤 Talk to text'}</button>{message && <small className="field-help">{message}</small>}</label>
}

function AIResult({ photo, onApply, knowledge }) {
  const analysis = photo.ai_analysis
  if (photo.ai_busy) return <div className="ai-photo-panel loading"><strong>Analyzing photo…</strong><p>Checking visible coating and corrosion conditions.</p></div>
  if (photo.ai_error) return <div className="ai-photo-panel error"><strong>AI analysis unavailable</strong><p>{photo.ai_error}</p></div>
  if (!analysis) return null

  return <div className={`ai-photo-panel severity-${String(analysis.severity || 'unknown').toLowerCase()}`}>
    <div className="ai-photo-heading"><div><span className="ai-chip">AI draft</span><strong>{analysis.title}</strong></div><span>{analysis.confidence}% confidence</span></div>
    <div className="ai-grounding-note"><strong>Knowledge grounded:</strong> {(knowledge?.coatings?.length || 0)} coating systems · {(knowledge?.failures?.length || 0)} failure modes · {(knowledge?.repairs?.length || 0)} repair methods</div><div className="ai-photo-grid">
      <span><small>Severity</small><strong>{analysis.severity}</strong></span>
      <span><small>Area</small><strong>{analysis.component}</strong></span>
      <span><small>Surface</small><strong>{analysis.surface}</strong></span>
      <span><small>Coating condition</small><strong>{analysis.coating_condition}</strong></span>
      <span><small>Likely coating family</small><strong>{analysis.probable_coating_family || 'Not determined'}</strong></span>
      <span><small>Product match</small><strong>{analysis.matched_product || 'Not confirmed'}</strong></span>
    </div>
    {analysis.observed && <p><strong>Observed:</strong> {analysis.observed}</p>}
    {analysis.inference && <p><strong>Interpretation:</strong> {analysis.inference}</p>}
    {analysis.previous_repair_evidence && analysis.previous_repair_evidence !== 'Not determined' && <p><strong>Possible prior repair:</strong> {analysis.previous_repair_evidence}</p>}
    {analysis.subtle_indicators?.length > 0 && <div className="ai-recommendations"><small>Subtle indicators AI noticed</small><ul>{analysis.subtle_indicators.map(item=><li key={item}>{item}</li>)}</ul></div>}
    {analysis.differential_causes?.length > 0 && <div className="ai-recommendations"><small>Possible causes to differentiate</small><ul>{analysis.differential_causes.map(item=><li key={item}>{item}</li>)}</ul></div>}
    {analysis.inspect_next?.length > 0 && <div className="ai-recommendations inspect-next"><small>Inspector: check this next</small><ul>{analysis.inspect_next.map(item=><li key={item}>{item}</li>)}</ul></div>}
    {analysis.inspector_challenge && <div className="ai-review-flag"><strong>AI second opinion:</strong> {analysis.inspector_challenge}</div>}
    {analysis.compliance_concerns?.length > 0 && <div className="ai-compliance-panel"><strong>Potential standards / code concerns</strong>{analysis.compliance_concerns.map((item,i)=><p key={`${item.concern}-${i}`}><b>{item.concern}</b>{item.reference ? ` · ${item.reference}` : ''}{item.confidence ? ` · ${item.confidence}% confidence` : ''}<br/><small>Verify: {item.verification || 'Confirm applicability and field condition.'}</small></p>)}</div>}
    <p>{analysis.summary}</p>
    {analysis.defects?.length > 0 && <div className="ai-tag-row">{analysis.defects.map((item) => <span key={item}>{item}</span>)}</div>}
    {analysis.recommendations?.length > 0 && <div className="ai-recommendations"><small>Suggested next steps</small><ul>{analysis.recommendations.map((item) => <li key={item}>{item}</li>)}</ul></div>}
    {analysis.engineering_review && <div className="ai-review-flag">Qualified engineering review suggested.</div>}
    <small className="ai-limitations">{analysis.limitations}</small>
    <button type="button" className="secondary-button ai-apply" onClick={onApply}>Apply AI draft to photo</button>
  </div>
}

export default function InspectionForm({ asset, assets, knowledge, onCancel, onSave }) {
  const [selectedId, setSelectedId] = useState(asset?.id || assets[0]?.id || '')
  const current = assets.find((item) => item.id === selectedId) || asset
  const [form, setForm] = useState({ liner_present: 'Unknown', condition: 'Good', action_required: 'None', notes: '', next_inspection_date: current?.next_inspection_date || '' })
  const [photos, setPhotos] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const draftKey = current?.id ? `polyshield-inspection-draft:${current.id}` : null
  const [online, setOnline] = useState(navigator.onLine)
  const cameraInputRef = useRef(null)
  const libraryInputRef = useRef(null)

  const photosRef = useRef(photos)
  useEffect(() => { photosRef.current = photos }, [photos])
  useEffect(() => () => photosRef.current.forEach((item) => URL.revokeObjectURL(item.url)), [])
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  useEffect(() => {
    if (!draftKey) return
    try { const saved = localStorage.getItem(draftKey); if (saved) setForm(value => ({ ...value, ...JSON.parse(saved) })) } catch {}
  }, [draftKey])
  useEffect(() => { if (draftKey) localStorage.setItem(draftKey, JSON.stringify(form)) }, [draftKey, form])

  const addPhotos = (event) => {
    const next = Array.from(event.target.files || []).map((file) => ({
      id: randomId(), file, url: URL.createObjectURL(file),
      title: file.name.replace(/\.[^/.]+$/, ''), category: 'Interior', notes: '', annotation_note: '',
      ai_analysis: null, ai_busy: false, ai_error: '', ai_applied: false,
    }))
    setPhotos((items) => [...items, ...next]); event.target.value = ''
  }
  const updatePhoto = (id, patch) => setPhotos((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item))
  const removePhoto = (id) => setPhotos((items) => { const target = items.find((item) => item.id === id); if (target) URL.revokeObjectURL(target.url); return items.filter((item) => item.id !== id) })

  const analyzePhoto = async (photo) => {
    updatePhoto(photo.id, { ai_busy: true, ai_error: '' })
    try {
      const analysis = await analyzeInspectionPhoto(photo, current, knowledge)
      updatePhoto(photo.id, { ai_analysis: analysis, ai_busy: false })
    } catch (e) {
      updatePhoto(photo.id, { ai_busy: false, ai_error: e.message || 'AI analysis failed.' })
    }
  }

  const applyAI = (photo) => {
    const analysis = photo.ai_analysis
    if (!analysis) return
    const category = analysis.defects?.length ? 'Defect' : photo.category
    updatePhoto(photo.id, {
      title: analysis.title || photo.title,
      category,
      notes: aiNotesDraft(analysis),
      annotation_note: aiAnnotationLine(analysis),
      ai_applied: true,
    })
    if (analysis.engineering_review && form.action_required === 'None') setForm((value) => ({ ...value, action_required: 'Engineering Review' }))
  }

  const submit = async () => {
    if (!current) return
    setBusy(true); setError('')
    try { await onSave(current, form, photos); if (draftKey) localStorage.removeItem(draftKey) }
    catch (e) { setError(e.message || 'Could not save inspection.'); setBusy(false) }
  }

  return <div className="page-stack">
    <button className="back-button" onClick={onCancel} disabled={busy}>← Back</button>
    <div className="page-heading"><div><p className="eyebrow">Field workflow</p><h1>New inspection</h1><p>Record condition, attach evidence, use AI-assisted photo review, and create maintenance action automatically when needed.</p></div></div>{!online && <div className="field-offline-banner"><strong>Offline field mode</strong><span>Your inspection form is being saved on this device. Photo upload, AI analysis, and final synchronization require a connection.</span></div>}
    <section className="panel form-stack"><label>Asset<select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} disabled={Boolean(asset) || busy}>{assets.map((item) => <option key={item.id} value={item.id}>{item.asset_tag} · {item.name}</option>)}</select></label></section>
    {current ? <>
      <section className="panel"><div className="inspection-asset-strip"><div className="mini-thumb">{current.cover_url ? <img src={current.cover_url} alt=""/> : '▣'}</div><div><strong>{current.name}</strong><small>{current.asset_tag} · Current health {current.health_score}</small></div></div></section>
      <section className="panel"><div className="question"><strong>Liner present?</strong><div className="choice-row">{['Yes','No','Unknown'].map((item) => <button type="button" key={item} className={form.liner_present === item ? 'choice active' : 'choice'} onClick={() => setForm({ ...form, liner_present: item })}>{item}</button>)}</div></div><div className="question"><strong>Overall condition</strong><div className="choice-row">{['Excellent','Good','Fair','Poor','Critical'].map((item) => <button type="button" key={item} className={form.condition === item ? 'choice active' : 'choice'} onClick={() => setForm({ ...form, condition: item })}>{item}</button>)}</div></div><div className="question"><strong>Action required</strong><div className="choice-row">{['None','Monitor','Repair','Engineering Review'].map((item) => <button type="button" key={item} className={form.action_required === item ? 'choice active' : 'choice'} onClick={() => setForm({ ...form, action_required: item })}>{item}</button>)}</div></div><label>Next inspection date<input type="date" value={form.next_inspection_date} onChange={(e) => setForm({ ...form, next_inspection_date: e.target.value })}/></label><DictationTextarea label="Overall notes" rows={4} value={form.notes} onChange={(notes) => setForm((value) => ({ ...value, notes }))} placeholder="Observed condition, measurements, recommendations…"/></section>
      <section className="panel"><div className="section-header"><div><p className="eyebrow">Photo intelligence</p><h2>Inspection photos</h2><p className="muted">Take a field photo or choose existing images from the phone library. AI drafts visible findings only; the inspector approves what becomes part of the record.</p></div><div className="inspection-photo-source-actions"><button type="button" className="primary-button" onClick={() => cameraInputRef.current?.click()}>📷 Take photo</button><button type="button" className="secondary-button" onClick={() => libraryInputRef.current?.click()}>▣ Photo library</button><input ref={cameraInputRef} className="visually-hidden-file" type="file" accept="image/*" capture="environment" onChange={addPhotos}/><input ref={libraryInputRef} className="visually-hidden-file" type="file" accept="image/*" multiple onChange={addPhotos}/></div></div>
        {!photos.length ? <div className="empty-state"><strong>No photos added</strong><p>Add field photos to create a defensible asset history and optionally run AI-assisted analysis.</p></div> : <div className="inspection-photo-grid">{photos.map((photo) => <article className="inspection-photo-card" key={photo.id}>
          <img src={photo.url} alt=""/>
          <div className="photo-ai-actions"><button type="button" className="ai-analyze-button" disabled={photo.ai_busy} onClick={() => analyzePhoto(photo)}>{photo.ai_busy ? 'Analyzing…' : photo.ai_analysis ? '↻ Analyze again' : '✦ Analyze with AI'}</button>{photo.ai_applied && <span className="reviewed-badge">Inspector applied</span>}</div>
          <AIResult photo={photo} knowledge={knowledge} onApply={() => applyAI(photo)}/>
          <label>Title<input value={photo.title} onChange={(e) => updatePhoto(photo.id, { title: e.target.value, ai_applied: false })}/></label>
          <label>Category<select value={photo.category} onChange={(e) => updatePhoto(photo.id, { category: e.target.value })}><option>Interior</option><option>Exterior</option><option>Identification</option><option>Defect</option><option>Component</option><option>Before Repair</option><option>During Repair</option><option>After Repair</option><option>Final Acceptance</option></select></label>
          <DictationTextarea label="Photo notes" rows={3} value={photo.notes} onChange={(notes) => updatePhoto(photo.id, { notes, ai_applied: false })}/>
          <DictationTextarea label="Annotation / markup note" rows={2} value={photo.annotation_note} onChange={(annotation_note) => updatePhoto(photo.id, { annotation_note, ai_applied: false })} placeholder="Example: pitting at 4 o'clock, circle area in final report"/>
          <button type="button" className="danger-text" onClick={() => removePhoto(photo.id)}>Remove photo</button>
        </article>)}</div>}
      </section>
      {error && <div className="error-message">{error}</div>}<button className="sticky-action" onClick={submit} disabled={busy}>{busy ? 'Saving inspection and photos…' : 'Complete inspection'}</button>
    </> : <section className="panel empty-state"><strong>Add an asset first</strong><p>You need at least one asset before creating an inspection.</p></section>}
  </div>
}
