import { useEffect, useState } from 'react'
import InstallApp from './InstallApp'
import PhotoSaveViewer from './PhotoSaveViewer'
import { allowedViews, workspaceLabel } from '../lib/roles'

export default function AppShell({ organizationName, userEmail, role, active, onNavigate, onSignOut, children }) {
  const [online, setOnline] = useState(navigator.onLine)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const allItems = [
    ['dashboard', '⌂', 'Dashboard'],
    ['assets', '▣', 'Assets'],
    ['sites', '⌖', 'Sites'],
    ['site-training', '♧', 'Site Safety'],
    ['inspect', '＋', 'Inspect'],
    ['work', '◇', 'Work Orders'],
    ['job-starts', '✓', 'Job Starts'],
    ['time-clock', '◷', 'Time Clock'],
    ['planning', '△', 'Planning'],
    ['knowledge', '✦', 'Knowledge'],
    ['supervisor', '◎', 'Supervisor'],
    ['integrations', '⇄', 'Integrations'],
    ['projects', '▤', 'Projects'],
  ]
  const allowed = allowedViews(role)
  const items = allItems.filter(([id]) => allowed.includes(id))
  const primaryIds = ['dashboard', 'assets', 'site-training', ...(allowed.includes('inspect') ? ['inspect'] : allowed.includes('work') ? ['work'] : [])]
  const primaryItems = items.filter(([id]) => primaryIds.includes(id)).slice(0, 4)
  const moreItems = items.filter(([id]) => !primaryItems.some(([primaryId]) => primaryId === id))
  const onNav = id => { setShowMore(false); onNavigate(id) }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="side-brand"><span>PS</span><div><strong>PolyShield</strong><small>Asset IQ</small></div></div>
        <nav>
          {items.map(([id, icon, label]) => <button key={id} className={active === id ? 'nav-button active' : 'nav-button'} onClick={() => onNav(id)}><span>{icon}</span>{label}</button>)}
        </nav>
        <div className="side-footer">
          <span className="workspace-pill">{workspaceLabel(role)}</span>
          <span className={online ? "network-pill online" : "network-pill offline"}>{online ? "● Online" : "● Offline"}</span>
          <InstallApp />
          <small>{organizationName}</small>
          <strong>{userEmail}</strong>
          <button className="text-button light" onClick={onSignOut}>Sign out</button>
        </div>
      </aside>
      <div className="main-column">
        <header className="mobile-header">
          <div className="side-brand"><span>PS</span><div><strong>PolyShield</strong><small>{workspaceLabel(role)}</small></div></div>
          <div className="mobile-header-actions">
            <span className={online ? "network-dot online" : "network-dot offline"} title={online ? "Online" : "Offline"}></span>
            <InstallApp />
            <button className="text-button" onClick={onSignOut}>Sign out</button>
          </div>
        </header>
        <main className="content">{children}</main>
        {showMore && <div className="panel" style={{ position:'fixed', bottom:75, left:12, right:12, zIndex:50, maxHeight:'55vh', overflowY:'auto', boxShadow:'0 0 24px #0003' }}><strong>More tools</strong><div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginTop:12}}>{moreItems.map(([id,icon,label])=><button type="button" key={id} className="secondary-button" style={{minHeight:52}} onClick={()=>onNav(id)}>{icon} {label}</button>)}</div></div>}
        <nav className="bottom-nav" style={{ '--nav-count': primaryItems.length + (moreItems.length ? 1 : 0) }}>
          {primaryItems.map(([id, icon, label]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => onNav(id)}><span>{icon}</span><small>{label}</small></button>)}
          {moreItems.length > 0 && <button type="button" className={showMore || moreItems.some(([id])=>id===active) ? 'active' : ''} aria-expanded={showMore} aria-label="More navigation options" onClick={()=>setShowMore(v=>!v)}><span>☰</span><small>More</small></button>}
        </nav>
      </div>
      <PhotoSaveViewer />
    </div>
  )
}
