import { useEffect, useState } from 'react'
import InstallApp from './InstallApp'

export default function AppShell({ organizationName, userEmail, role, active, onNavigate, onSignOut, children }) {
  const [online, setOnline] = useState(navigator.onLine)

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

  const items = [
    ['dashboard', '⌂', 'Dashboard'],
    ['assets', '▣', 'Assets'],
    ['sites', '⌖', 'Sites'],
    ['inspect', '＋', 'Inspect'],
    ['work', '◇', 'Work Orders'],
    ['knowledge', '✦', 'Knowledge'],
    ...(['owner','admin','manager','supervisor'].includes(role) ? [['supervisor', '◎', 'Supervisor']] : []),
  ]

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="side-brand"><span>PS</span><div><strong>PolyShield</strong><small>Asset IQ</small></div></div>
        <nav>
          {items.map(([id, icon, label]) => <button key={id} className={active === id ? 'nav-button active' : 'nav-button'} onClick={() => onNavigate(id)}><span>{icon}</span>{label}</button>)}
        </nav>
        <div className="side-footer">
          <span className={online ? "network-pill online" : "network-pill offline"}>{online ? "● Online" : "● Offline"}</span>
          <InstallApp />
          <small>{organizationName}</small>
          <strong>{userEmail}</strong>
          <button className="text-button light" onClick={onSignOut}>Sign out</button>
        </div>
      </aside>
      <div className="main-column">
        <header className="mobile-header">
          <div className="side-brand"><span>PS</span><div><strong>PolyShield</strong><small>Asset IQ</small></div></div>
          <div className="mobile-header-actions">
            <span className={online ? "network-dot online" : "network-dot offline"} title={online ? "Online" : "Offline"}></span>
            <InstallApp />
            <button className="text-button" onClick={onSignOut}>Sign out</button>
          </div>
        </header>
        <main className="content">{children}</main>
        <nav className="bottom-nav" style={{ '--nav-count': items.length }}>
          {items.map(([id, icon, label]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => onNavigate(id)}><span>{icon}</span><small>{label}</small></button>)}
        </nav>
      </div>
    </div>
  )
}
