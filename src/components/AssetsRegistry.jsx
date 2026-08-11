import { useMemo, useState } from 'react'
import StatusBadge from './StatusBadge'
import { formatDate } from '../lib/data'

export default function AssetsRegistry({ assets, onAdd, onOpen, onInspect }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [lifecycle, setLifecycle] = useState('All')
  const filtered = useMemo(() => assets.filter((asset) => {
    const haystack = `${asset.name} ${asset.asset_tag} ${asset.facility || ''} ${asset.asset_type || ''}`.toLowerCase()
    return haystack.includes(query.toLowerCase()) && (status === 'All' || asset.status === status) && (lifecycle === 'All' || (asset.dna?.lifecycle_status || 'Active') === lifecycle)
  }), [assets, query, status, lifecycle])

  return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow">Asset registry</p><h1>Assets</h1><p>Search, inspect, and manage every asset passport.</p></div><button className="primary-button" onClick={onAdd}>＋ Add asset</button></div>
    <section className="panel filters"><input placeholder="Search name, tag, facility…" value={query} onChange={(e) => setQuery(e.target.value)} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option><option>Good</option><option>Monitor</option><option>Repair</option><option>Critical</option></select><select value={lifecycle} onChange={(e) => setLifecycle(e.target.value)}><option>All</option><option>Active</option><option>Out of Service</option><option>Decommissioned</option><option>Sold / Transferred</option><option>Replaced</option><option>Retired / Scrapped</option></select></section>
    {!filtered.length ? <section className="panel empty-state"><strong>No matching assets</strong><p>Try another search or add a new asset.</p></section> : <section className="asset-grid">{filtered.map((asset) => <article className="registry-card" key={asset.id}><button className="registry-open" onClick={() => onOpen(asset)}><div className="registry-image">{asset.cover_url ? <img src={asset.cover_url} alt="" /> : <span>▣</span>}</div><div className="registry-copy"><div className="asset-title-row"><div><strong>{asset.name}</strong><small>{asset.asset_tag}</small></div><StatusBadge status={asset.status}/></div><p>{asset.asset_type} · {asset.facility || 'No facility'}{asset.contents ? ` · ${asset.contents}` : ''}</p><span className="lifecycle-mini">{asset.dna?.lifecycle_status || 'Active'}</span><div className="asset-meta"><span>Health <b>{asset.health_score}</b></span><span>Last <b>{formatDate(asset.last_inspection_date)}</b></span><span>Next <b>{formatDate(asset.next_inspection_date)}</b></span></div></div></button><button className="secondary-button inspect-card-button" onClick={() => onInspect(asset)}>Start inspection</button></article>)}</section>}
  </div>
}
