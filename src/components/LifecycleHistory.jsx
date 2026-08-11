import { useEffect, useState } from 'react'
import { formatDate } from '../lib/data'

const statuses = ['Active','Out of Service','Decommissioned','Sold / Transferred','Replaced','Retired / Scrapped']
const types = ['Status Change','Sale / Transfer','Decommissioned','Returned to Service','Replaced','Retired / Scrapped','Ownership Note']
const empty = () => ({ event_date:new Date().toISOString().slice(0,10), event_type:'Status Change', lifecycle_status:'Active', previous_owner:'', new_owner:'', counterparty:'', reason:'', disposition:'', replacement_asset_tag:'', notes:'' })

function Field({label,children}){ return <label>{label}{children}</label> }

export default function LifecycleHistory({ asset, dna, events=[], onSaveStatus, onAddEvent }){
  const [adding,setAdding]=useState(false), [busy,setBusy]=useState(false), [error,setError]=useState(''), [event,setEvent]=useState(empty())
  const currentStatus=dna?.lifecycle_status || 'Active'
  useEffect(()=>setEvent(v=>({...v,lifecycle_status:currentStatus})),[currentStatus])
  const change=(k,v)=>setEvent(x=>({...x,[k]:v}))
  const add=async()=>{setBusy(true);setError('');try{await onAddEvent(event);setEvent(empty());setAdding(false)}catch(e){setError(e.message||'Could not save lifecycle event.')}finally{setBusy(false)}}
  const quickStatus=async(status)=>{setBusy(true);setError('');try{await onSaveStatus(status);await onAddEvent({...empty(),event_type:'Status Change',lifecycle_status:status,reason:`Lifecycle status changed to ${status}.`})}catch(e){setError(e.message||'Could not update lifecycle status.')}finally{setBusy(false)}}
  return <section className="panel lifecycle-panel">
    <div className="section-header"><div><p className="eyebrow">Lifecycle & ownership</p><h2>Vessel lifecycle</h2><p className="muted">The physical asset keeps its history even when it leaves service, is replaced, or changes ownership.</p></div><button className="primary-button" onClick={()=>setAdding(!adding)}>＋ Lifecycle event</button></div>
    <div className="lifecycle-status-row"><div><small>Current lifecycle status</small><strong>{currentStatus}</strong></div><div className="lifecycle-status-actions">{statuses.map(s=><button key={s} disabled={busy||s===currentStatus} className={s===currentStatus?'choice active':'choice'} onClick={()=>quickStatus(s)}>{s}</button>)}</div></div>
    {error&&<div className="error-message">{error}</div>}
    {adding&&<div className="dna-event-form"><h3>Add lifecycle / ownership event</h3><div className="form-grid">
      <Field label="Date"><input type="date" value={event.event_date} onChange={e=>change('event_date',e.target.value)}/></Field>
      <Field label="Event"><select value={event.event_type} onChange={e=>change('event_type',e.target.value)}>{types.map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Resulting status"><select value={event.lifecycle_status} onChange={e=>change('lifecycle_status',e.target.value)}>{statuses.map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Previous owner"><input value={event.previous_owner} onChange={e=>change('previous_owner',e.target.value)} placeholder="Unknown is OK"/></Field>
      <Field label="New owner"><input value={event.new_owner} onChange={e=>change('new_owner',e.target.value)} placeholder="If transferred"/></Field>
      <Field label="Buyer / receiving party"><input value={event.counterparty} onChange={e=>change('counterparty',e.target.value)}/></Field>
      <Field label="Reason"><input value={event.reason} onChange={e=>change('reason',e.target.value)} placeholder="Sale, end of service, failure, upgrade…"/></Field>
      <Field label="Disposition"><input value={event.disposition} onChange={e=>change('disposition',e.target.value)} placeholder="Stored, sold, scrapped, relocated…"/></Field>
      <Field label="Replacement asset tag"><input value={event.replacement_asset_tag} onChange={e=>change('replacement_asset_tag',e.target.value)} placeholder="Optional link to replacement"/></Field>
    </div><Field label="Handover / lifecycle notes"><textarea rows="3" value={event.notes} onChange={e=>change('notes',e.target.value)} placeholder="Record final condition, transfer details, open work, documentation supplied, or other handover facts."/></Field><div className="section-actions"><button className="secondary-button" onClick={()=>setAdding(false)}>Cancel</button><button className="primary-button" disabled={busy} onClick={add}>{busy?'Saving…':'Save lifecycle event'}</button></div></div>}
    <div className="lifecycle-timeline">{!events.length?<p className="muted">No lifecycle or ownership events recorded yet.</p>:events.map(item=><article key={item.id}><div className="dna-date"><strong>{formatDate(item.event_date)}</strong><small>{item.lifecycle_status}</small></div><div><strong>{item.event_type}</strong><p>{item.reason || item.disposition || 'Lifecycle event recorded'}</p>{(item.previous_owner||item.new_owner)&&<small>{item.previous_owner||'Unknown previous owner'} → {item.new_owner||'Unknown new owner'}</small>}{item.replacement_asset_tag&&<span className="baseline-badge">Replacement: {item.replacement_asset_tag}</span>}{item.notes&&<p className="lifecycle-note">{item.notes}</p>}</div></article>)}</div>
  </section>
}
