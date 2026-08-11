import { formatDate } from '../lib/data'

export default function SupervisorDashboard({ data, role }) {
  const allowed = ['owner','admin','manager','supervisor'].includes(role)
  if (!allowed) return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow">Operations accountability</p><h1>Supervisor</h1><p>This view is available to organization supervisors and administrators.</p></div></div></div>
  const overdue = (data.assets || []).filter(a => a.next_inspection_date && a.next_inspection_date < new Date().toISOString().slice(0,10))
  const open = (data.workOrders || []).filter(w => w.status !== 'Complete')
  return <div className="page-stack">
    <div className="page-heading"><div><p className="eyebrow">Operations accountability</p><h1>Supervisor dashboard</h1><p>Inspection status, maintenance follow-through, and a permanent activity trail.</p></div></div>
    <section className="metric-grid"><article><strong>{overdue.length}</strong><span>Overdue inspections</span></article><article><strong>{open.length}</strong><span>Open work orders</span></article><article><strong>{data.inspections?.length || 0}</strong><span>Recent inspections</span></article><article><strong>{data.activity?.length || 0}</strong><span>Recent logged actions</span></article></section>
    <section className="panel"><div className="section-header"><div><p className="eyebrow">Attention required</p><h2>Overdue inspections</h2></div></div>{!overdue.length ? <p className="muted">No overdue inspections.</p> : <div className="activity-list">{overdue.map(a => <article key={a.id}><span className="activity-dot"/><div><strong>{a.name}</strong><p>{a.asset_tag} · due {formatDate(a.next_inspection_date)}</p></div></article>)}</div>}</section>
    <section className="panel"><div className="section-header"><div><p className="eyebrow">Audit trail</p><h2>Who did what, and when</h2></div></div>{!data.activity?.length ? <p className="muted">No activity has been logged in v1.8 yet.</p> : <div className="activity-list">{data.activity.map(item => <article key={item.id}><span className="activity-dot"/><div><strong>{item.summary}</strong><p>{item.event_type.replaceAll('_',' ')} · {new Date(item.created_at).toLocaleString()}</p><small>{item.metadata?.email || 'Organization user'}</small></div></article>)}</div>}</section>
  </div>
}
