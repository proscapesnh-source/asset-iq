import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/data'

export default function SupervisorDashboard({ data, role, organizationId }) {
  const [technicians, setTechnicians] = useState([])
  const [email, setEmail] = useState('')
  const [teamError, setTeamError] = useState('')
  const [teamMessage, setTeamMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingFeedback, setPendingFeedback] = useState([])
  const [reviewError, setReviewError] = useState('')
  const loadFeedback = async () => { const { data: items, error } = await supabase.rpc('pending_ai_feedback', { p_organization_id: organizationId }); if (error) throw error; setPendingFeedback(items || []) }
  useEffect(() => { if (!organizationId) return; loadFeedback().catch(error => setReviewError(error.message)) }, [organizationId])
  const reviewFeedback = async (id, approve) => { setBusy(true); setReviewError(''); try { const { error } = await supabase.rpc('review_ai_feedback', { p_feedback_id: id, p_approve: approve }); if (error) throw error; await loadFeedback() } catch (error) { setReviewError(error.message) } finally { setBusy(false) } }
  const refreshTechnicians = async () => {
    const { data: rows, error } = await supabase.rpc('list_technicians', { p_organization_id: organizationId })
    if (error) throw error
    setTechnicians(rows || [])
  }
  useEffect(() => { if (!organizationId) return; let active = true; supabase.rpc('list_technicians', { p_organization_id: organizationId }).then(({ data: rows, error }) => { if (!active) return; if (error) setTeamError(error.message); else setTechnicians(rows || []) }); return () => { active = false } }, [organizationId])
  const addTechnician = async (event) => {
    event.preventDefault(); if (busy) return
    setBusy(true); setTeamError(''); setTeamMessage('')
    try {
      const { error } = await supabase.rpc('manage_technician', { p_organization_id: organizationId, p_action: 'add', p_email: email.trim() })
      if (error) throw error
      await refreshTechnicians(); setEmail(''); setTeamMessage('Technician access granted.')
    } catch (error) { setTeamError(error.message) } finally { setBusy(false) }
  }
  const removeTechnician = async (member) => {
    if (busy || !window.confirm(`Remove ${member.member_email} from this organization? Their account and inspection history will remain intact.`)) return
    setBusy(true); setTeamError(''); setTeamMessage('')
    try {
      const { error } = await supabase.rpc('manage_technician', { p_organization_id: organizationId, p_action: 'remove', p_member_id: member.member_id })
      if (error) throw error
      await refreshTechnicians(); setTeamMessage('Technician access removed.')
    } catch (error) { setTeamError(error.message) } finally { setBusy(false) }
  }
  const allowed = ['owner','admin','manager','supervisor'].includes(role)
  if (!allowed) return <div className="page-stack"><div className="page-heading"><div><p className="eyebrow">Operations accountability</p><h1>Supervisor</h1><p>This view is available to organization supervisors and administrators.</p></div></div></div>
  const overdue = (data.assets || []).filter(a => a.next_inspection_date && a.next_inspection_date < new Date().toISOString().slice(0,10))
  const open = (data.workOrders || []).filter(w => w.status !== 'Complete')
  return <div className="page-stack">
    <div className="page-heading"><div><p className="eyebrow">Operations accountability</p><h1>Supervisor dashboard</h1><p>Inspection status, maintenance follow-through, and a permanent activity trail.</p></div></div>
    <section className="metric-grid"><article><strong>{overdue.length}</strong><span>Overdue inspections</span></article><article><strong>{open.length}</strong><span>Open work orders</span></article><article><strong>{data.inspections?.length || 0}</strong><span>Recent inspections</span></article><article><strong>{data.activity?.length || 0}</strong><span>Recent logged actions</span></article></section>
    <section className="panel"><div className="section-header"><div><p className="eyebrow">AI quality control</p><h2>Review technician corrections ({pendingFeedback.length})</h2></div></div><p className="muted">Only approved corrections enter the AI learning library. Confirm each against the inspection record before approval.</p>{reviewError && <p role="alert">{reviewError}</p>}{!pendingFeedback.length ? <p className="muted">No corrections awaiting approval.</p> : <div className="activity-list">{pendingFeedback.map(item => <article key={item.feedback_id}><div><strong>{item.corrected_analysis?.title || 'Inspection correction'}</strong><p>{item.correction_note || 'Technician supplied corrected inspection findings.'}</p><p><b>Original:</b> {item.original_analysis?.summary || 'Not provided'}</p><p><b>Corrected:</b> {item.corrected_analysis?.summary || 'Not provided'}</p><small>{new Date(item.created_at).toLocaleString()}</small></div><div><button type="button" className="secondary-button" disabled={busy} onClick={() => reviewFeedback(item.feedback_id,true)}>Approve</button><button type="button" className="danger-text" disabled={busy} onClick={() => reviewFeedback(item.feedback_id,false)}>Reject</button></div></article>)}</div>}</section>
    <section className="panel"><div className="section-header"><div><p className="eyebrow">Team access</p><h2>Manage technicians</h2></div></div>
      <p className="muted">Add existing PolyShield accounts by email, or remove technician access without deleting their inspection history. New technicians must create their account first.</p>
      <form className="form-stack" onSubmit={addTechnician}><label>Technician email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="technician@company.com" /></label><button className="primary-button" disabled={busy || !organizationId}>{busy ? 'Saving…' : 'Add technician'}</button></form>
      {teamError && <p role="alert">{teamError}</p>}{teamMessage && <p role="status">{teamMessage}</p>}
      <div className="activity-list">{technicians.length ? technicians.map(member => <article key={member.member_id}><div><strong>{member.member_email}</strong><p>{member.member_role === 'inspector' ? 'Inspector / technician' : 'Technician'}</p></div><button type="button" className="secondary-button" disabled={busy} onClick={() => removeTechnician(member)}>Remove</button></article>) : <p className="muted">No technicians assigned yet.</p>}</div>
    </section>
    <section className="panel"><div className="section-header"><div><p className="eyebrow">Attention required</p><h2>Overdue inspections</h2></div></div>{!overdue.length ? <p className="muted">No overdue inspections.</p> : <div className="activity-list">{overdue.map(a => <article key={a.id}><span className="activity-dot"/><div><strong>{a.name}</strong><p>{a.asset_tag} · due {formatDate(a.next_inspection_date)}</p></div></article>)}</div>}</section>
    <section className="panel"><div className="section-header"><div><p className="eyebrow">Audit trail</p><h2>Who did what, and when</h2></div></div>{!data.activity?.length ? <p className="muted">No activity has been logged in v1.8 yet.</p> : <div className="activity-list">{data.activity.map(item => <article key={item.id}><span className="activity-dot"/><div><strong>{item.summary}</strong><p>{item.event_type.replaceAll('_',' ')} · {new Date(item.created_at).toLocaleString()}</p><small>{item.metadata?.email || 'Organization user'}</small></div></article>)}</div>}</section>
  </div>
}
