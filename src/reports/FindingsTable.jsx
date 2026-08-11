import { buildFindings } from './reportModel'

export default function FindingsTable({ inspection }) {
  const findings = buildFindings(inspection)
  return <section className="report-section-v2">
    <div className="report-section-title"><span>02</span><div><p className="eyebrow">Inspection findings</p><h2>Recorded observations</h2></div></div>
    <div className="findings-table-wrap"><table className="findings-table"><thead><tr><th>Area / component</th><th>Condition / observation</th><th>Severity</th><th>Recommended action</th></tr></thead><tbody>{findings.map((item) => <tr key={item.id}><td>{item.component}</td><td>{item.condition}</td><td><strong>{item.severity}</strong></td><td>{item.recommendation}</td></tr>)}</tbody></table></div>
    {inspection.notes && <div className="inspector-note"><small>Inspector overall notes</small><p>{inspection.notes}</p></div>}
  </section>
}
