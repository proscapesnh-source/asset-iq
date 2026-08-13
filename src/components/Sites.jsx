import { useMemo, useState } from 'react'

const blank = { name:'', site_code:'', address:'', city:'', state:'', postal_code:'', contact_name:'', contact_email:'', contact_phone:'', notes:'' }

export default function Sites({ sites = [], assets = [], canManage = false, onCreate, onOpenAssets }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const counts = useMemo(() => {
    const map = new Map()
    for (const asset of assets) if (asset.site_id) map.set(asset.site_id, (map.get(asset.site_id) || 0) + 1)
    return map
  }, [assets])
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try { await onCreate(form); setForm(blank); setShowForm(false) }
    catch (err) { setError(err.message || 'Could not create site.') }
    finally { setBusy(false) }
  }
  return <div className="page-stack">
    <div className="page-heading"><div><p className="eyebrow">Organization network</p><h1>Sites</h1><p>Manage facilities under one organization and share repair intelligence across locations.</p></div>{canManage && <button className="primary-button" onClick={() => setShowForm(!showForm)}>＋ Add site</button>}</div>
    {showForm && <form className="panel form-grid" onSubmit={submit}><label>Site name *<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Site code<input value={form.site_code} onChange={e=>setForm({...form,site_code:e.target.value})}/></label><label>Address<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><label>City<input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label><label>State<input value={form.state} onChange={e=>setForm({...form,state:e.target.value})}/></label><label>ZIP<input value={form.postal_code} onChange={e=>setForm({...form,postal_code:e.target.value})}/></label><label>Site contact<input value={form.contact_name} onChange={e=>setForm({...form,contact_name:e.target.value})}/></label><label>Contact email<input type="email" value={form.contact_email} onChange={e=>setForm({...form,contact_email:e.target.value})}/></label><label className="full-width">Notes<textarea rows="3" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>{error && <div className="error-message full-width">{error}</div>}<div className="form-actions full-width"><button type="button" className="secondary-button" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy?'Saving…':'Create site'}</button></div></form>}
    {!sites.length ? <section className="panel empty-state"><strong>No formal sites yet</strong><p>Add the first facility. Existing asset facility names can be migrated automatically by the v2.4 SQL migration.</p></section> : <section className="site-grid">{sites.map(site => <article className="panel site-card" key={site.id}><div><p className="eyebrow">{site.site_code || 'Site'}</p><h2>{site.name}</h2><p>{[site.city,site.state].filter(Boolean).join(', ') || site.address || 'Location not recorded'}</p></div><div className="site-card-actions"><strong>{counts.get(site.id) || 0} assets</strong><button className="secondary-button" onClick={()=>onOpenAssets(site.id)}>View assets</button></div></article>)}</section>}
  </div>
}
