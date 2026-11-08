import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export const DEFAULT_WIDGETS = ['projects','approvals','timesheets','attention','work_orders']
export const WIDGETS = {
  projects: { label:'Projects & crews', description:'Active jobs and assignments' },
  approvals: { label:'Crew approvals', description:'Review requests and exceptions' },
  timesheets: { label:'Timesheets', description:'Correct and export crew hours' },
  attention: { label:'Assets needing attention', description:'Assets flagged for review' },
  work_orders: { label:'Open work orders', description:'Outstanding maintenance work' },
}
const aliases = {
  projects: /\b(jobs?|projects?|crews?|assignments?)\b/i,
  approvals: /\b(approvals?|requests?|exceptions?)\b/i,
  timesheets: /\b(timesheets?|hours?|clock|payroll|time)\b/i,
  attention: /\b(assets?|inspections?|attention|equipment|tanks?)\b/i,
  work_orders: /\b(work orders?|maintenance|repairs?)\b/i,
}
export function parseLayoutCommand(text, previous=DEFAULT_WIDGETS) {
  const phrase = text.trim()
  if (!phrase) return null
  const chosen = Object.keys(aliases).filter(id => aliases[id].test(phrase))
  if (/\b(reset|default|restore original)\b/i.test(phrase)) return [...DEFAULT_WIDGETS]
  if (!chosen.length) return null
  if (/\b(hide|remove|exclude)\b/i.test(phrase)) {
    const remaining = previous.filter(id => !chosen.includes(id))
    return remaining.length ? remaining : null
  }
  if (/\b(add|include)\b/i.test(phrase)) return [...new Set([...previous,...chosen])]
  if (/\b(only|just|show|display|simplify|make my dashboard)\b/i.test(phrase)) return chosen
  return chosen
}
export async function loadDashboardPreferences(organizationId) {
  const { data,error } = await supabase.from('ai_dashboard_preferences')
    .select('widgets,version').eq('organization_id',organizationId).maybeSingle()
  if (error) throw error
  return { widgets: data?.widgets || [...DEFAULT_WIDGETS],version: data?.version || 1 }
}
export default function AICommand({ organizationId, role, current, onApplied, onClose }) {
  const allowed = role === 'owner' || role === 'supervisor'
  const [command,setCommand] = useState('')
  const [proposal,setProposal] = useState(null)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [listening,setListening] = useState(false)
  const speech = useRef(null)
  useEffect(() => () => { if (speech.current) speech.current.abort() },[])
  if (!allowed) return null
  const beginVoice = () => {
    setError('')
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) { setError('Voice recognition is not supported on this browser. Type your request instead.'); return }
    if (speech.current) speech.current.abort()
    const recognition = new Recognition()
    recognition.lang = navigator.language || 'en-US'
    recognition.interimResults = false
    recognition.onresult = e => { setCommand(e.results[0][0].transcript);setProposal(null) }
    recognition.onerror = e => setError('Microphone unavailable: ' + e.error)
    recognition.onend = () => setListening(false)
    speech.current = recognition
    try { recognition.start();setListening(true) } catch { setError('Could not start microphone.') }
  }
  const preview = () => {
    setError('')
    const widgets=parseLayoutCommand(command,current.widgets)
    if (!widgets) {setError('Try saying “Show jobs, timesheets, and inspections” or “Hide work orders.”');return}
    setProposal(widgets)
  }
  const apply = async () => {
    if (!proposal || busy) return
    setBusy(true);setError('')
    try {
      const { data,error:rpcError } = await supabase.rpc('apply_ai_dashboard_layout',{
        p_organization_id:organizationId,p_widgets:proposal,p_expected_version:current.version,p_command:command
      })
      if (rpcError) throw rpcError
      onApplied({widgets:proposal,version:data})
      setProposal(null);setCommand('')
      onClose()
    } catch(e) {setError(e.message || 'Could not save settings. Nothing was changed.')}
    finally {setBusy(false)}
  }
  return <section className="panel ai-command-panel" role="dialog" aria-label="PolyShield AI Command">
    <div className="section-header"><div><p className="eyebrow">Owner / Supervisor only</p><h2>✦ PolyShield AI Command</h2></div><button type="button" className="secondary-button" onClick={onClose}>Close</button></div>
    <p className="muted">Tell PolyShield which dashboard sections to display. Preview first, then confirm. Only dashboard layout is changed.</p>
    <label htmlFor="ai-command-request">Dashboard request</label>
    <textarea id="ai-command-request" rows={2} maxLength={500} value={command} onChange={e=>{setCommand(e.target.value);setProposal(null)}} placeholder="Show projects, timesheets, and inspections" />
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
      <button type="button" className="secondary-button" aria-pressed={listening} onClick={beginVoice} disabled={busy}>{listening?'Listening…':'🎤 Speak'}</button>
      <button type="button" className="primary-button" onClick={preview} disabled={busy || !command.trim()}>Preview change</button>
    </div>
    {error && <p role="alert" className="error-banner">{error}</p>}
    {proposal && <div className="panel" style={{marginTop:12}}>
      <h3>Preview — not yet saved</h3>
      <div className="quick-grid">{proposal.map(id=><article key={id} className="metric-card-button"><strong>{WIDGETS[id].label}</strong><small>{WIDGETS[id].description}</small></article>)}</div>
      <p className="muted">This updates only your dashboard in this organization. No project, employee, payroll, or inspection records will be modified.</p>
      <button type="button" className="primary-button" disabled={busy} onClick={apply}>{busy?'Saving…':'Confirm and apply'}</button>
      <button type="button" className="secondary-button" disabled={busy} onClick={()=>setProposal(null)} style={{marginLeft:8}}>Cancel</button>
    </div>}
  </section>
}
