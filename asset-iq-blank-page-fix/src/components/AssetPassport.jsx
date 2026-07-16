import HealthRing from './HealthRing'
import StatusBadge from './StatusBadge'
import QRCodePanel from './QRCodePanel'

const text = (value, fallback = 'Not recorded') => value === null || value === undefined || value === '' ? fallback : value

export default function AssetPassport({ asset, timeline = [], onBack, onStartInspection, onUpdateAssetPhoto }) {
  if (!asset) {
    return (
      <div className="page-stack">
        <button className="back-link" type="button" onClick={onBack}>← Back to assets</button>
        <section className="panel"><h2>Asset unavailable</h2><p className="muted">This asset record could not be loaded.</p></section>
      </div>
    )
  }

  const cycle = asset.currentCycle ?? {}
  const components = Array.isArray(asset.components) ? asset.components : []
  const assetEvents = Array.isArray(timeline) ? timeline.filter((event) => event.assetId === asset.id) : []

  const changePhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onUpdateAssetPhoto?.(asset.id, String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  return (
    <div className="page-stack">
      <button className="back-link" type="button" onClick={onBack}>← Back to assets</button>

      <section className="asset-photo-hero">
        {asset.coverPhoto ? <img src={asset.coverPhoto} alt={`${text(asset.name, 'Asset')} cover`} /> : <div className="asset-photo-placeholder" aria-label="No asset photo"><span>▣</span><strong>No asset photo</strong></div>}
        <label className="asset-photo-button">{asset.coverPhoto ? 'Change asset photo' : 'Add asset photo'}<input type="file" accept="image/*" onChange={changePhoto} /></label>
      </section>

      <section className="hero-card passport-hero">
        <div>
          <p className="eyebrow">Digital asset passport</p>
          <h2>{text(asset.name, 'Unnamed asset')}</h2>
          <p>{text(asset.id)} · {text(asset.type)} · {text(asset.location)}</p>
          <StatusBadge status={text(asset.status, 'Monitor')} />
        </div>
        <HealthRing value={Number(asset.serviceHealth ?? asset.assetHealth ?? 80)} />
      </section>

      <section className="panel">
        <p className="eyebrow">Asset DNA</p>
        <div className="detail-grid">
          <div><small>Facility</small><strong>{text(asset.facility)}</strong></div>
          <div><small>Contents</small><strong>{text(asset.contents)}</strong></div>
          <div><small>Substrate</small><strong>{text(asset.substrate)}</strong></div>
          <div><small>Capacity</small><strong>{text(asset.capacity)}</strong></div>
          <div><small>Installed</small><strong>{text(asset.installedYear, 'Unknown')}</strong></div>
          <div><small>Asset health</small><strong>{text(asset.assetHealth, 'Not scored')}</strong></div>
          <div><small>Service health</small><strong>{text(asset.serviceHealth, 'Not scored')}</strong></div>
          <div><small>Data confidence</small><strong>{asset.dataConfidence !== null && asset.dataConfidence !== undefined ? `${asset.dataConfidence}%` : 'Not scored'}</strong></div>
          <div><small>Inspection level</small><strong>{text(asset.inspectionLevel, 'Baseline record')}</strong></div>
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Current service cycle</p>
        <div className="detail-grid">
          <div><small>Cycle</small><strong>#{text(cycle.number, 1)}</strong></div>
          <div><small>First service</small><strong>{text(cycle.firstServiceDate ?? cycle.startedOn)}</strong></div>
          <div><small>Liner present</small><strong>{cycle.linerPresent === true ? 'Yes' : cycle.linerPresent === false ? 'No' : 'Unknown'}</strong></div>
          <div><small>Liner record</small><strong>{text(cycle.linerType, 'No liner recorded')}</strong></div>
        </div>
        <p className="record-note">Liner chemistry is only taken from verified service records. Image analysis reports liner present, absent, damaged, or uncertain.</p>
      </section>

      <section className="panel">
        <div className="section-header"><div><p className="eyebrow">Connected equipment</p><h2>Child components</h2></div><span>{components.length} listed</span></div>
        {!components.length ? <p className="empty-state">No child components have been added yet.</p> : <div className="component-record-list">{components.map((component, index) => <article className="component-record" key={component.id ?? `${component.name}-${index}`}><div><strong>{text(component.name, 'Unnamed component')}</strong><small>{text(component.id)}</small></div><span>{text(component.status, 'Not assessed')}</span></article>)}</div>}
      </section>

      <QRCodePanel asset={asset} />

      <section className="panel">
        <p className="eyebrow">Asset history</p>
        {!assetEvents.length ? <p className="empty-state">No asset-history records yet.</p> : <div className="timeline-list">{assetEvents.map((event) => <article key={event.id} className="timeline-item"><span className="timeline-dot" /><div><strong>{text(event.title, 'History event')}</strong><p>{text(event.detail)}</p><small>{text(event.date)} · {text(event.source)}</small></div></article>)}</div>}
      </section>

      <button className="sticky-primary" type="button" onClick={() => onStartInspection?.(asset)}>Start inspection</button>
    </div>
  )
}
