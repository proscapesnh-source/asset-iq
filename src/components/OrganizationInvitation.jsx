import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function OrganizationInvitation({ token, onDone }) {
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const accept=async()=>{
    setBusy(true);setError('')
    const {error:e}=await supabase.rpc('accept_org_invitation',{p_token:token})
    if(e) setError(e.message)
    else setMessage('Invitation accepted. A supervisor must approve your membership before organization access is granted.')
    setBusy(false)
  }
  return <main className="setup-error"><section><h1>PolyShield organization invitation</h1><p>Accept this invitation to request membership. A supervisor must approve access. Your existing training credentials remain yours.</p>{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}<button className="primary-button" disabled={busy||!!message} onClick={accept}>{busy?'Accepting…':'Accept invitation'}</button><button className="secondary-button" onClick={onDone}>Continue to PolyShield</button></section></main>
}