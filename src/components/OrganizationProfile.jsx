import { useEffect, useState } from 'react'

export default function OrganizationProfile({ organization, canManage, onSave }) {
  const [displayName, setDisplayName] = useState(organization?.report_display_name || organization?.name || '')
  const [logoFile, setLogoFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(()=>setDisplayName(organization?.report_display_name || organization?.name || ''),[organization])
  if (!canManage) return null
  const submit = async (e) => { e.preventDefault(); setBusy(true); setError(''); try { await onSave({ report_display_name:displayName }, logoFile); setLogoFile(null) } catch(err){ setError(err.message || 'Could not save organization branding.') } finally { setBusy(false) } }
  return <section className="panel"><div className="section-header"><div><p className="eyebrow">Report branding</p><h2>Organization identity</h2><p className="muted">This logo and display name appear automatically on generated inspection reports.</p></div>{organization?.logo_url && <img className="organization-logo-preview" src={organization.logo_url} alt="Organization logo"/>}</div><form className="form-grid" onSubmit={submit}><label>Report display name<input value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label><label>Organization logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setLogoFile(e.target.files?.[0]||null)}/></label>{error&&<div className="error-message full-width">{error}</div>}<div className="form-actions full-width"><button className="primary-button" disabled={busy}>{busy?'Saving…':'Save branding'}</button></div></form></section>
}
