import { formatDate } from '../lib/data'

export default function AssetRecord({ asset, organizationName }) {
  return <section className="report-section-v2">
    <div className="report-section-title"><span>06</span><div><p className="eyebrow">Digital asset passport</p><h2>Equipment record</h2></div></div>
    <div className="asset-record-grid-v2">
      <div><small>Owner / organization</small><strong>{organizationName || 'Not recorded'}</strong></div>
      <div><small>Facility</small><strong>{asset.facility || 'Not recorded'}</strong></div>
      <div><small>Location</small><strong>{asset.location || 'Not recorded'}</strong></div>
      <div><small>Contents / service</small><strong>{asset.contents || 'Not recorded'}</strong></div>
      <div><small>Manufacturer</small><strong>{asset.manufacturer || 'Not recorded'}</strong></div>
      <div><small>Model</small><strong>{asset.model || 'Not recorded'}</strong></div>
      <div><small>Serial number</small><strong>{asset.serial_number || 'Not recorded'}</strong></div>
      <div><small>Install date</small><strong>{formatDate(asset.install_date)}</strong></div>
    </div>
  </section>
}
