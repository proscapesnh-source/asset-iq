import HealthRing from './HealthRing'
import StatusBadge from './StatusBadge'
import QRCodePanel from './QRCodePanel'

export default function AssetPassport({ asset, timeline, onBack, onStartInspection, onUpdateAssetPhoto }) {
  const assetEvents = timeline.filter((event) => event.assetId === asset.id)

  const changePhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onUpdateAssetPhoto(asset.id, reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="page-stack">
      <button className="back-link" type="button" onClick={onBack}>← Back to assets</button>

      <section className="asset-photo-hero">
        {asset.coverPhoto ? (
          <img src={asset.coverPhoto} alt={`${asset.name} cover`} />
        ) : (
          <div className="asset-photo-placeholder" aria-label="No asset photo">
            <span>▣</span>
            <strong>No asset photo</strong>
          </div>
        )}
        <label className="asset-photo-button">
          {asset.coverPhoto ? 'Change asset photo' : 'Add asset photo'}
          <input type="file" accept="image/*" onChange={changePhoto} />
        </label>
      </section>

      <section className="hero-card passport-hero">
        <div>
          <p className="eyebrow">Digital asset passport</p>
          <h2>{asset.name}</h2>
          <p>{asset.id} · {asset.type} · {asset.location}</p>
          <StatusBadge status={asset.status} />
        </div>
        <HealthRing value={asset.serviceHealth} />
      </section>

      <section className="panel">
        <p className="eyebrow">Asset DNA</p>
        <div className="detail-grid">
          <div><small>Contents</small><strong>{asset.contents}</strong></div>
          <div><small>Substrate</small><strong>{asset.substrate}</strong></div>
          <div><small>Capacity</small><strong>{asset.capacity}</strong></div>
          <div><small>Installed</small><strong>{asset.installedYear}</strong></div>
          <div><small>Asset health</small><strong>{asset.assetHealth}</strong></div>
          <div><small>Service health</small><strong>{asset.serviceHealth}</strong></div>
          <div><small>Data confidence</small><strong>{asset.dataConfidence ?? 'Not scored'}{asset.dataConfidence ? '%' : ''}</strong></div>
          <div><small>Inspection level</small><strong>{asset.inspectionLevel ?? 'Full record'}</strong></div>
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Current service cycle</p>
        <div className="detail-grid">
          <div><small>Cycle</small><strong>#{asset.currentCycle.number}</strong></div>
          <div><small>First service</small><strong>{asset.currentCycle.firstServiceDate}</strong></div>
          <div><small>Liner present</small><strong>{asset.currentCycle.linerPresent ? 'Yes' : 'No'}</strong></div>
          <div><small>Liner record</small><strong>{asset.currentCycle.linerType || 'No liner recorded'}</strong></div>
        </div>
        <p className="record-note">Liner chemistry is only taken from verified service records. Image analysis reports liner present, absent, damaged, or uncertain.</p>
      </section>


      <section className="panel">
        <div className="section-header">
          <div><p className="eyebrow">Connected equipment</p><h2>Child components</h2></div>
          <span>{asset.components?.length ?? 0} listed</span>
        </div>
        {!asset.components?.length ? <p className="empty-state">No child components have been added yet.</p> : (
          <div className="component-record-list">
            {asset.components.map((component) => (
              <article className="component-record" key={component.id}>
                <div><strong>{component.name}</strong><small>{component.id}</small></div>
                <span>{component.status}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <QRCodePanel asset={asset} />

      <section className="panel">
        <p className="eyebrow">Asset history</p>
        {assetEvents.length === 0 ? <p className="empty-state">No asset-history records for this sample asset yet.</p> : (
          <div className="timeline-list">
            {assetEvents.map((event) => (
              <article key={event.id} className="timeline-item">
                <span className="timeline-dot" />
                <div><strong>{event.title}</strong><p>{event.detail}</p><small>{event.date} · {event.source}</small></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <button className="sticky-primary" type="button" onClick={() => onStartInspection(asset)}>Start inspection</button>
    </div>
  )
}
