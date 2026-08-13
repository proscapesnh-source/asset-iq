import { QRCodeSVG } from 'qrcode.react'
import { formatDate } from '../lib/data'
import { reportNumber } from './reportModel'

export default function ReportHeader({ asset, inspection, passportUrl, organizationProfile }) {
  const number = reportNumber(asset, inspection)
  return <>
    <header className="report-header-v2">
      <div className="report-brand-v2">
        {organizationProfile?.logo_url ? <img className="report-customer-logo" src={organizationProfile.logo_url} alt="Organization logo"/> : <div className="report-logo-v2">PS</div>}
        <div><strong>{organizationProfile?.report_display_name || organizationProfile?.name || 'PolyShield'}</strong><span>{organizationProfile?.logo_url ? 'Powered by PolyShield Asset IQ' : 'Asset IQ'}</span></div>
      </div>
      <div className="report-id-v2">
        <p>INSPECTION REPORT</p>
        <strong>{number}</strong>
        <span>{formatDate(inspection.inspected_at)}</span>
      </div>
      <div className="report-qr-v2"><QRCodeSVG value={passportUrl} size={78}/><small>Scan for live asset passport</small></div>
    </header>
    <div className="report-rule"/>
  </>
}
