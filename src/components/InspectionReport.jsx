import HealthRing from './HealthRing'
import { formatDate } from '../lib/data'

function recommendationFor(inspection) {
  const action = inspection.action_required || 'None'
  if (action === 'Engineering Review') return 'Engineering review is recommended before repair scope or continued-service decisions are finalized.'
  if (action === 'Repair') return 'Corrective repair is recommended. Document completed work and perform a follow-up inspection before returning the asset to normal service.'
  if (action === 'Monitor') return 'Continue monitoring the documented condition and compare findings at the next scheduled inspection.'
  return 'No immediate corrective action was recorded. Continue normal preventive maintenance and scheduled inspections.'
}

function conditionSummary(inspection, asset) {
  const condition = (inspection.condition || 'unknown').toLowerCase()
  return `${asset.name} was assessed in ${condition} overall condition with a PolyShield health score of ${inspection.health_score}. ${recommendationFor(inspection)}`
}

export default function InspectionReport({ asset, inspection, organizationName, inspectorEmail, onClose }) {
  if (!inspection) return null
  const reportNumber = `PS-${asset.asset_tag || 'ASSET'}-${new Date(inspection.inspected_at).toISOString().slice(0, 10).replaceAll('-', '')}`

  return <div className="report-screen">
    <div className="report-toolbar no-print">
      <button className="back-button" onClick={onClose}>← Asset record</button>
      <div className="report-toolbar-actions">
        <button className="secondary-button" onClick={() => window.print()}>Print</button>
        <button className="primary-button" onClick={() => window.print()}>Generate PDF</button>
      </div>
    </div>

    <article className="inspection-report">
      <header className="report-header">
        <div className="report-brand">
          <div className="report-logo">PS</div>
          <div><strong>PolyShield</strong><span>Asset IQ</span></div>
        </div>
        <div className="report-header-meta">
          <p>INSPECTION REPORT</p>
          <strong>{reportNumber}</strong>
          <span>{formatDate(inspection.inspected_at)}</span>
        </div>
      </header>

      <section className="report-title-block">
        <div><p className="eyebrow">Asset condition assessment</p><h1>{asset.name}</h1><p>{asset.asset_tag} · {asset.asset_type}</p></div>
        <HealthRing value={inspection.health_score}/>
      </section>

      <section className="report-grid report-summary-grid">
        <div><small>Organization</small><strong>{organizationName || 'Organization'}</strong></div>
        <div><small>Facility</small><strong>{asset.facility || 'Not recorded'}</strong></div>
        <div><small>Asset location</small><strong>{asset.location || 'Not recorded'}</strong></div>
        <div><small>Contents / service</small><strong>{asset.contents || 'Not recorded'}</strong></div>
        <div><small>Inspector</small><strong>{inspectorEmail || 'Signed-in inspector'}</strong></div>
        <div><small>Inspection date</small><strong>{formatDate(inspection.inspected_at)}</strong></div>
      </section>

      <section className="report-section">
        <div className="report-section-heading"><span>01</span><div><p className="eyebrow">Executive summary</p><h2>Condition assessment</h2></div></div>
        <p className="report-lead">{conditionSummary(inspection, asset)}</p>
        <div className="report-callouts">
          <div><small>Overall condition</small><strong>{inspection.condition}</strong></div>
          <div><small>Liner present</small><strong>{inspection.liner_present}</strong></div>
          <div><small>Action required</small><strong>{inspection.action_required}</strong></div>
          <div><small>Health score</small><strong>{inspection.health_score}/100</strong></div>
        </div>
      </section>

      <section className="report-section">
        <div className="report-section-heading"><span>02</span><div><p className="eyebrow">Inspector record</p><h2>Observations</h2></div></div>
        <p className="report-observation">{inspection.notes || 'No additional inspection notes were recorded.'}</p>
      </section>

      <section className="report-section">
        <div className="report-section-heading"><span>03</span><div><p className="eyebrow">Photographic evidence</p><h2>Inspection photos</h2></div></div>
        {!inspection.photos?.length ? <p className="muted">No photographs were attached to this inspection.</p> : <div className="report-photo-grid">
          {inspection.photos.map((photo, index) => <figure key={photo.id}>
            <div className="report-photo-frame"><img src={photo.url} alt={photo.title || `Inspection photo ${index + 1}`}/><b>PHOTO {String(index + 1).padStart(2, '0')}</b></div>
            <figcaption><strong>{photo.title || photo.file_name}</strong><span>{photo.category || 'Inspection evidence'}</span>{photo.notes && <p>{photo.notes}</p>}{photo.annotation_note && <p><b>Marked observation:</b> {photo.annotation_note}</p>}</figcaption>
          </figure>)}
        </div>}
      </section>

      <section className="report-section">
        <div className="report-section-heading"><span>04</span><div><p className="eyebrow">Recommended action</p><h2>Maintenance guidance</h2></div></div>
        <div className="recommendation-box"><strong>{inspection.action_required}</strong><p>{recommendationFor(inspection)}</p><p><b>Next scheduled inspection:</b> {formatDate(asset.next_inspection_date)}</p></div>
      </section>

      <section className="report-section report-asset-record">
        <div className="report-section-heading"><span>05</span><div><p className="eyebrow">Digital asset passport</p><h2>Equipment record</h2></div></div>
        <div className="report-grid">
          <div><small>Manufacturer</small><strong>{asset.manufacturer || 'Not recorded'}</strong></div>
          <div><small>Model</small><strong>{asset.model || 'Not recorded'}</strong></div>
          <div><small>Serial number</small><strong>{asset.serial_number || 'Not recorded'}</strong></div>
          <div><small>Install date</small><strong>{formatDate(asset.install_date)}</strong></div>
        </div>
      </section>

      <footer className="report-footer">
        <div><strong>PolyShield Asset IQ</strong><span>Digital inspection and lifecycle record</span></div>
        <div><span>Report {reportNumber}</span><span>Generated {new Date().toLocaleDateString()}</span></div>
      </footer>
    </article>
  </div>
}
