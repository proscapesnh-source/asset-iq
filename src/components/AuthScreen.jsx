import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthScreen() {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ fullName: '', companyName: '', email: '', password: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: { data: { full_name: form.fullName.trim(), company_name: form.companyName.trim() } },
        })
        if (error) throw error
        if (!data.session) setMessage('Account created. Check your email to confirm it, then return here and sign in.')
      }
    } catch (error) {
      setMessage(error.message || 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark">PS</div>
        <p className="eyebrow">POLYSHIELD</p>
        <h1>Asset IQ</h1>
        <p className="muted">Inspection, lifecycle, and maintenance intelligence for critical assets.</p>
        <form className="form-stack" onSubmit={submit}>
          {mode === 'signup' && <>
            <label>Full name<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
            <label>Company / organization<input required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></label>
          </>}
          <label>Email<input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input type="password" minLength="8" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
        </form>
        {message && <div className="info-message">{message}</div>}
        <button className="text-button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage('') }}>
          {mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  )
}
