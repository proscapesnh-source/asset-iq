import { QRCodeSVG } from 'qrcode.react'

export default function QRCodePanel({ asset }) {
  const passportUrl = `${window.location.origin}${window.location.pathname}?asset=${encodeURIComponent(asset.id)}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(passportUrl)
  }

  const downloadLabel = () => {
    const svg = document.querySelector(`#qr-${CSS.escape(asset.id)} svg`)
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${asset.id}-asset-iq-qr.svg`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="panel qr-panel">
      <div>
        <p className="eyebrow">QR asset access</p>
        <h2>Asset IQ Passport</h2>
        <p className="muted">Scan this code to open the permanent passport for this asset.</p>
      </div>

      <div id={`qr-${asset.id}`} className="qr-code-wrap">
        <QRCodeSVG value={passportUrl} size={180} level="H" includeMargin />
      </div>

      <div className="qr-id-block">
        <small>Permanent asset ID</small>
        <strong>{asset.id}</strong>
      </div>

      <div className="qr-actions">
        <button type="button" className="secondary-button" onClick={copyLink}>Copy passport link</button>
        <button type="button" className="primary-button" onClick={downloadLabel}>Download QR label</button>
      </div>
    </section>
  )
}
