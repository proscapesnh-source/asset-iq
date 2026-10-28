import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function OrganizationInvitation({ token, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [staleLink, setStaleLink] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return
      if (authError) setError(authError.message)
      else setAccountEmail(data?.user?.email || '')
    })
    return () => { active = false }
  }, [])

  const accept = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('')
    setStaleLink(false)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error('Sign in with the email address that received this invitation.')
      const { error: acceptError } = await supabase.rpc('accept_org_invitation', { p_token: token })
      if (acceptError) throw acceptError
      setMessage('Request sent. Your supervisor can now approve you.')
    } catch (err) {
      const detail = err.message || 'Unable to accept invitation.'
      if (/Invitation unavailable|Already a member/i.test(detail)) setStaleLink(true)
      setError(detail.includes('another email address')
        ? 'You are signed into a different email. Sign out and sign in with the email that received this invitation.'
        : detail)
    } finally {
      setBusy(false)
    }
  }

  const switchAccount = async () => {
    setBusy(true)
    setError('')
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      // Keep the invite token in the URL so sign-in returns to this invitation.
      window.location.reload()
    } catch (err) {
      setError(err.message || 'Unable to switch accounts.')
      setBusy(false)
    }
  }

  return <main className="setup-error"><section>
    <h1>Join your crew</h1>
    <p>Use the email your supervisor invited. Tap Join Crew below. Your supervisor will approve access next.</p>
    {accountEmail && <p><strong>Signed in as:</strong> {accountEmail}</p>}
    {error && <p role="alert" className="error-message">{error}</p>}
    {message && <p role="status">{message}</p>}
    <button type="button" className="primary-button" disabled={busy || !!message} onClick={accept}>
      {busy ? 'Checking invitation…' : 'JOIN CREW'}
    </button>
    <button type="button" className="secondary-button" disabled={busy || (!message && !staleLink)} onClick={onDone}>{staleLink ? 'Go to my jobs' : 'Continue to PolyShield'}</button>
    {!message && <button type="button" className="secondary-button" disabled={busy} onClick={switchAccount}>Wrong email? Switch account</button>}
  </section></main>
}
