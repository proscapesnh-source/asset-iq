import { useMemo, useState, useEffect } from 'react'
import StatusBadge from './StatusBadge'
import { formatDate } from '../lib/data'

export default function AssetsRegistry({ assets, sites = [], initialFilter = null, initialSiteId = 'All', canAdd = false, canInspect = false, onAdd, onOpen, onInspect }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [lifecycle, setLifecycle] = useState('All')
  const [siteId, setSiteId] = useState(initialSiteId || 'All')
  const [smartFilter, setSmartFilter] = useState(initialFilter || null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  useEffect(()=>setSmartFilter(initialFilter || null),[initialFilter])
  useEffect(()=>setSiteId(initialSiteId || 'All'),[initialSiteId])
  const filtered = useMemo(() => assets.filter((asset) => {
    const haystack = `${asset.name} ${asset.asset_tag} ${asset.facility || ''} ${asset.asset_type || ''}`.toLowerCase()
    const active = !asset.dna?.lifecycle_status || ['Active','Out of Service'].includes(asset.dna.lifecycle_status)
    const attention = (asset.health_score || 0) < 80 || ['Monitor','Repair','Critical'].includes(asset.status)
    return haystack.includes(query.toLowerCase()) && (status === 'All' || asset.status === status) && (lifecycle === 'All' || (asset.dna?.lifecycle_status || 'Active') === lifecycle) && (siteId === 'All' || asset.site_id === siteId) && (!smartFilter || (smartFilter === 'active' ? active : attention))
  }), [assets, query, status, lifecycle, siteId, smartFilter])

  return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow">Asset registry</p><h1>{smartFilter === 'attention' ? 'Assets needing attention' : smartFilter === 'active' ? 'Active assets' : 'Assets'}</h1><p>Search and open asset passports across the organization.</p></div>{canAdd && <button className="primary-button" onClick={onAdd}>＋ Add asset</button>}</div>
    <section className="panel" style={{display:'grid',gap:12}}>
      <label>Find an asset<input type="search" placeholder="Search name, tag or facility" value={query} onChange={(e)=>setQuery(e.target.value)}/></label>
      <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <button type="button" className="secondary-button" aria-expanded={advancedOpen} onClick={()=>setAdvancedOpen(v=>!v)}>{advancedOpen?'Hide filters':'More filters'}</button>
        <span className="muted">{filtered.length} asset{filtered.length===1?'':'s'} shown</span>
        {smartFilter&&<button type="button" className="text-button" onClick={()=>setSmartFilter(null)}>Clear dashboard filter</button>}
      </div>
      {advancedOpen&&<div className="filters">
        <label>Site<select value={siteId} onChange={e=>setSiteId(e.target.value)}><option value="All">All sites</option>{sites.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Condition<select value={status} onChange={e=>setStatus(e.target.value)}><option>All</option><option>Good</option><option>Monitor</option><option>Repair</option><option>Critical</option></select></label>
        <label>Lifecycle<select value={lifecycle} onChange={e=>setLifecycle(e.target.value)}><option>All</option><option>Active</option><option>Out of Service</option><option>Decommissioned</option><option>Sold / Transferred</option><option>Replaced</option><option>Retired / Scrapped</option></select></label>
        <button type="button" className="secondary-button" onClick={()=>{setSiteId('All');setStatus('All');setLifecycle('All');setSmartFilter(null)}}>Reset filters</button>
      </div>}
    </section>
    {!filtered.length ? <section className="panel empty-state"><strong>No matching assets</strong><p>Try another search or filter.</p></section> : <section className="asset-grid">{filtered.map((asset) => <article className="registry-card" key={asset.id}><button className="registry-open" onClick={() => onOpen(asset)}><div className="registry-image">{asset.cover_url ? <img src={asset.cover_url} alt="" /> : <span>▣</span>}</div><div className="registry-copy"><div className="asset-title-row"><div><strong>{asset.name}</strong><small>{asset.asset_tag}</small></div><StatusBadge status={asset.status}/></div><p>{asset.asset_type} · {asset.facility || 'No facility'}{asset.contents ? ` · ${asset.contents}` : ''}</p><span className="lifecycle-mini">{asset.dna?.lifecycle_status || 'Active'}</span><div className="asset-meta"><span>Health <b>{asset.health_score}</b></span><span>Last <b>{formatDate(asset.last_inspection_date)}</b></span><span>Next <b>{formatDate(asset.next_inspection_date)}</b></span></div></div></button>{canInspect && <button className="secondary-button inspect-card-button" onClick={() => onInspect(asset)}>Start inspection</button>}</article>)}</section>}
  </div>
}
