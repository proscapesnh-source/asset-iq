export default function StatusBadge({ status = 'Unknown' }) {
  const key = status.toLowerCase().replace(/\s+/g, '-')
  return <span className={`status-badge ${key}`}>{status}</span>
}
