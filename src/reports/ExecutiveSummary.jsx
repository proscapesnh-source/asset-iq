import HealthRing from '../components/HealthRing'
import { conditionSummary, riskFromInspection, serviceOutlook } from './reportModel'

export default function ExecutiveSummary({ asset, inspection, organizationName }) {
  const risk = riskFromInspection(inspection)
  return <section className="report-section-v2 report-executive">
    <div className="report-section-title"><span>01</span><div><p className="eyebrow">Executive summary</p><h2>Asset condition assessment</h2></div></div>
    <div className="executive-layout">
      <div className="executive-copy"><h1>{asset.name}</h1><p className="asset-subtitle">{asset.asset_tag} · {asset.asset_type} · {organizationName || 'Organization'}</p><p className="report-lead-v2">{conditionSummary(inspection, asset)}</p></div>
      <HealthRing value={inspection.health_score}/>
    </div>
    <div className="summary-kpis">
      <div><small>Overall condition</small><strong>{inspection.condition}</strong></div>
      <div><small>Risk level</small><strong className={`risk-text ${risk.className}`}>{risk.level}</strong></div>
      <div><small>Action required</small><strong>{inspection.action_required}</strong></div>
      <div><small>Health score</small><strong>{inspection.health_score}/100</strong></div>
    </div>
    <div className={`priority-banner ${risk.className}`}><small>Repair priority</small><strong>{risk.level} — {risk.priority}</strong></div>
    <div className="service-outlook"><small>Service-life outlook</small><p>{serviceOutlook(inspection)}</p></div>
  </section>
}
