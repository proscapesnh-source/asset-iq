export default function HealthRing({ value, label = 'Service health' }) {
  return (
    <div className="health-ring" style={{ '--health': value }} aria-label={`${label}: ${value}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
