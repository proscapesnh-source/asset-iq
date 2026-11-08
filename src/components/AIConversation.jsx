import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { parseLayoutCommand, WIDGETS } from './AICommand'

const ROOT='https://tntbijxtaatsycluiude.supabase.co/functions/v1/zoho-assistant-jobs'
const EMAIL=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const ROLES=['technician','maintenance','viewer','supervisor']
const startMessage={speaker:'assistant',text:'What can I help with? You can ask me to invite a crew member, find a job in Zoho, or change your dashboard.'}
const item=(speaker,text)=>({speaker,text})
function normalizeRole(text) {
 const m=ROLES.find(r=>new RegExp('\\b'+r+'\\b','i').test(text))
 return m||'technician'
}
function looksLikeZoho(text){return /\bzoho\b|\bimport\b.+\b(job|project|deal)\b|\bbring\b.+\b(job|project)\b/i.test(text)}
function looksLikeInvite(text){return /\b(invite|invitation|add worker|add crew|join link)\b/i.test(text)}
function projectSearch(text){
 return text.replace(/^(please\s+)?(can you\s+)?(find|search for|look up|bring|import|pull|get|show me)\s*/i,'')
 .replace(/\b(from|in|into|over from)\s+zoho\b/ig,'')
 .replace(/\b(zoho|crm|jobsite|job|project|deal)\b/ig,'')
 .replace(/\b(to|into)\s+polyshield\b/ig,'').trim().replace(/^[\s,.:;-]+|[\s,.:;-]+$/g,'')
}
async function zohoRequest(organizationId,body){
 const {data:{session},error:sessionError}=await supabase.auth.getSession()
 if(sessionError||!session?.access_token)throw new Error('Sign in again to access Zoho.')
 const res=await fetch(ROOT,{method:'POST',headers:{
  'Content-Type':'application/json',Authorization:'Bearer '+session.access_token
 },body:JSON.stringify({organization_id:organizationId,...body})})
 const data=await res.json().catch(()=>({}))
 if(!res.ok)throw new Error(data.error||'Zoho request failed')
 return data
}
export default function AIConversation({organizationId,role,current,onApplied,onClose,onNavigate}){
 const allowed=role==='owner'||role==='supervisor'
 const [messages,setMessages]=useState([startMessage])
 const [draft,setDraft]=useState('')
 const [pending,setPending]=useState(null)
 const [awaiting,setAwaiting]=useState(null)
 const [results,setResults]=useState([])
 const [busy,setBusy]=useState(false)
 const [listening,setListening]=useState(false)
 const [error,setError]=useState('')
 const [invitationLink,setInvitationLink]=useState('')
 const recognition=useRef(null)
 const threadEnd=useRef(null)
 useEffect(()=>()=>recognition.current?.abort(),[])
 useEffect(()=>{threadEnd.current?.scrollIntoView?.({behavior:'smooth',block:'nearest'})},[messages,pending])
 if(!allowed)return null
 const say=(text)=>setMessages(m=>[...m,item('assistant',text)])
 const speak=()=>{
  setError('')
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition
  if(!Speech){setError('Voice recognition is unavailable in this browser. Type your request instead.');return}
  recognition.current?.abort()
  const rec=new Speech()
  rec.lang=navigator.language||'en-US'
  rec.interimResults=false
  rec.onresult=e=>setDraft(e.results[0][0].transcript)
  rec.onerror=e=>setError('Microphone: '+e.error)
  rec.onend=()=>setListening(false)
  recognition.current=rec
  try{rec.start();setListening(true)}catch{setError('Microphone could not start.')}
 }
 const planInvite=(text,initial=null)=>{
  const email=text.match(EMAIL)?.[0]||initial?.email
  const requestedRole=normalizeRole(text)
  const selectedRole=initial?.role&&requestedRole==='technician'&&!/\btechnician\b/i.test(text)?initial.role:requestedRole
  if(!email){
   setAwaiting({kind:'invite',role:selectedRole})
   say('What is the worker’s email address? I’ll prepare a private invitation link, then you can send it by text or email.')
   return
  }
  if(selectedRole==='supervisor'&&role!=='owner'){
   say('Only an owner can issue supervisor invitations. I can prepare technician, maintenance, or viewer invitations.')
   return
  }
  setAwaiting(null);setInvitationLink('')
  setPending({kind:'invite',email,role:selectedRole})
  say('I can prepare a '+selectedRole+' invitation for '+email+'. Review it below and confirm. The worker still needs to accept the invitation and receive approval before project assignment.')
 }
 const searchZoho=async(term)=>{
  if(!term||term.length<2){setAwaiting({kind:'zoho'});say('Which customer or job name should I look up in Zoho?');return}
  setAwaiting(null);setPending(null);setResults([]);setBusy(true)
  say('Searching Zoho for “'+term+'” …')
  try{
   const result=await zohoRequest(organizationId,{mode:'search',search:term})
   setResults(result.matches||[])
   if(!result.matches?.length)say('No matching Zoho jobs were found in the available records. Try another part of the name.')
   else say('I found '+result.matches.length+' matching job'+(result.matches.length===1?'':'s')+'. Select the correct one. Only jobs at the Purchase Order Received stage can be imported.')
   if(result.limited)say('Zoho has more pages than I searched. Refine the name if the job is missing.')
  }catch(e){say('I could not search Zoho: '+e.message)}
  finally{setBusy(false)}
 }
 const handleText=async(text)=>{
  const phrase=text.trim()
  if(!phrase||busy)return
  setDraft('');setError('');setResults([])
  setMessages(m=>[...m,item('user',phrase)])
  if(awaiting?.kind==='invite'){planInvite(phrase,awaiting);return}
  if(awaiting?.kind==='zoho'){await searchZoho(phrase);return}
  if(looksLikeInvite(phrase)){planInvite(phrase);return}
  if(looksLikeZoho(phrase)){await searchZoho(projectSearch(phrase));return}
  const layout=parseLayoutCommand(phrase,current.widgets)
  if(layout&&/\b(dashboard|show|hide|remove|add|include|display|reset|simplify|jobs|timesheets|inspections|assets|approvals|work orders)\b/i.test(phrase)){
   setPending({kind:'layout',widgets:layout,version:current.version,command:phrase})
   say('Here is the dashboard layout I would apply. Review the sections before confirming.')
   return
  }
  say('I can help invite a worker, search and import an eligible Zoho job, or customize your dashboard. Try “Invite Corey as a technician” or “Find New Tech Mechanical in Zoho.”')
 }
 const selectDeal=(d)=>{
  setResults([])
  if(!d.importable){say('“'+d.name+'” is at stage '+d.stage+'. Import is limited to Purchase Order Received jobs, so I have not changed anything.');return}
  if(role!=='owner'){say('I found “'+d.name+'”. A PolyShield owner must confirm the Zoho import. I have not imported it.');return}
  setPending({kind:'zoho',deal:d})
  say('I found “'+d.name+'” at Purchase Order Received. Confirm to import just this job into Owner Review. It will not schedule work or change Zoho.')
 }
 const confirm=async()=>{
  if(!pending||busy)return
  setBusy(true);setError('')
  const action=pending
  try{
   if(action.kind==='invite'){
    const {data,error:e}=await supabase.rpc('create_org_invitation',{
     p_org:organizationId,p_email:action.email,p_role:action.role
    })
    if(e)throw e
    const link=new URL(window.location.origin+window.location.pathname)
    link.searchParams.set('invite',data)
    setInvitationLink(link.toString())
    say('Invitation link created for '+action.email+'. It has NOT been sent. Use Share or Copy below; membership requires acceptance and approval.')
   }else if(action.kind==='zoho'){
    const result=await zohoRequest(organizationId,{mode:'import',deal_id:action.deal.id})
    say(result.existing?'“'+result.project.title+'” is already in PolyShield. No duplicate was created.':'Imported “'+result.project.title+'” into Owner Review. It is not scheduled or active.')
   }else if(action.kind==='layout'){
    const {data,error:e}=await supabase.rpc('apply_ai_dashboard_layout',{
     p_organization_id:organizationId,p_widgets:action.widgets,
     p_expected_version:action.version,p_command:action.command
    })
    if(e)throw e
    onApplied({widgets:action.widgets,version:data})
    say('Dashboard changes saved. You can ask me to change them again anytime.')
   }
   setPending(null)
  }catch(e){setError(e.message||'Action failed; no success confirmed.')}
  finally{setBusy(false)}
 }
 const share=async()=>{
  if(!invitationLink)return
  const text='You are invited to join PolyShield Asset IQ. Sign in with your invited email to accept: '+invitationLink
  try{
   if(navigator.share)await navigator.share({title:'PolyShield crew invitation',text})
   else await navigator.clipboard.writeText(text)
  }catch(e){if(e.name!=='AbortError')setError('Sharing failed; copy the link manually.')}
 }
 return <section className="panel ai-command-panel" role="region" aria-label="PolyShield conversational assistant">
  <div className="section-header"><div><p className="eyebrow">Owners and Supervisors</p><h2>✦ PolyShield Assistant</h2></div><button type="button" className="secondary-button" onClick={onClose}>Close</button></div>
  <p className="muted">Talk or type naturally. I’ll help prepare actions and show a confirmation before changing records. No invitations are sent automatically.</p>
  <div role="log" aria-label="Assistant conversation" aria-live="polite" style={{maxHeight:330,overflowY:'auto',display:'grid',gap:10,margin:'14px 0'}}>
   {messages.map((m,i)=><div key={i} style={{justifySelf:m.speaker==='user'?'end':'start',maxWidth:'92%',background:m.speaker==='user'?'#e7f4ed':'var(--surface-secondary,#f4f6f8)',color:'#17352b',borderRadius:12,padding:'10px 12px',whiteSpace:'pre-wrap'}}><strong style={{display:'block',fontSize:12,marginBottom:4}}>{m.speaker==='user'?'You':'PolyShield'}</strong>{m.text}</div>)}
   <div ref={threadEnd}/>
  </div>
  {results.length>0&&<div className="panel"><h3>Zoho job matches</h3><div className="activity-list">{results.map(d=><article key={d.id}><div><strong>{d.name}</strong><p>{d.stage||'Unknown stage'}</p></div><button className="secondary-button" type="button" onClick={()=>selectDeal(d)}>{d.importable?'Review import':'View status'}</button></article>)}</div></div>}
  {pending&&<div className="panel" style={{marginBottom:12}}>
   <h3>Confirm action</h3>
   {pending.kind==='invite'&&<p>Prepare a <strong>{pending.role}</strong> invitation link for <strong>{pending.email}</strong>. This does not send the link or assign a job.</p>}
   {pending.kind==='zoho'&&<p>Import <strong>{pending.deal.name}</strong> (Zoho ID {pending.deal.id}) into Owner Review. Zoho will remain unchanged.</p>}
   {pending.kind==='layout'&&<><p>Your dashboard will display:</p><div className="quick-grid">{pending.widgets.map(id=><article key={id}><strong>{WIDGETS[id].label}</strong></article>)}</div></>}
   <div style={{display:'flex',gap:8,marginTop:10}}>
    <button className="primary-button" disabled={busy} type="button" onClick={confirm}>{busy?'Working…':'Confirm'}</button>
    <button className="secondary-button" disabled={busy} type="button" onClick={()=>{setPending(null);say('Cancelled. No changes made.')}}>Cancel</button>
   </div>
  </div>}
  {invitationLink&&<div className="panel" style={{marginBottom:12}}><strong>Private invitation link</strong><input readOnly value={invitationLink} onFocus={e=>e.target.select()}/><div style={{display:'flex',gap:8,marginTop:8}}><button type="button" className="secondary-button" onClick={share}>Share by phone</button><button type="button" className="secondary-button" onClick={()=>navigator.clipboard.writeText(invitationLink).catch(()=>setError('Copy unavailable. Select the text above.'))}>Copy link</button></div></div>}
  {error&&<p role="alert" className="error-banner">{error}</p>}
  <form onSubmit={e=>{e.preventDefault();handleText(draft)}} style={{display:'grid',gap:8}}>
   <label htmlFor="assistant-message">Message</label>
   <textarea id="assistant-message" rows={2} maxLength={500} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Invite a technician, find a Zoho job, or change my dashboard" />
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
    <button type="button" className="secondary-button" onClick={speak} disabled={busy}>{listening?'🎤 Listening…':'🎤 Speak'}</button>
    <button type="submit" className="primary-button" disabled={busy||!draft.trim()}>Send message</button>
    <button type="button" className="secondary-button" onClick={()=>onNavigate('projects')}>Open Projects</button>
   </div>
  </form>
 </section>
}
