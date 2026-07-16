const items = [
  ['dashboard', '⌂', 'Home'],
  ['assets', '▣', 'Assets'],
  ['inspect', '＋', 'Inspect'],
  ['projects', '◇', 'Projects'],
]

export default function AppShell({ title, activeView, onNavigate, children }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="brand-kicker">PolyShield</p>
          <h1>Asset IQ</h1>
          <p className="header-title">{title}</p>
        </div>
        <button className="profile-button" type="button">MD</button>
      </header>

      <main className="app-content">{children}</main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {items.map(([id, icon, label]) => (
          <button
            key={id}
            type="button"
            className={activeView === id ? 'bottom-nav-item active' : 'bottom-nav-item'}
            onClick={() => onNavigate(id)}
          >
            <span>{icon}</span>
            <small>{label}</small>
          </button>
        ))}
      </nav>
    </div>
  )
}
