import { actionTimeline, recommendationFor } from './reportModel'

export default function Recommendations({ asset, inspection }) {
  const timeline = actionTimeline(inspection, asset)
  return <section className="report-section-v2">
    <div className="report-section-title"><span>04</span><div><p className="eyebrow">Recommended actions</p><h2>Maintenance plan</h2></div></div>
    <div className="recommendation-summary"><strong>{inspection.action_required}</strong><p>{recommendationFor(inspection)}</p></div>
    <div className="action-timeline">{timeline.map(([when, action]) => <div key={when}><span>{when}</span><p>{action}</p></div>)}</div>
  </section>
}
