import HealthRing from './HealthRing'
import StatusBadge from './StatusBadge'

export default function Dashboard({ assets, projects, timeline, onOpenAsset, onStartInspection, onOpenProjects, onAddAsset }) {
  const average = Math.round(assets.reduce((sum, asset) => sum + asset.serviceHealth, 0) / assets.length)
  const needsAttention = assets.filter((asset) => asset.status !== 'Good').length

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Lifecycle intelligence</p>
          <h2>Know what is in service today.</h2>
          <p>Track vessels holding air, fuel, water, chemicals, and other process contents.</p>
        </div>
        <HealthRing value={average} />
      </section>

      <section className="metric-grid">
        <article><strong>{assets.length}</strong><span>Assets</span></article>
        <article><strong>{needsAttention}</strong><span>Need attention</span></article>
        <article><strong>{projects.filter((project) => project.status === 'Open').length}</strong><span>Open projects</span></article>
      </section>

      <section className="quick-grid three-actions">
        <button type="button" className="quick-action primary" onClick={onAddAsset}>
          <span>＋</span><strong>Add asset</strong><small>Photo-first onboarding</small>
        </button>
        <button type="button" className="quick-action" onClick={onStartInspection}>
          <span>＋</span><strong>Start inspection</strong><small>Fast field workflow</small>
        </button>
        <button type="button" className="quick-action" onClick={onOpenProjects}>
          <span>◇</span><strong>Continue project</strong><small>Before, during, after</small>
        </button>
      </section>

      <section className="panel">
        <div className="section-header">
          <div><p className="eyebrow">Asset registry</p><h2>Current service cycles</h2></div>
          <span>{assets.length} total</span>
        </div>
        <div className="asset-list">
          {assets.map((asset) => (
            <button key={asset.id} className="asset-card asset-card-with-photo" type="button" onClick={() => onOpenAsset(asset)}>
              <div className="registry-photo">
                {asset.coverPhoto ? <img src={asset.coverPhoto} alt="" /> : <span>▣</span>}
              </div>
              <div className="asset-card-content">
                <div className="asset-card-head">
                  <div><strong>{asset.name}</strong><small>{asset.id} · {asset.facility}</small></div>
                  <StatusBadge status={asset.status} />
                </div>
                <div className="asset-details-row">
                  <span><small>Contents</small>{asset.contents}</span>
                  <span><small>Cycle health</small>{asset.serviceHealth}</span>
                  <span><small>Next inspection</small>{asset.nextInspection}</span>
                </div>
                <div className="progress-track"><span style={{ width: `${asset.serviceHealth}%` }} /></div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-header"><div><p className="eyebrow">Asset history</p><h2>Recent verified activity</h2></div></div>
        <div className="timeline-list">
          {timeline.slice(0, 4).map((event) => (
            <article key={event.id} className="timeline-item">
              <span className="timeline-dot" />
              <div><strong>{event.title}</strong><p>{event.detail}</p><small>{event.type} · {event.date} · {event.source}</small></div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
