import { reportNumber } from './reportModel'

export default function ReportFooter({ asset, inspection, inspectorEmail }) {
  return <>
    <section className="report-signoff">
      <div><p className="eyebrow">Inspector sign-off</p><strong>{inspectorEmail || 'Signed-in inspector'}</strong><span>Digitally recorded with this inspection</span></div>
      <div><small>Inspection record</small><strong>{reportNumber(asset, inspection)}</strong></div>
    </section>
    <footer className="report-footer-v2"><div><strong>PolyShield Asset IQ</strong><span>Digital inspection and lifecycle record</span></div><div><span>Generated {new Date().toLocaleDateString()}</span><span>Visual inspection findings should be verified with appropriate testing when structural integrity is in question.</span></div></footer>
  </>
}
