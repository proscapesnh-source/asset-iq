import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

const MATERIALS = [
  ['Industrial Vinyl Sticker', 'Fast field labeling; good for clean, dry surfaces.'],
  ['Laminated Outdoor Sticker', 'UV/weather resistant with protective laminate.'],
  ['Anodized Aluminum Plaque', 'Durable industrial tag for long-term service.'],
  ['Stainless Steel Plaque', 'Highest durability for harsh or washdown environments.'],
]

const SIZES = ['2 × 2 in','3 × 3 in','4 × 4 in','2 × 4 in']

export default function QRTagTools({ asset, organizationName, currentUrl, onOrder }) {
  const [showPrint, setShowPrint] = useState(false)
  const [showOrder, setShowOrder] = useState(false)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    material: 'Laminated Outdoor Sticker',
    size: '3 × 3 in',
    quantity: 1,
    include_asset_name: true,
    include_organization_name: true,
    notes: '',
  })

  const humanId = useMemo(() => asset.asset_tag || asset.id, [asset])

  const printTag = () => {
    setShowPrint(true)
    window.setTimeout(() => window.print(), 100)
  }

  const submitOrder = async (e) => {
    e.preventDefault()
    setBusy(true); setError(''); setSuccess('')
    try {
      await onOrder({
        ...form,
        quantity: Number(form.quantity) || 1,
        asset_name: asset.name,
        asset_tag: humanId,
        qr_url: currentUrl,
      })
      setSuccess('QR tag order request submitted.')
      setShowOrder(false)
    } catch (err) {
      setError(err.message || 'Could not submit QR tag order.')
    } finally { setBusy(false) }
  }

  return <>
    <div className="qr-tag-actions">
      <button className="secondary-button" onClick={printTag}>Print QR tag</button>
      <button className="primary-button" onClick={() => setShowOrder(true)}>Order QR tag</button>
    </div>
    <p className="muted qr-tag-note">Use a temporary field sticker immediately, then order a permanent plaque for long-term asset identification.</p>
    {success && <div className="success-message">{success}</div>}
    {error && <div className="error-message">{error}</div>}

    {showPrint && <div className="qr-print-stage" aria-hidden="true">
      <div className="qr-print-tag">
        <div className="qr-print-brand">POLYSHIELD <span>ASSET IQ</span></div>
        <QRCodeSVG value={currentUrl} size={260} level="H" includeMargin/>
        <strong>{asset.name}</strong>
        <b>{humanId}</b>
        <small>{organizationName}</small>
        <p>Scan to open Digital Asset Passport</p>
      </div>
    </div>}

    {showOrder && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Order QR tag">
      <form className="modal-card qr-order-card" onSubmit={submitOrder}>
        <div className="section-header">
          <div><p className="eyebrow">Permanent identification</p><h2>Order QR tag</h2></div>
          <button type="button" className="text-button" onClick={() => setShowOrder(false)}>Close</button>
        </div>

        <div className="qr-order-preview">
          <QRCodeSVG value={currentUrl} size={116} level="H"/>
          <div><strong>{asset.name}</strong><span>{humanId}</span><small>{organizationName}</small></div>
        </div>

        <label>Material
          <select value={form.material} onChange={(e) => setForm({...form, material:e.target.value})}>
            {MATERIALS.map(([name]) => <option key={name}>{name}</option>)}
          </select>
        </label>
        <p className="field-help">{MATERIALS.find(([name]) => name === form.material)?.[1]}</p>

        <div className="two-field-row">
          <label>Size
            <select value={form.size} onChange={(e) => setForm({...form, size:e.target.value})}>
              {SIZES.map((size) => <option key={size}>{size}</option>)}
            </select>
          </label>
          <label>Quantity
            <input type="number" min="1" max="500" value={form.quantity} onChange={(e) => setForm({...form, quantity:e.target.value})}/>
          </label>
        </div>

        <label className="checkbox-row"><input type="checkbox" checked={form.include_asset_name} onChange={(e) => setForm({...form, include_asset_name:e.target.checked})}/> Include asset name</label>
        <label className="checkbox-row"><input type="checkbox" checked={form.include_organization_name} onChange={(e) => setForm({...form, include_organization_name:e.target.checked})}/> Include organization name</label>

        <label>Production / mounting notes
          <textarea rows="3" placeholder="Example: curved tank shell, outdoor exposure, washdown area…" value={form.notes} onChange={(e) => setForm({...form, notes:e.target.value})}/>
        </label>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={() => setShowOrder(false)}>Cancel</button>
          <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Submitting…' : 'Submit order request'}</button>
        </div>
        <p className="field-help">This submits a production request tied to the asset. Pricing and fulfillment can be connected to your preferred tag vendor later without changing the asset workflow.</p>
      </form>
    </div>}
  </>
}
