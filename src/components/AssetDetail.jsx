import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import HealthRing from './HealthRing'
import StatusBadge from './StatusBadge'
import ReportBuilder from '../reports/ReportBuilder'
import AssetDNA from './AssetDNA'
import LifecycleHistory from './LifecycleHistory'
import QRTagTools from './QRTagTools'
import AssetComponents from './AssetComponents'
import { formatDate } from '../lib/data'

export default function AssetDetail({ detail, organizationName, inspectorEmail, onBack, onInspect, onEdit, onAddPhoto, onSetCover, onSaveDNA, onAddServiceEvent, onSaveLifecycleStatus, onAddLifecycleEvent, onOrderQRTag, onCreateComponent, onUpdateComponent, onDeleteComponent, onRetireComponent, onRestoreComponent, onRefresh }) {
  const { asset, photos, inspections, workOrders } = detail
  const [showPhotoForm, setShowPhotoForm] = useState(false)
  const [file, setFile] = useState(null)
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reportInspection, setReportInspection] = useState(null)
  const currentUrl = `${window.location.origin}${window.location.pathname}?asset=${asset.id}`

  if (reportInspection) return <ReportBuilder asset={asset} inspection={reportInspection} organizationName={organizationName} inspectorEmail={inspectorEmail} onClose={() => setReportInspection(null)} />

  const upload = async () => { if (!file) return; setBusy(true); setError(''); try { await onAddPhoto(file, caption, photos.length === 0); setFile(null); setCaption(''); setShowPhotoForm(false); await onRefresh() } catch (e) { setError(e.message || 'Photo upload failed.') } finally { setBusy(false) } }

  return <div className="page-stack"><button className="back-button" onClick={onBack}>← Assets</button>
    <section className="asset-hero"><div className="asset-hero-image">{asset.cover_url ? <img src={asset.cover_url} alt={`${asset.name} cover`}/> : <span>▣</span>}</div><div className="asset-hero-copy"><p className="eyebrow">Digital asset passport</p><div className="asset-title-row"><div><h1>{asset.name}</h1><p>{asset.asset_tag} · {asset.asset_type}</p></div><StatusBadge status={asset.status}/></div><div className="passport-meta"><span><small>Facility</small><strong>{asset.facility || 'Not recorded'}</strong></span><span><small>Contents</small><strong>{asset.contents || 'Not recorded'}</strong></span><span><small>Last inspection</small><strong>{formatDate(asset.last_inspection_date)}</strong></span><span><small>Next inspection</small><strong>{formatDate(asset.next_inspection_date)}</strong></span></div><div className="asset-hero-actions"><button className="primary-button" onClick={() => onInspect(asset)}>Start inspection</button><button className="secondary-button" onClick={() => onEdit(asset)}>Edit asset</button><button className="secondary-button" onClick={() => document.getElementById('asset-qr-tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>QR / Tag</button></div></div><HealthRing value={asset.health_score}/></section>

    <section className="two-column"><article className="panel"><p className="eyebrow">Equipment record</p><h2>Asset details</h2><dl className="detail-list"><div><dt>Manufacturer</dt><dd>{asset.manufacturer || 'Not recorded'}</dd></div><div><dt>Model</dt><dd>{asset.model || 'Not recorded'}</dd></div><div><dt>Serial</dt><dd>{asset.serial_number || 'Not recorded'}</dd></div><div><dt>Installed</dt><dd>{formatDate(asset.install_date)}</dd></div><div><dt>Location</dt><dd>{asset.location || 'Not recorded'}</dd></div></dl>{asset.notes && <p className="record-note">{asset.notes}</p>}</article><article className="panel qr-panel" id="asset-qr-tools"><p className="eyebrow">Field access</p><h2>Asset QR code</h2><QRCodeSVG value={currentUrl} size={150}/><p className="muted">Scan this QR code on a phone to open this asset passport after signing in.</p><QRTagTools asset={asset} organizationName={organizationName} currentUrl={currentUrl} onOrder={onOrderQRTag}/><button className="text-button" onClick={() => window.print()}>Print full passport / save PDF</button></article></section>

    <AssetDNA asset={asset} dna={detail.dna} events={detail.serviceEvents} onSaveDNA={async (form) => { await onSaveDNA(form); await onRefresh() }} onAddEvent={async (form) => { await onAddServiceEvent(form); await onRefresh() }} />

    <AssetComponents asset={asset} components={detail.components || []} ready={detail.componentsReady !== false} onCreate={async (form) => { await onCreateComponent(form); await onRefresh() }} onUpdate={async (id, form) => { await onUpdateComponent(id, form); await onRefresh() }} onDelete={async (id) => { await onDeleteComponent(id); await onRefresh() }} onRetire={async (id, reason) => { await onRetireComponent(id, reason); await onRefresh() }} onRestore={async (id) => { await onRestoreComponent(id); await onRefresh() }} />

    <LifecycleHistory asset={asset} dna={detail.dna} events={detail.lifecycleEvents} onSaveStatus={async (status) => { await onSaveLifecycleStatus(status); await onRefresh() }} onAddEvent={async (form) => { await onAddLifecycleEvent(form); await onRefresh() }} />

    <section className="panel"><div className="section-header"><div><p className="eyebrow">Evidence library</p><h2>Asset photos</h2></div><button className="secondary-button" onClick={() => setShowPhotoForm(!showPhotoForm)}>＋ Add photo</button></div>{showPhotoForm && <div className="inline-form"><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)}/><input placeholder="Caption" value={caption} onChange={(e) => setCaption(e.target.value)}/><button className="primary-button" onClick={upload} disabled={!file || busy}>{busy ? 'Uploading…' : 'Upload'}</button></div>}{error && <div className="error-message">{error}</div>}{!photos.length ? <p className="muted">No asset photos yet.</p> : <div className="gallery-grid">{photos.map((photo) => <figure key={photo.id}><img src={photo.url} alt={photo.caption || 'Asset'}/><figcaption><span>{photo.caption || photo.file_name}</span>{photo.is_cover ? <b>Cover</b> : <button className="text-button" onClick={async () => { await onSetCover(photo.id); await onRefresh() }}>Make cover</button>}</figcaption></figure>)}</div>}</section>

    <section className="panel"><div className="section-header"><div><p className="eyebrow">Condition trend</p><h2>Inspection history</h2></div><div className="section-actions">{inspections.length > 0 && <button className="primary-button" onClick={() => setReportInspection(inspections[0])}>Generate latest report</button>}<span>{inspections.length} records</span></div></div>{!inspections.length ? <p className="muted">No inspections yet.</p> : <><div className="trend-chart">{[...inspections].reverse().map((item) => <div key={item.id} className="trend-bar-wrap"><span className="trend-bar" style={{ height: `${Math.max(6, item.health_score)}%` }} title={`${item.health_score}`}></span><small>{new Date(item.inspected_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</small></div>)}</div><div className="history-list">{inspections.map((inspection) => <details key={inspection.id}><summary><div><strong>{inspection.condition} condition · Health {inspection.health_score}</strong><small>{formatDate(inspection.inspected_at)} · Action: {inspection.action_required}</small></div><span>{inspection.photos.length} photos</span></summary><div className="history-report-action"><button className="secondary-button" onClick={() => setReportInspection(inspection)}>Generate report</button></div><p>{inspection.notes || 'No overall notes.'}</p>{inspection.photos.length > 0 && <div className="inspection-history-photos">{inspection.photos.map((photo) => <figure key={photo.id}><img src={photo.url} alt=""/><figcaption><strong>{photo.title || photo.file_name}</strong><small>{photo.category}{photo.annotation_note ? ` · ${photo.annotation_note}` : ''}</small></figcaption></figure>)}</div>}</details>)}</div></>}</section>

    <section className="panel"><div className="section-header"><div><p className="eyebrow">Maintenance lifecycle</p><h2>Work orders</h2></div><span>{workOrders.length}</span></div>{!workOrders.length ? <p className="muted">No work orders tied to this asset.</p> : <div className="work-list">{workOrders.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{item.priority} priority · {formatDate(item.due_date)}</small></div><StatusBadge status={item.status}/></article>)}</div>}</section>
  </div>
}
