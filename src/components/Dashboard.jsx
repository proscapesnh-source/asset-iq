import HealthRing from './HealthRing'
import StatusBadge from './StatusBadge'
import { formatDate } from '../lib/data'
import { capabilitiesForRole, workspaceLabel } from '../lib/roles'

export default function Dashboard({ data, role, onAddAsset, onOpenAsset, onInspect, onWorkOrders, onPlanning, onSupervisor, onAssetFilter }) {
  const permissions = capabilitiesForRole(role)
  const allAssets = data.assets || []
  const assets = allAssets.filter((item) => !item.dna?.lifecycle_status || ['Active','Out of Service'].includes(item.dna.lifecycle_status))
  const workOrders = data.workOrders || []
  const average = assets.length ? Math.round(assets.reduce((sum, item) => sum + (item.health_score || 0), 0) / assets.length) : 0
  const attention = assets.filter((item) => (item.health_score || 0) < 80).length
  const openWork = workOrders.filter((item) => item.status !== 'Complete').length

  return <div className="page-stack">
    <div className="page-heading"><div><p className="eyebrow">{workspaceLabel(role)}</p><h1>{permissions.workspace === 'technician' ? 'Field assignments' : permissions.workspace === 'maintenance' ? 'Maintenance execution' : permissions.workspace === 'supervisor' ? 'Operations overview' : 'Asset overview'}</h1><p>{permissions.workspace === 'technician' ? 'Inspect assets, capture evidence, and submit verified field findings.' : permissions.workspace === 'maintenance' ? 'Execute repairs, update components, and preserve service history.' : permissions.workspace === 'supervisor' ? 'Monitor fleet condition, approve work, and manage lifecycle decisions.' : 'View asset passports and current condition history.'}</p></div>{permissions.manageAssets && <button className="primary-button" onClick={onAddAsset}>＋ Add asset</button>}</div>

    <section className="hero-panel"><div><p className="eyebrow">Fleet health</p><h2>{assets.length ? `${assets.length} assets under management` : 'Build your asset registry'}</h2><p>{assets.length ? `${attention} asset${attention === 1 ? '' : 's'} currently need attention.` : 'Add your first asset, upload a real photo, and start an inspection.'}</p></div><HealthRing value={average} /></section>

    <section className="metric-grid"><button className="metric-card-button" onClick={()=>onAssetFilter?.("active")}><strong>{assets.length}</strong><span>Active assets</span><small>View assets →</small></button><button className="metric-card-button" onClick={()=>onAssetFilter?.("attention")}><strong>{attention}</strong><span>Need attention</span><small>Review now →</small></button>{permissions.maintain ? <button className="metric-card-button" onClick={onWorkOrders}><strong>{openWork}</strong><span>Open work orders</span><small>View work →</small></button> : <article><strong>{openWork}</strong><span>Open work orders</span></article>}<article><strong>{data.inspections?.length || 0}</strong><span>Recent inspections</span></article></section>

    <section className="quick-grid">
      {permissions.workspace === 'technician' && <><button onClick={onInspect}><span>✓</span><strong>Start inspection</strong><small>Capture findings, voice notes, and photos</small></button><button onClick={onPlanning}><span>△</span><strong>Field calculators</strong><small>Calculate area and coating volume</small></button><button onClick={onAddAsset}><span>＋</span><strong>Register asset</strong><small>Create an asset passport in the field</small></button></>}
      {permissions.workspace === 'maintenance' && <><button onClick={onWorkOrders}><span>◇</span><strong>Work orders</strong><small>Open, update, and close repair work</small></button><button onClick={() => onAssetFilter?.('attention')}><span>!</span><strong>Needs attention</strong><small>Find assets awaiting maintenance</small></button><button onClick={onPlanning}><span>△</span><strong>Repair planning</strong><small>Calculate areas and material quantities</small></button></>}
      {permissions.workspace === 'supervisor' && <><button onClick={onSupervisor}><span>◎</span><strong>Supervisor board</strong><small>Review operations and recent activity</small></button><button onClick={onWorkOrders}><span>◇</span><strong>Budgets & work</strong><small>Approve funding, vendors, and POs</small></button><button onClick={onPlanning}><span>△</span><strong>Planning</strong><small>Review estimates and budget exposure</small></button></>}
      {permissions.workspace === 'viewer' && <button onClick={() => onAssetFilter?.('active')}><span>▣</span><strong>View assets</strong><small>Open read-only asset passports</small></button>}
    </section>

    <section className="panel"><div className="section-header"><div><p className="eyebrow">Asset registry</p><h2>Current service health</h2></div></div>{!assets.length ? <div className="empty-state"><strong>No assets yet</strong><p>Add your first asset to begin.</p></div> : <div className="asset-grid">{assets.slice(0, 6).map((asset) => <button className="asset-card" key={asset.id} onClick={() => onOpenAsset(asset)}><div className="asset-thumb">{asset.cover_url ? <img src={asset.cover_url} alt="" /> : <span>▣</span>}</div><div className="asset-card-body"><div className="asset-title-row"><div><strong>{asset.name}</strong><small>{asset.asset_tag} · {asset.facility || 'No facility'}</small></div><StatusBadge status={asset.status} /></div><div className="health-line"><span style={{ width: `${asset.health_score || 0}%` }} /></div><div className="asset-meta"><span>Health <b>{asset.health_score}</b></span><span>Next <b>{formatDate(asset.next_inspection_date)}</b></span></div></div></button>)}</div>}</section>

    <section className="panel"><div className="section-header"><div><p className="eyebrow">Recent activity</p><h2>Latest inspections</h2></div></div>{!data.inspections?.length ? <p className="muted">No inspections recorded yet.</p> : <div className="activity-list">{data.inspections.map((item) => <article key={item.id}><span className="activity-dot"/><div><strong>{item.assets?.name || 'Asset'} · {item.condition}</strong><p>Health score {item.health_score}. Inspection recorded {formatDate(item.inspected_at)}.</p><small>{item.assets?.asset_tag}</small></div></article>)}</div>}</section>
  </div>
}
