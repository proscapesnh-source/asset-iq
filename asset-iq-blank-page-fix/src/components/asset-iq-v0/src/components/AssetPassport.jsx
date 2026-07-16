import HealthRing from './HealthRing'
import StatusBadge from './StatusBadge'
import QRCodePanel from './QRCodePanel'
import { compressImage } from '../utils'

export default function AssetPassport({ asset, timeline = [], repairs = [], onBack, onStartInspection, onStartRepair, onUpdateAssetPhoto }) {
  if (!asset) return <div className="panel"><h2>No asset selected</h2><button className="primary-button" onClick={onBack}>Back to assets</button></div>

  const assetEvents = timeline.filter((event) => event.assetId === asset.id)
  const assetRepairs = repairs.filter((repair) => repair.assetId === asset.id)
  const cycle = asset.currentCycle || {}

  const changePhoto = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      onUpdateAssetPhoto(asset.id, await compressImage(file))
    } catch {
      // Keep the current record intact when an image cannot be processed.
    }
  }

  return (
    <div className="page-stack">
      <button className="back-link" type="button" onClick={onBack}>← Back to assets</button>

      <section className="asset-photo-hero">
        {asset.coverPhoto ? <img src={asset.coverPhoto} alt={`${asset.name} cover`} /> : <div className="asset-photo-placeholder"><span>▣</span><strong>No asset photo</strong></div>}
        <label className="asset-photo-button">{asset.coverPhoto ? 'Change asset photo' : 'Add asset photo'}<input type="file" accept="image/*" onChange={changePhoto} /></label>
      </section>

      <section className="hero-card passport-hero">
        <div><p className="eyebrow">Digital asset passport</p><h2>{asset.name}</h2><p>{asset.id} · {asset.type} · {asset.location}</p><StatusBadge status={asset.status} /></div>
        <HealthRing value={asset.serviceHealth} />
      </section>

      <section className="quick-grid">
        <button className="quick-action primary" type="button" onClick={() => onStartInspection(asset)}><span>＋</span><strong>New inspection</strong><small>Add findings and evidence</small></button>
        <button className="quick-action" type="button" onClick={onStartRepair}><span>◇</span><strong>Repair record</strong><small>Track work and verification</small></button>
      </section>

      <section className="panel"><p className="eyebrow">Asset identity</p><div className="detail-grid">
        <Detail label="Facility" value={asset.facility} /><Detail label="Contents" value={asset.contents} /><Detail label="Substrate" value={asset.substrate} /><Detail label="Capacity" value={asset.capacity} />
        <Detail label="Manufacturer" value={asset.manufacturer} /><Detail label="Model" value={asset.model} /><Detail label="Serial number" value={asset.serialNumber} /><Detail label="Installed" value={asset.installedYear} />
        <Detail label="Asset health" value={asset.assetHealth} /><Detail label="Service health" value={asset.serviceHealth} /><Detail label="Data confidence" value={`${asset.dataConfidence ?? 0}%`} /><Detail label="Inspection level" value={asset.inspectionLevel} />
      </div></section>

      <section className="panel"><p className="eyebrow">Current service cycle</p><div className="detail-grid">
        <Detail label="Cycle" value={`#${cycle.number || 1}`} /><Detail label="First service" value={cycle.firstServiceDate || 'Not recorded'} /><Detail label="Liner present" value={cycle.linerPresent ? 'Yes' : 'No or unknown'} /><Detail label="Liner record" value={cycle.linerType || 'No verified liner identity'} />
      </div><p className="record-note">Photo review may describe visible conditions, but uncertain or safety-critical conditions should be referred for qualified field inspection or engineering review.</p></section>

      <section className="panel"><div className="section-header"><div><p className="eyebrow">Repair accountability</p><h2>Repair records</h2></div><span>{assetRepairs.length} total</span></div>
        {!assetRepairs.length ? <p className="empty-state">No repair records have been added.</p> : <div className="component-record-list">{assetRepairs.map((repair) => <article className="component-record" key={repair.id}><div><strong>{repair.title}</strong><small>{repair.date} · {repair.contractor || 'Contractor not recorded'} · {repair.verification ? `Verified by ${repair.verification}` : 'Awaiting verification'}</small></div><span>{repair.status}</span></article>)}</div>}
      </section>

      <section className="panel"><div className="section-header"><div><p className="eyebrow">Connected equipment</p><h2>Child components</h2></div><span>{asset.components?.length || 0} listed</span></div>
        {!asset.components?.length ? <p className="empty-state">No child components have been added.</p> : <div className="component-record-list">{asset.components.map((component) => <article className="component-record" key={component.id}><div><strong>{component.name}</strong><small>{component.id}</small></div><span>{component.status}</span></article>)}</div>}
      </section>

      <QRCodePanel asset={asset} />

      <section className="panel"><div className="section-header"><div><p className="eyebrow">Digital history</p><h2>Inspections, repairs, and maintenance</h2></div><span>{assetEvents.length} events</span></div>
        {!assetEvents.length ? <p className="empty-state">No history has been recorded yet.</p> : <div className="timeline-list">{assetEvents.map((event) => <article key={event.id} className="timeline-item"><span className="timeline-dot"/><div><strong>{event.title}</strong><p>{event.detail}</p><small>{event.type} · {event.date} · {event.source}</small></div></article>)}</div>}
      </section>
    </div>
  )
}

function Detail({ label, value }) { return <div><small>{label}</small><strong>{value || 'Not recorded'}</strong></div> }
