import { QRCodeSVG } from 'qrcode.react'
import { formatDate } from '../lib/data'
import { reportNumber } from './reportModel'

export default function ReportHeader({ asset, inspection, passportUrl }) {
  const number = reportNumber(asset, inspection)
  return <>
    <header className="report-header-v2">
      <div className="report-brand-v2">
        <div className="report-logo-v2">PS</div>
        <div><strong>PolyShield</strong><span>Asset IQ</span></div>
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
