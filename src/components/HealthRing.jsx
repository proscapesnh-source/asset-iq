export default function HealthRing({ value = 0, size = 'normal' }) {
  const safe = Math.max(0, Math.min(100, Math.round(value || 0)))
  return <div className={`health-ring ${size}`} style={{ '--score': `${safe * 3.6}deg` }}><div><strong>{safe}</strong><small>Health</small></div></div>
}
