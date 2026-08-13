import ReportHeader from './ReportHeader'
import ExecutiveSummary from './ExecutiveSummary'
import FindingsTable from './FindingsTable'
import PhotoGallery from './PhotoGallery'
import Recommendations from './Recommendations'
import AssetRecord from './AssetRecord'
import ReportFooter from './ReportFooter'
import { formatDate } from '../lib/data'

export default function ReportTemplate({ asset, inspection, organizationName, organizationProfile, inspectorEmail, onClose, onReportGenerated }) {
  if (!inspection) return null
  const passportUrl = `${window.location.origin}${window.location.pathname}?asset=${asset.id}`
  const printReport = async (kind = 'pdf') => {
    try { await onReportGenerated?.(inspection, kind) } catch (error) { console.warn('Report activity log:', error) }
    window.print()
  }
  return <div className="report-screen-v2">
    <div className="report-toolbar-v2 no-print"><button className="back-button" onClick={onClose}>← Asset record</button><div><span className="report-save-hint">Choose “Save as PDF” in the print dialog</span><button className="secondary-button" onClick={() => printReport('print')}>Print</button><button className="primary-button" onClick={() => printReport('pdf')}>Generate PDF</button></div></div>
    <article className="inspection-report-v2">
      <ReportHeader asset={asset} inspection={inspection} passportUrl={passportUrl} organizationProfile={organizationProfile}/>
      <ExecutiveSummary asset={asset} inspection={inspection} organizationName={organizationName}/>
      <section className="report-meta-strip"><div><small>Inspector</small><strong>{inspectorEmail || 'Signed-in inspector'}</strong></div><div><small>Inspection date</small><strong>{formatDate(inspection.inspected_at)}</strong></div><div><small>Liner present</small><strong>{inspection.liner_present}</strong></div><div><small>Next inspection</small><strong>{formatDate(asset.next_inspection_date)}</strong></div></section>
      <FindingsTable inspection={inspection}/>
      <PhotoGallery inspection={inspection}/>
      <Recommendations asset={asset} inspection={inspection}/>
      <AssetRecord asset={asset} organizationName={organizationName}/>
      <ReportFooter asset={asset} inspection={inspection} inspectorEmail={inspectorEmail}/>
    </article>
  </div>
}
