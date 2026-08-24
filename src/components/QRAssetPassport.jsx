import HealthRing from './HealthRing'
import { formatDate } from '../lib/data'

export default function QRAssetPassport({ passport, onClose }) {
  const asset = passport?.asset || {}
  const latest = passport?.latest_inspection || null
  return <main className="qr-passport-page">
    <section className="qr-passport-card">
      <div className="qr-passport-top"><div><p className="eyebrow">POLYSHIELD ASSET IQ</p><h1>{asset.name || 'Asset passport'}</h1><p>{asset.asset_tag || 'Unassigned'} · {asset.asset_type || 'Asset'}</p></div><HealthRing score={asset.health_score ?? 70}/></div>
      <div className="qr-passport-grid">
        <div><small>Organization</small><strong>{passport?.organization_name || 'Not shown'}</strong></div>
        <div><small>Facility</small><strong>{asset.facility || 'Not recorded'}</strong></div>
        <div><small>Location</small><strong>{asset.location || 'Not recorded'}</strong></div>
        <div><small>Service / contents</small><strong>{asset.contents || 'Not recorded'}</strong></div>
        <div><small>Status</small><strong>{asset.status || 'Not recorded'}</strong></div>
        <div><small>Last inspection</small><strong>{formatDate(asset.last_inspection_date)}</strong></div>
      </div>
      {latest && <div className="qr-passport-latest"><p className="eyebrow">Latest inspection</p><h2>{latest.condition} condition</h2><p>{latest.notes || 'No inspection notes were recorded.'}</p><small>{formatDate(latest.inspected_at)} · Action: {latest.action_required || 'None'}</small></div>}
      <p className="qr-passport-access-note">You opened this read-only passport from the asset QR code. Editing, inspection history, work orders, and organization tools remain protected by organization permissions.</p>
      <button className="secondary-button" onClick={onClose}>Go to my PolyShield dashboard</button>
    </section>
  </main>
}
