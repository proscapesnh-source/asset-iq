import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getAuthRedirectUrl, getLinkedAssetId } from '../lib/auth'

export default function AuthScreen({ recovery = false, onRecoveryComplete }) {
  const customerSignup = new URLSearchParams(window.location.search).get('signup') === 'customer'
  const [mode, setMode] = useState(recovery ? 'recovery' : customerSignup ? 'signup' : 'signin')
  const [form, setForm] = useState({ fullName: '', companyName: '', email: '', password: '', confirmPassword: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const linkedAssetId = getLinkedAssetId()

  useEffect(() => { if (recovery) setMode('recovery') }, [recovery])

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
        if (error) throw error
      } else if (mode === 'signup') {
        if (!form.fullName.trim() || !form.companyName.trim()) throw new Error('Enter your name and company name.')
        if (form.password.length < 8) throw new Error('Password must be at least 8 characters.')
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
            data: { full_name: form.fullName.trim(), company_name: form.companyName.trim() },
          },
        })
        if (error) throw error
        if (!data.session) setMessage(`Account created. Check your email to confirm it${linkedAssetId ? '; your scanned asset will open automatically afterward.' : '.'}`)
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), { redirectTo: getAuthRedirectUrl() })
        if (error) throw error
        setMessage('Password reset email sent. Open the link in that email to choose a new password.')
      } else if (mode === 'recovery') {
        if (form.password.length < 8) throw new Error('Password must be at least 8 characters.')
        if (form.password !== form.confirmPassword) throw new Error('Passwords do not match.')
        const { error } = await supabase.auth.updateUser({ password: form.password })
        if (error) throw error
        setMessage('Password updated. You are signed in.')
        onRecoveryComplete?.()
      }
    } catch (error) {
      setMessage(error.message || 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'forgot' ? 'Reset password' : mode === 'recovery' ? 'Choose new password' : mode === 'signup' && customerSignup ? 'Create your company workspace' : 'Asset IQ'
  const buttonText = mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Update password'

  return <main className="auth-page"><section className="auth-card">
    <div className="brand-mark">PS</div><p className="eyebrow">POLYSHIELD</p><h1>{title}</h1>
    <p className="muted">{linkedAssetId && mode !== 'recovery' ? 'Sign in or create an account and PolyShield will return you to the asset you scanned.' : mode === 'signup' && customerSignup ? 'Register your company to get a private PolyShield Asset IQ workspace. Your assets, inspections and team records are separate from other customers.' : 'Inspection, lifecycle, and maintenance intelligence for critical assets.'}</p>
    <form className="form-stack" onSubmit={submit}>
      {mode === 'signup' && <><label>Full name<input autoComplete="name" required value={form.fullName} onChange={(e)=>setForm({...form,fullName:e.target.value})}/></label><label>Company / organization<input autoComplete="organization" required value={form.companyName} onChange={(e)=>setForm({...form,companyName:e.target.value})}/></label></>}
      {mode !== 'recovery' && <label>Email<input type="email" autoComplete="email" required value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/></label>}
      {(mode === 'signin' || mode === 'signup' || mode === 'recovery') && <label>{mode === 'recovery' ? 'New password' : 'Password'}<input type="password" minLength="8" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})}/></label>}
      {mode === 'recovery' && <label>Confirm new password<input type="password" minLength="8" autoComplete="new-password" required value={form.confirmPassword} onChange={(e)=>setForm({...form,confirmPassword:e.target.value})}/></label>}
      <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : buttonText}</button>
    </form>
    {message && <div className="info-message">{message}</div>}
    {mode === 'signin' && <button className="text-button" onClick={()=>{setMode('forgot');setMessage('')}}>Forgot your password?</button>}
    {mode !== 'recovery' && <button className="text-button" onClick={()=>{setMode(mode === 'signup' ? 'signin' : 'signup');setMessage('')}}>{mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Create one'}</button>}
    {mode === 'signup' && customerSignup && <p className="muted">After registering, verify your email if prompted. Your private organization is created when you first sign in. If your company already has a workspace, ask its administrator for an invitation instead.</p>}
    {mode === 'forgot' && <button className="text-button" onClick={()=>{setMode('signin');setMessage('')}}>Back to sign in</button>}
  </section></main>
}
