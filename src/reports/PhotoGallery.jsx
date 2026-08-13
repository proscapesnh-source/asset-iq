export default function PhotoGallery({ inspection }) {
  return <section className="report-section-v2">
    <div className="report-section-title"><span>03</span><div><p className="eyebrow">Photographic evidence</p><h2>Inspection photos</h2></div></div>
    {!inspection.photos?.length ? <p className="muted">No photographs were attached to this inspection.</p> : <div className="report-photo-grid-v2">{inspection.photos.map((photo, index) => <figure key={photo.id || index}><div className="report-photo-frame-v2"><img src={photo.url} alt={photo.title || `Inspection photo ${index + 1}`}/><b>PHOTO {String(index + 1).padStart(2, '0')}</b></div><figcaption><strong>{photo.title || photo.file_name || `Inspection photo ${index + 1}`}</strong><span>{photo.category || 'Inspection evidence'}</span></figcaption></figure>)}</div>}
  </section>
}
