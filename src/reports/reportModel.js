import { formatDate } from '../lib/data'

export function reportNumber(asset, inspection) {
  const date = new Date(inspection.inspected_at)
  const stamp = Number.isNaN(date.getTime()) ? 'UNDATED' : date.toISOString().slice(0, 10).replaceAll('-', '')
  const suffix = String(inspection.id || '').replaceAll('-', '').slice(0, 6).toUpperCase() || 'REPORT'
  return `PSR-${stamp}-${asset.asset_tag || 'ASSET'}-${suffix}`
}

export function riskFromInspection(inspection) {
  const score = Number(inspection.health_score ?? 0)
  const condition = String(inspection.condition || '').toLowerCase()
  const action = String(inspection.action_required || '').toLowerCase()
  if (condition === 'critical' || action.includes('engineering') || score < 25) return { level: 'Critical', className: 'critical', priority: 'Immediate action required' }
  if (condition === 'poor' || action === 'repair' || score < 50) return { level: 'High', className: 'high', priority: 'Repair planning required' }
  if (condition === 'fair' || action === 'monitor' || score < 75) return { level: 'Moderate', className: 'moderate', priority: 'Monitor and schedule maintenance' }
  return { level: 'Low', className: 'low', priority: 'Routine monitoring' }
}

export function serviceOutlook(inspection) {
  const risk = riskFromInspection(inspection)
  if (risk.level === 'Critical') return 'Serviceability requires prompt engineering review; remaining life is not established by visual inspection alone.'
  if (risk.level === 'High') return 'Near-term corrective maintenance should be planned; remaining life should be confirmed with appropriate testing.'
  if (risk.level === 'Moderate') return 'Continue scheduled monitoring and trend condition changes at the next inspection.'
  return 'No near-term service-life concern was identified from the recorded visual condition.'
}

export function recommendationFor(inspection) {
  const action = inspection.action_required || 'None'
  if (action === 'Engineering Review') return 'Engineering review is recommended before repair scope or continued-service decisions are finalized.'
  if (action === 'Repair') return 'Corrective repair is recommended. Document completed work and perform a follow-up inspection before returning the asset to normal service.'
  if (action === 'Monitor') return 'Continue monitoring the documented condition and compare findings at the next scheduled inspection.'
  return 'No immediate corrective action was recorded. Continue normal preventive maintenance and scheduled inspections.'
}

export function conditionSummary(inspection, asset) {
  const condition = (inspection.condition || 'unknown').toLowerCase()
  return `${asset.name} was assessed in ${condition} overall condition with a PolyShield health score of ${inspection.health_score}/100. ${recommendationFor(inspection)}`
}

export function buildFindings(inspection) {
  if (inspection.photos?.length) {
    return inspection.photos.map((photo, index) => ({
      id: photo.id || index,
      component: photo.title || photo.category || `Photo ${index + 1}`,
      condition: photo.notes || photo.annotation_note || inspection.condition || 'Recorded observation',
      severity: riskFromInspection(inspection).level,
      recommendation: photo.annotation_note || recommendationFor(inspection),
    }))
  }
  return [{
    id: 'overall',
    component: 'Overall asset',
    condition: inspection.notes || `${inspection.condition} overall condition`,
    severity: riskFromInspection(inspection).level,
    recommendation: recommendationFor(inspection),
  }]
}

export function actionTimeline(inspection, asset) {
  const risk = riskFromInspection(inspection)
  const nextInspection = formatDate(asset.next_inspection_date)
  if (risk.level === 'Critical') return [
    ['Immediate', 'Obtain engineering review and address conditions affecting safe continued service.'],
    ['30 days', 'Document corrective work and verify repaired areas with follow-up inspection.'],
    ['6 months', 'Trend repaired areas and confirm no renewed deterioration.'],
    ['Next inspection', nextInspection === 'Not recorded' ? 'Establish a formal inspection interval.' : `Scheduled for ${nextInspection}.`],
  ]
  if (risk.level === 'High') return [
    ['Immediate', 'Define corrective maintenance scope and protect deteriorated areas from further exposure.'],
    ['30 days', 'Complete or schedule repair work based on owner/engineer direction.'],
    ['6 months', 'Reinspect repaired or monitored locations.'],
    ['Next inspection', nextInspection === 'Not recorded' ? 'Establish a formal inspection interval.' : `Scheduled for ${nextInspection}.`],
  ]
  if (risk.level === 'Moderate') return [
    ['Immediate', 'Document and monitor the recorded condition.'],
    ['30 days', 'Review maintenance needs and incorporate them into planning.'],
    ['6 months', 'Compare condition if operating environment or service changes.'],
    ['Next inspection', nextInspection === 'Not recorded' ? 'Establish a formal inspection interval.' : `Scheduled for ${nextInspection}.`],
  ]
  return [
    ['Immediate', 'Continue normal preventive maintenance.'],
    ['30 days', 'No special action recorded.'],
    ['6 months', 'Continue routine observation during normal maintenance.'],
    ['Next inspection', nextInspection === 'Not recorded' ? 'Establish a formal inspection interval.' : `Scheduled for ${nextInspection}.`],
  ]
}
