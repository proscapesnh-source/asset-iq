import HealthRing from './HealthRing'
import StatusBadge from './StatusBadge'
import { formatDate } from '../lib/data'

export default function Dashboard({ data, onAddAsset, onOpenAsset, onInspect, onWorkOrders, onAssetFilter }) {
  const allAssets = data.assets || []
  const assets = allAssets.filter((item) => !item.dna?.lifecycle_status || ['Active','Out of Service'].includes(item.dna.lifecycle_status))
  const workOrders = data.workOrders || []
  const average = assets.length ? Math.round(assets.reduce((sum, item) => sum + (item.health_score || 0), 0) / assets.length) : 0
  const attention = assets.filter((item) => (item.health_score || 0) < 80).length
  const openWork = workOrders.filter((item) => item.status !== 'Complete').length

  return <div className="page-stack">
    <div className="page-heading"><div><p className="eyebrow">Lifecycle intelligence</p><h1>Asset overview</h1><p>Live condition, inspection, and maintenance data from your Supabase project.</p></div><button className="primary-button" onClick={onAddAsset}>＋ Add asset</button></div>

    <section className="hero-panel"><div><p className="eyebrow">Fleet health</p><h2>{assets.length ? `${assets.length} assets under management` : 'Build your asset registry'}</h2><p>{assets.length ? `${attention} asset${attention === 1 ? '' : 's'} currently need attention.` : 'Add your first asset, upload a real photo, and start an inspection.'}</p></div><HealthRing value={average} /></section>

    <section className="metric-grid"><button className="metric-card-button" onClick={()=>onAssetFilter?.("active")}><strong>{assets.length}</strong><span>Active assets</span><small>View assets →</small></button><button className="metric-card-button" onClick={()=>onAssetFilter?.("attention")}><strong>{attention}</strong><span>Need attention</span><small>Review now →</small></button><button className="metric-card-button" onClick={onWorkOrders}><strong>{openWork}</strong><span>Open work orders</span><small>View work →</small></button><article><strong>{data.inspections?.length || 0}</strong><span>Recent inspections</span></article></section>

    <section className="quick-grid"><button onClick={onAddAsset}><span>＋</span><strong>Add asset</strong><small>Register equipment and a cover photo</small></button><button onClick={onInspect}><span>✓</span><strong>Start inspection</strong><small>Capture findings and field photos</small></button><button onClick={onWorkOrders}><span>◇</span><strong>Work orders</strong><small>Turn findings into tracked action</small></button></section>

    <section className="panel"><div className="section-header"><div><p className="eyebrow">Asset registry</p><h2>Current service health</h2></div></div>{!assets.length ? <div className="empty-state"><strong>No assets yet</strong><p>Add your first asset to begin.</p></div> : <div className="asset-grid">{assets.slice(0, 6).map((asset) => <button className="asset-card" key={asset.id} onClick={() => onOpenAsset(asset)}><div className="asset-thumb">{asset.cover_url ? <img src={asset.cover_url} alt="" /> : <span>▣</span>}</div><div className="asset-card-body"><div className="asset-title-row"><div><strong>{asset.name}</strong><small>{asset.asset_tag} · {asset.facility || 'No facility'}</small></div><StatusBadge status={asset.status} /></div><div className="health-line"><span style={{ width: `${asset.health_score || 0}%` }} /></div><div className="asset-meta"><span>Health <b>{asset.health_score}</b></span><span>Next <b>{formatDate(asset.next_inspection_date)}</b></span></div></div></button>)}</div>}</section>

    <section className="panel"><div className="section-header"><div><p className="eyebrow">Recent activity</p><h2>Latest inspections</h2></div></div>{!data.inspections?.length ? <p className="muted">No inspections recorded yet.</p> : <div className="activity-list">{data.inspections.map((item) => <article key={item.id}><span className="activity-dot"/><div><strong>{item.assets?.name || 'Asset'} · {item.condition}</strong><p>Health score {item.health_score}. Inspection recorded {formatDate(item.inspected_at)}.</p><small>{item.assets?.asset_tag}</small></div></article>)}</div>}</section>
  </div>
}
