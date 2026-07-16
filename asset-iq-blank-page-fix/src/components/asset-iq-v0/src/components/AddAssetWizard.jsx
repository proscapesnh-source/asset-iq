import { useMemo, useState } from 'react'
import { compressImage } from '../utils'

const templates = {
  'Storage Tank': ['Isolation Valve', 'Drain Valve', 'Level Gauge', 'Vent'],
  'Hot Water Storage Vessel': ['Relief Valve', 'Mixing Valve', 'Circulation Pump', 'Drain Valve', 'Temperature Sensor'],
  'Fuel Storage Tank': ['Fill Connection', 'Vent', 'Level Gauge', 'Leak Sensor', 'Isolation Valve'],
  'Pressure Vessel': ['Relief Valve', 'Pressure Gauge', 'Drain Valve', 'Isolation Valve'],
  'Air Receiver': ['Relief Valve', 'Pressure Gauge', 'Automatic Drain', 'Isolation Valve'],
  Boiler: ['Relief Valve', 'Burner', 'Feedwater Pump', 'Low-Water Cutoff', 'Pressure Gauge'],
  Generator: ['Fuel System', 'Starter Battery', 'Cooling System', 'Transfer Switch'],
  Pump: ['Motor', 'Coupling', 'Seal', 'Suction Valve', 'Discharge Valve'],
  'Heat Exchanger': ['Isolation Valve', 'Temperature Sensor', 'Pressure Gauge', 'Drain Valve'],
  Other: [],
}

const substrates = ['Carbon steel', 'Mild carbon steel', 'Stainless steel', 'Aluminum', 'Concrete', 'Fiberglass reinforced plastic', 'Polyethylene', 'Unknown']

const blankDraft = {
  type: 'Storage Tank', name: '', contents: '', facility: '', location: '', substrate: 'Unknown',
  capacity: '', manufacturer: '', model: '', serialNumber: '', installedYear: '', linerPresent: 'Unknown',
}

export default function AddAssetWizard({ onCancel, onCreate }) {
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState(blankDraft)
  const [overallPhoto, setOverallPhoto] = useState('')
  const [nameplatePhoto, setNameplatePhoto] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [confidence, setConfidence] = useState({})
  const [components, setComponents] = useState(templates['Storage Tank'])

  const suggestedComponents = useMemo(() => templates[draft.type] ?? [], [draft.type])
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  const readPhoto = async (file, setter) => {
    if (!file) return
    try {
      setter(await compressImage(file))
    } catch {
      setter('')
    }
  }

  const selectType = (type) => {
    update('type', type)
    setComponents(templates[type] ?? [])
  }

  const analyze = () => {
    setAnalyzing(true)
    window.setTimeout(() => {
      setDraft((current) => ({
        ...current,
        name: current.name || `${current.type} - ${current.location || 'New Asset'}`,
        substrate: current.substrate === 'Unknown' ? 'Carbon steel' : current.substrate,
        manufacturer: current.manufacturer || (nameplatePhoto ? 'Review extracted nameplate text' : 'Not identified'),
        model: current.model || (nameplatePhoto ? 'Review extracted model' : 'Not identified'),
        serialNumber: current.serialNumber || (nameplatePhoto ? 'Review extracted serial number' : 'Not identified'),
      }))
      setConfidence({ type: 92, name: 87, substrate: 72, manufacturer: nameplatePhoto ? 80 : 35, serialNumber: nameplatePhoto ? 76 : 30 })
      setAnalyzing(false)
      setStep(3)
    }, 800)
  }

  const submit = () => {
    const prefix = draft.type.split(' ').map((word) => word[0]).join('').slice(0, 4).toUpperCase() || 'AIQ'
    const date = new Date().toISOString().slice(0, 10)
    onCreate({
      id: `${prefix}-${String(Date.now()).slice(-6)}`,
      name: draft.name || `${draft.type} - New Asset`,
      type: draft.type,
      contents: draft.contents || 'Not recorded',
      location: draft.location || 'Not recorded',
      facility: draft.facility || 'Not recorded',
      substrate: draft.substrate,
      capacity: draft.capacity || 'Not recorded',
      manufacturer: draft.manufacturer || 'Not recorded',
      model: draft.model || 'Not recorded',
      serialNumber: draft.serialNumber || 'Not recorded',
      installedYear: draft.installedYear || 'Unknown',
      assetHealth: 80,
      serviceHealth: 80,
      dataConfidence: overallPhoto ? (nameplatePhoto ? 84 : 68) : 42,
      inspectionLevel: 'External baseline',
      status: 'Monitor',
      coverPhoto: overallPhoto,
      nameplatePhoto,
      components: components.map((name, index) => ({ id: `${prefix}-C${index + 1}`, name, status: 'Not assessed' })),
      currentCycle: { number: 1, startedOn: date, linerPresent: draft.linerPresent === 'Yes', linerType: null, firstServiceDate: date },
      nextInspection: 'Schedule required',
    })
  }

  return (
    <div className="page-stack">
      <button className="back-link" type="button" onClick={onCancel}>← Cancel</button>
      <section className="panel onboarding-header">
        <p className="eyebrow">Smart asset registration</p>
        <h2>Create a digital passport</h2>
        <p className="muted">Add the asset with photos first, then confirm the suggested record.</p>
        <div className="wizard-progress">{[1, 2, 3, 4].map((item) => <span key={item} className={item <= step ? 'active' : ''}>{item}</span>)}</div>
      </section>

      {step === 1 && <section className="panel">
        <p className="eyebrow">Step 1</p><h2>Choose an asset template</h2>
        <div className="asset-type-grid">{Object.keys(templates).map((type) => <button key={type} type="button" className={draft.type === type ? 'asset-type-option active' : 'asset-type-option'} onClick={() => selectType(type)}>{type}</button>)}</div>
        <button className="primary-button wizard-next" type="button" onClick={() => setStep(2)}>Continue</button>
      </section>}

      {step === 2 && <section className="panel">
        <p className="eyebrow">Step 2</p><h2>Add photos</h2>
        <p className="muted">On iPhone, these controls let you take a new photo or choose one from your library.</p>
        <div className="capture-grid">
          <PhotoInput title="Overall asset photo" description="Required for the cover and visual baseline." preview={overallPhoto} onFile={(file) => readPhoto(file, setOverallPhoto)} />
          <PhotoInput title="Nameplate photo" description="Optional, but improves manufacturer and serial-number suggestions." preview={nameplatePhoto} onFile={(file) => readPhoto(file, setNameplatePhoto)} />
        </div>
        <div className="wizard-actions"><button className="secondary-button" type="button" onClick={() => setStep(1)}>Back</button><button className="primary-button" type="button" disabled={!overallPhoto || analyzing} onClick={analyze}>{analyzing ? 'Analyzing…' : 'Analyze and continue'}</button></div>
      </section>}

      {step === 3 && <section className="panel">
        <p className="eyebrow">Step 3</p><h2>Review suggested details</h2>
        <p className="record-note">These are editable suggestions, not verified facts. The user confirms the final record.</p>
        <div className="onboarding-form">
          <Field label="Asset name" value={draft.name} confidence={confidence.name} onChange={(v) => update('name', v)} />
          <SelectField label="Asset type" value={draft.type} options={Object.keys(templates)} confidence={confidence.type} onChange={selectType} />
          <Field label="Facility" value={draft.facility} onChange={(v) => update('facility', v)} />
          <Field label="Location" value={draft.location} onChange={(v) => update('location', v)} />
          <Field label="Contents or service" value={draft.contents} onChange={(v) => update('contents', v)} />
          <SelectField label="Substrate" value={draft.substrate} options={substrates} confidence={confidence.substrate} onChange={(v) => update('substrate', v)} />
          <Field label="Capacity" value={draft.capacity} onChange={(v) => update('capacity', v)} />
          <Field label="Manufacturer" value={draft.manufacturer} confidence={confidence.manufacturer} onChange={(v) => update('manufacturer', v)} />
          <Field label="Model" value={draft.model} onChange={(v) => update('model', v)} />
          <Field label="Serial number" value={draft.serialNumber} confidence={confidence.serialNumber} onChange={(v) => update('serialNumber', v)} />
          <Field label="Installed year" value={draft.installedYear} onChange={(v) => update('installedYear', v)} />
          <SelectField label="Liner present" value={draft.linerPresent} options={['Yes', 'No', 'Unknown']} onChange={(v) => update('linerPresent', v)} />
        </div>
        <div className="wizard-actions"><button className="secondary-button" type="button" onClick={() => setStep(2)}>Back</button><button className="primary-button" type="button" onClick={() => { setComponents(suggestedComponents); setStep(4) }}>Review components</button></div>
      </section>}

      {step === 4 && <>
        <section className="panel">
          <p className="eyebrow">Step 4</p><h2>Suggested child components</h2>
          <p className="muted">Keep the useful components and remove anything that does not apply.</p>
          <div className="component-chip-list">{components.map((name) => <button key={name} type="button" className="component-chip" onClick={() => setComponents((items) => items.filter((item) => item !== name))}>{name}<span>×</span></button>)}</div>
          <label>Add another component<input placeholder="Type a component and press Enter" onKeyDown={(event) => { if (event.key === 'Enter' && event.currentTarget.value.trim()) { event.preventDefault(); const value = event.currentTarget.value.trim(); setComponents((items) => items.includes(value) ? items : [...items, value]); event.currentTarget.value = '' } }} /></label>
        </section>
        <section className="panel onboarding-summary"><p className="eyebrow">Record scope</p><h2>External baseline</h2><p>The passport can be created now without an internal inspection. Data confidence remains moderate until deeper evidence is added.</p></section>
        <div className="wizard-actions sticky-wizard-actions"><button className="secondary-button" type="button" onClick={() => setStep(3)}>Back</button><button className="primary-button" type="button" onClick={submit}>Create asset passport</button></div>
      </>}
    </div>
  )
}

function PhotoInput({ title, description, preview, onFile }) {
  return <label className="capture-card"><strong>{title}</strong><span>{description}</span>{preview ? <img src={preview} alt="Selected preview" /> : <div className="photo-drop-placeholder">＋</div>}<input type="file" accept="image/*" onChange={(event) => onFile(event.target.files?.[0])} /><b>{preview ? 'Change photo' : 'Take or choose photo'}</b></label>
}

function Field({ label, value, onChange, confidence }) {
  return <label><span className="field-label-row"><span>{label}</span>{confidence ? <small>{confidence}% confidence</small> : null}</span><input value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function SelectField({ label, value, options, onChange, confidence }) {
  return <label><span className="field-label-row"><span>{label}</span>{confidence ? <small>{confidence}% confidence</small> : null}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
}
