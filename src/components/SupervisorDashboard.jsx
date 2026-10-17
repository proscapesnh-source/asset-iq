import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/data'

export default function SupervisorDashboard({ data, role, organizationId, onOpenAsset }) {
  const [technicians, setTechnicians] = useState([])
  const [email, setEmail] = useState('')
  const [requests,setRequests] = useState([])
  const [inviteLink,setInviteLink] = useState('')
  const [inviteEmail,setInviteEmail] = useState('')
  const [inviteFormOpen, setInviteFormOpen] = useState(false)
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
  const refreshRequests = async () => {
    const { data, error } = await supabase.rpc('list_org_join_requests', { p_org:organizationId })
    if (error) throw error
    setRequests(data || [])
  }
  useEffect(() => { if (organizationId) refreshRequests().catch(e => setTeamError(e.message)) }, [organizationId])
  const sendInvite = async (event) => {
    event.preventDefault();setBusy(true);setTeamError('');setTeamMessage('');setInviteLink('')
    try {
      const { data:token,error }=await supabase.rpc('create_org_invitation',{p_org:organizationId,p_email:inviteEmail.trim()})
      if(error)throw error
      const link=new URL(window.location.origin)
      link.searchParams.set('invite',token)
      setInviteLink(link.toString())
      setInviteEmail('')
      setInviteFormOpen(false)
      setTeamMessage('Invitation link created. Share it privately with the invited technician. Membership requires their acceptance and supervisor approval.')
      await refreshRequests()
    }catch(e){setTeamError(e.message)}finally{setBusy(false)}
  }
  const reopenInvitation = async (item) => {
    if (busy) return
    setBusy(true); setTeamError(''); setTeamMessage(''); setInviteLink('')
    try {
      const { data: token, error } = await supabase.rpc('get_org_invitation_token', { p_org: organizationId, p_id: item.id })
      if (error) throw error
      if (!token) throw new Error('Pending invitation not found.')
      const link = new URL(window.location.origin)
      link.searchParams.set('invite', token)
      setInviteLink(link.toString())
      setTeamMessage(`Invitation for ${item.requested_email} reopened. Use Share by text / phone, choose Messages, then send it from your phone.`)
    } catch (error) { setTeamError(error.message) } finally { setBusy(false) }
  }
  const reviewRequest = async (id,approve) => {
    if (!approve && !window.confirm('Cancel this invitation or decline this membership request?')) return
    setBusy(true);setTeamError('');setTeamMessage('');setInviteLink('')
    try {
      const {error}=await supabase.rpc('review_org_join_request',{p_id:id,p_approve:approve})
      if(error)throw error
      await Promise.all([refreshRequests(),refreshTechnicians()])
      setTeamMessage(approve?'Membership approved.':'Request rejected.')
    }catch(e){setTeamError(e.message)}finally{setBusy(false)}
  }
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
  const awaitingAcceptance = requests.filter(item => item.kind === 'invitation')
  const awaitingApproval = requests.filter(item => item.kind !== 'invitation')
  const overdue = (data.assets || []).filter(a => a.next_inspection_date && a.next_inspection_date < new Date().toISOString().slice(0,10))
  const open = (data.workOrders || []).filter(w => w.status !== 'Complete')
  return <div className="page-stack">
    <style>{`
      .invitation-dashboard > .section-header { flex-wrap: wrap; gap: 16px; }
      .invitation-groups { display: grid; gap: 20px; margin-top: 24px; }
      .invitation-count { display: inline-block; padding: 2px 9px; border-radius: 20px; background: #e8eef5; color: #263b50; font-size: 13px; margin-left: 6px; }
      .invitation-list { display: grid; gap: 10px; }
      .invitation-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; border: 1px solid #dce4ed; border-radius: 12px; padding: 16px; }
      .invitation-person { display: grid; gap: 7px; min-width: 0; }
      .invitation-person strong { overflow-wrap: anywhere; }
      .invitation-person small { color: #627487; }
      .invitation-status { width: fit-content; border-radius: 20px; background: #f1f4f8; color: #536477; font-size: 12px; padding: 4px 9px; }
      .invitation-status.ready { color: #126348; background: #e3f4ed; }
      .invitation-actions { display: flex; gap: 8px; flex-wrap: wrap; flex-shrink: 0; }
      .invitation-empty { padding: 16px; border-radius: 10px; background: #f5f8fb; color: #627487; }
      .invitation-waiting { border-top: 1px solid #dce4ed; padding-top: 18px; }
      .invitation-waiting summary { cursor: pointer; font-weight: 600; padding: 8px 0; }
      .invitation-share { margin-top: 18px; padding: 16px; border: 1px solid #cbdceb; border-radius: 12px; background: #f5f9fc; }
      .invitation-share > button { margin: 10px 8px 0 0; }
      @media(max-width: 640px) { .invitation-row { align-items: stretch; flex-direction: column; } .invitation-actions > button { flex: 1; } }
    `}</style>
    <div className="page-heading"><div><p className="eyebrow">Operations accountability</p><h1>Supervisor dashboard</h1><p>Inspection status, maintenance follow-through, and a permanent activity trail.</p></div></div>
    <section className="metric-grid"><article><strong>{overdue.length}</strong><span>Overdue inspections</span></article><article><strong>{open.length}</strong><span>Open work orders</span></article><article><strong>{data.inspections?.length || 0}</strong><span>Recent inspections</span></article><article><strong>{data.activity?.length || 0}</strong><span>Recent logged actions</span></article></section>
    <section className="panel invitation-dashboard">
      <div className="section-header"><div><p className="eyebrow">Team access</p><h2>Technician invitations</h2><p className="muted">{awaitingApproval.length} ready for approval · {awaitingAcceptance.length} waiting to accept</p></div><button type="button" className="primary-button" aria-expanded={inviteFormOpen} onClick={()=>setInviteFormOpen(!inviteFormOpen)}>{inviteFormOpen ? 'Close form' : '+ Invite technician'}</button></div>
      {inviteFormOpen && <form className="form-stack" onSubmit={sendInvite}><label>Technician email<input type="email" required value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="technician@company.com" /></label><button className="primary-button" disabled={busy}>Create invitation link</button></form>}
      {inviteLink&&<div className="invitation-share"><div className="section-header"><strong>Share invitation</strong><button type="button" className="secondary-button" onClick={()=>{setInviteLink('');setTeamMessage('')}}>Close</button></div><label>Private invitation link<input readOnly value={inviteLink} onFocus={e=>e.target.select()} /></label><button type="button" className="secondary-button" onClick={()=>Promise.resolve().then(()=>navigator.clipboard.writeText(inviteLink)).then(()=>setTeamMessage('Invitation link copied.')).catch(()=>setTeamError('Copy failed; select the link to copy manually.'))}>Copy link</button><button type="button" className="secondary-button" onClick={async()=>{const message='You are invited to join an organization on PolyShield Asset IQ. Sign in with your invited email to accept: '+inviteLink;try{if(navigator.share){await navigator.share({title:'PolyShield invitation',text:message})}else{window.location.href='sms:?&body='+encodeURIComponent(message)}}catch(e){if(e.name!=='AbortError')setTeamError('Unable to share. Copy the invitation link instead.')}}}>Share by text / phone</button><p className="muted">Choose Messages in your phone’s share menu, select the recipient, then tap Send. This does not automatically send an email or text.</p></div>}
      {teamError && <p role="alert">{teamError}</p>}{teamMessage && <p role="status">{teamMessage}</p>}
      <div className="invitation-groups">
        <section><h3>Ready for approval <span className="invitation-count">{awaitingApproval.length}</span></h3><p className="muted">These technicians have requested access.</p>
          {!awaitingApproval.length ? <p className="invitation-empty">You’re all caught up. No requests to review.</p> : <div className="invitation-list">{awaitingApproval.map(item=><article className="invitation-row" key={item.id}><div className="invitation-person"><strong>{item.requested_email || 'Technician'}</strong><small>Requested {formatDate(item.created_at)}</small><span className="invitation-status ready">Ready for review</span></div><div className="invitation-actions"><button type="button" className="primary-button" disabled={busy} onClick={()=>reviewRequest(item.id,true)}>Approve</button><button type="button" className="secondary-button" disabled={busy} onClick={()=>reviewRequest(item.id,false)}>Decline</button></div></article>)}</div>}
        </section>
        <details className="invitation-waiting"><summary>Waiting to accept <span className="invitation-count">{awaitingAcceptance.length}</span></summary><p className="muted">No action needed until they accept. Reopen an invitation to share it again.</p>
          {!awaitingAcceptance.length ? <p className="invitation-empty">No outstanding invitations.</p> : <div className="invitation-list">{awaitingAcceptance.map(item=><article className="invitation-row" key={item.id}><div className="invitation-person"><strong>{item.requested_email}</strong><small>Created {formatDate(item.created_at)}</small><span className="invitation-status">Awaiting acceptance</span></div><div className="invitation-actions"><button type="button" className="secondary-button" disabled={busy} onClick={()=>reopenInvitation(item)}>Reopen invitation</button><button type="button" className="danger-text" disabled={busy} onClick={()=>reviewRequest(item.id,false)}>Cancel invitation</button></div></article>)}</div>}
        </details>
      </div>
      <details><summary>Manage existing technicians</summary><form className="form-stack" onSubmit={addTechnician}><label>Technician email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="technician@company.com" /></label><button className="primary-button" disabled={busy || !organizationId}>{busy ? 'Saving…' : 'Add technician'}</button></form>
      <div className="activity-list">{technicians.length ? technicians.map(member => <article key={member.member_id}><div><strong>{member.member_email}</strong><p>{member.member_role === 'inspector' ? 'Inspector / technician' : 'Technician'}</p></div><button type="button" className="secondary-button" disabled={busy} onClick={() => removeTechnician(member)}>Remove</button></article>) : <p className="muted">No technicians assigned yet.</p>}</div></details>
    </section>
    <section className="panel"><div className="section-header"><div><p className="eyebrow">AI quality control</p><h2>Review technician corrections ({pendingFeedback.length})</h2></div></div><p className="muted">Only approved corrections enter the AI learning library. Confirm each against the inspection record before approval.</p>{reviewError && <p role="alert">{reviewError}</p>}{!pendingFeedback.length ? <p className="muted">No corrections awaiting approval.</p> : <div className="activity-list">{pendingFeedback.map(item => <article key={item.feedback_id}><div><strong>{item.corrected_analysis?.title || 'Inspection correction'}</strong><p>{item.correction_note || 'Technician supplied corrected inspection findings.'}</p><p><b>Original:</b> {item.original_analysis?.summary || 'Not provided'}</p><p><b>Corrected:</b> {item.corrected_analysis?.summary || 'Not provided'}</p><small>{new Date(item.created_at).toLocaleString()}</small></div><div><button type="button" className="secondary-button" disabled={busy} onClick={() => reviewFeedback(item.feedback_id,true)}>Approve</button><button type="button" className="danger-text" disabled={busy} onClick={() => reviewFeedback(item.feedback_id,false)}>Reject</button></div></article>)}</div>}</section>
    <section className="panel"><div className="section-header"><div><p className="eyebrow">Attention required</p><h2>Overdue inspections</h2></div></div>{!overdue.length ? <p className="muted">No overdue inspections.</p> : <div className="activity-list">{overdue.map(a => <article key={a.id}><span className="activity-dot"/><div><strong>{a.name}</strong><p>{a.asset_tag} · due {formatDate(a.next_inspection_date)}</p><button type="button" className="secondary-button" onClick={() => onOpenAsset?.(a)}>Open asset</button></div></article>)}</div>}</section>
    <section className="panel"><div className="section-header"><div><p className="eyebrow">Audit trail</p><h2>Who did what, and when</h2></div></div>{!data.activity?.length ? <p className="muted">No activity has been logged in v1.8 yet.</p> : <div className="activity-list">{data.activity.map(item => <article key={item.id}><span className="activity-dot"/><div><strong>{item.summary}</strong><p>{item.event_type.replaceAll('_',' ')} · {new Date(item.created_at).toLocaleString()}</p><small>{item.metadata?.email || 'Organization user'}</small></div></article>)}</div>}</section>
  </div>
}
