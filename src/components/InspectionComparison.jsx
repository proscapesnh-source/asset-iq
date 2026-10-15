import { formatDate } from '../lib/data'

function findingNames(inspection) {
  return [...new Set((inspection?.photos || []).flatMap((photo) => photo.ai_correction?.defects || photo.ai_analysis?.defects || []))]
}

export default function InspectionComparison({ inspections }) {
  if (inspections.length < 2) return null
  const current = inspections[0], previous = inspections[1]
  const delta = Number(current.health_score) - Number(previous.health_score)
  const previousFindings = findingNames(previous)
  const newFindings = findingNames(current).filter((item) => !previousFindings.includes(item))
  return <section className="panel inspection-comparison">
    <div className="section-header"><div><p className="eyebrow">Inspection comparison</p><h2>What changed since the last inspection</h2></div><span className={delta < 0 ? 'comparison-delta worse' : delta > 0 ? 'comparison-delta better' : 'comparison-delta'}>{delta > 0 ? '+' : ''}{delta} health points</span></div>
    <div className="comparison-columns">{[current, previous].map((inspection, index) => <article key={inspection.id}><small>{index === 0 ? 'LATEST' : 'PREVIOUS'} · {formatDate(inspection.inspected_at)}</small><strong>{inspection.condition} · {inspection.health_score}/100</strong><p>{inspection.notes || 'No overall notes recorded.'}</p>{inspection.photos?.[0] && <figure><img src={inspection.photos[0].url} alt=""/><figcaption>{inspection.photos[0].title || inspection.photos[0].category}</figcaption></figure>}</article>)}</div>
    <div className="comparison-summary"><strong>{delta < 0 ? 'Condition declined' : delta > 0 ? 'Condition improved' : 'Health score unchanged'}</strong><span>{newFindings.length ? `New verified/AI findings: ${newFindings.join(', ')}` : 'No newly classified findings were recorded.'}</span></div>
  </section>
}
