import { useMemo, useState, useEffect } from 'react'
import StatusBadge from './StatusBadge'
import { formatDate } from '../lib/data'

export default function AssetsRegistry({ assets, sites = [], initialFilter = null, initialSiteId = 'All', onAdd, onOpen, onInspect }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [lifecycle, setLifecycle] = useState('All')
  const [siteId, setSiteId] = useState(initialSiteId || 'All')
  const [smartFilter, setSmartFilter] = useState(initialFilter || null)
  useEffect(()=>setSmartFilter(initialFilter || null),[initialFilter])
  useEffect(()=>setSiteId(initialSiteId || 'All'),[initialSiteId])
  const filtered = useMemo(() => assets.filter((asset) => {
    const haystack = `${asset.name} ${asset.asset_tag} ${asset.facility || ''} ${asset.asset_type || ''}`.toLowerCase()
    const active = !asset.dna?.lifecycle_status || ['Active','Out of Service'].includes(asset.dna.lifecycle_status)
    const attention = (asset.health_score || 0) < 80 || ['Monitor','Repair','Critical'].includes(asset.status)
    return haystack.includes(query.toLowerCase()) && (status === 'All' || asset.status === status) && (lifecycle === 'All' || (asset.dna?.lifecycle_status || 'Active') === lifecycle) && (siteId === 'All' || asset.site_id === siteId) && (!smartFilter || (smartFilter === 'active' ? active : attention))
  }), [assets, query, status, lifecycle, siteId, smartFilter])

  return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow">Asset registry</p><h1>{smartFilter === 'attention' ? 'Assets needing attention' : smartFilter === 'active' ? 'Active assets' : 'Assets'}</h1><p>Search, inspect, and manage every asset passport across the organization.</p></div><button className="primary-button" onClick={onAdd}>＋ Add asset</button></div>
    <section className="panel filters"><input placeholder="Search name, tag, facility…" value={query} onChange={(e) => setQuery(e.target.value)} /><select value={siteId} onChange={(e) => setSiteId(e.target.value)}><option value="All">All sites</option>{sites.map(site=><option key={site.id} value={site.id}>{site.name}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option><option>Good</option><option>Monitor</option><option>Repair</option><option>Critical</option></select><select value={lifecycle} onChange={(e) => setLifecycle(e.target.value)}><option>All</option><option>Active</option><option>Out of Service</option><option>Decommissioned</option><option>Sold / Transferred</option><option>Replaced</option><option>Retired / Scrapped</option></select>{smartFilter && <button className="text-button" onClick={()=>setSmartFilter(null)}>Clear dashboard filter</button>}</section>
    {!filtered.length ? <section className="panel empty-state"><strong>No matching assets</strong><p>Try another search or filter.</p></section> : <section className="asset-grid">{filtered.map((asset) => <article className="registry-card" key={asset.id}><button className="registry-open" onClick={() => onOpen(asset)}><div className="registry-image">{asset.cover_url ? <img src={asset.cover_url} alt="" /> : <span>▣</span>}</div><div className="registry-copy"><div className="asset-title-row"><div><strong>{asset.name}</strong><small>{asset.asset_tag}</small></div><StatusBadge status={asset.status}/></div><p>{asset.asset_type} · {asset.facility || 'No facility'}{asset.contents ? ` · ${asset.contents}` : ''}</p><span className="lifecycle-mini">{asset.dna?.lifecycle_status || 'Active'}</span><div className="asset-meta"><span>Health <b>{asset.health_score}</b></span><span>Last <b>{formatDate(asset.last_inspection_date)}</b></span><span>Next <b>{formatDate(asset.next_inspection_date)}</b></span></div></div></button><button className="secondary-button inspect-card-button" onClick={() => onInspect(asset)}>Start inspection</button></article>)}</section>}
  </div>
}
