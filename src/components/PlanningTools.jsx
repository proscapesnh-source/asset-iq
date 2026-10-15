import { useMemo, useState } from 'react'

const number = (value) => Math.max(0, Number(value) || 0)
const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0)

function Field({ label, children }) { return <label>{label}{children}</label> }

export default function PlanningTools({ workOrders = [], role }) {
  const [shape, setShape] = useState('Cylinder')
  const [form, setForm] = useState({ diameter: '', height: '', length: '', width: '', mils: '100', waste: '20', extras: '0', includeFloor: true, includeRoof: true })
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const calculation = useMemo(() => {
    const height = number(form.height)
    const length = number(form.length)
    const width = number(form.width)
    const diameter = number(form.diameter)
    const shell = shape === 'Cylinder' ? Math.PI * diameter * height : 2 * height * (length + width)
    const floor = shape === 'Cylinder' ? Math.PI * diameter * diameter / 4 : length * width
    const roof = floor
    const baseArea = shell + (form.includeFloor ? floor : 0) + (form.includeRoof ? roof : 0)
    const withExtras = baseArea * (1 + number(form.extras) / 100)
    const orderArea = withExtras * (1 + number(form.waste) / 100)
    const gallons = orderArea * number(form.mils) / 1604
    return { shell, floor, roof, baseArea, orderArea, gallons }
  }, [form, shape])

  const budget = useMemo(() => {
    const open = workOrders.filter((item) => item.status !== 'Complete')
    const planned = open.reduce((sum, item) => sum + number(item.estimated_cost), 0)
    const approved = open.reduce((sum, item) => sum + number(item.approved_budget), 0)
    const awaiting = open.filter((item) => !number(item.approved_budget)).length
    const withoutEstimate = open.filter((item) => !number(item.estimated_cost)).length
    return { open: open.length, planned, approved, awaiting, withoutEstimate }
  }, [workOrders])

  const canViewBudget = ['owner', 'admin', 'manager', 'supervisor'].includes(role)

  return <div className="page-stack">
    <div className="page-heading"><div><p className="eyebrow">Field estimating + capital planning</p><h1>Planning tools</h1><p>Turn vessel dimensions into coating quantities, then connect identified work to budget and purchase-order progress.</p></div></div>

    <section className="planner-grid">
      <article className="panel calculator-panel">
        <div className="section-header"><div><p className="eyebrow">Technician field tool</p><h2>Tank surface-area calculator</h2><p className="muted">Use inside dimensions in feet. Verify critical measurements before ordering material.</p></div></div>
        <div className="choice-row"><button className={shape === 'Cylinder' ? 'choice active' : 'choice'} onClick={() => setShape('Cylinder')}>Round tank</button><button className={shape === 'Rectangular' ? 'choice active' : 'choice'} onClick={() => setShape('Rectangular')}>Rectangular tank</button></div>
        <div className="form-grid planner-inputs">
          {shape === 'Cylinder' ? <Field label="Diameter (ft)"><input inputMode="decimal" value={form.diameter} onChange={(e) => set('diameter', e.target.value)} placeholder="12"/></Field> : <><Field label="Length (ft)"><input inputMode="decimal" value={form.length} onChange={(e) => set('length', e.target.value)} placeholder="20"/></Field><Field label="Width (ft)"><input inputMode="decimal" value={form.width} onChange={(e) => set('width', e.target.value)} placeholder="12"/></Field></>}
          <Field label="Height (ft)"><input inputMode="decimal" value={form.height} onChange={(e) => set('height', e.target.value)} placeholder="14"/></Field>
          <Field label="Target thickness (mils)"><input inputMode="decimal" value={form.mils} onChange={(e) => set('mils', e.target.value)}/></Field>
          <Field label="Waste / contingency (%)"><input inputMode="decimal" value={form.waste} onChange={(e) => set('waste', e.target.value)}/></Field>
          <Field label="Appendages / detail allowance (%)"><input inputMode="decimal" value={form.extras} onChange={(e) => set('extras', e.target.value)}/></Field>
        </div>
        <div className="planner-toggles"><label><input type="checkbox" checked={form.includeFloor} onChange={(e) => set('includeFloor', e.target.checked)}/> Include floor</label><label><input type="checkbox" checked={form.includeRoof} onChange={(e) => set('includeRoof', e.target.checked)}/> Include roof / ceiling</label></div>
        <div className="calculator-results"><div><small>Measured area</small><strong>{Math.round(calculation.baseArea).toLocaleString()} ft²</strong></div><div><small>Order area</small><strong>{Math.round(calculation.orderArea).toLocaleString()} ft²</strong></div><div><small>Theoretical material</small><strong>{calculation.gallons.toFixed(1)} gal</strong></div></div>
        <p className="calculator-note">Theoretical liquid volume only; confirm product density, component ratio, transfer loss, surface profile, overspray, minimum package size, and manufacturer coverage before ordering.</p>
      </article>

      <article className="panel calculator-panel">
        <div className="section-header"><div><p className="eyebrow">Breakdown</p><h2>Calculated surfaces</h2></div></div>
        <dl className="planning-breakdown"><div><dt>{shape === 'Cylinder' ? 'Shell / wall' : 'Four walls'}</dt><dd>{Math.round(calculation.shell).toLocaleString()} ft²</dd></div><div><dt>Floor</dt><dd>{Math.round(calculation.floor).toLocaleString()} ft²</dd></div><div><dt>Roof / ceiling</dt><dd>{Math.round(calculation.roof).toLocaleString()} ft²</dd></div><div><dt>Waste allowance</dt><dd>{number(form.waste)}%</dd></div></dl>
        <div className="record-note"><strong>Field default:</strong> PolyShield currently applies Michael's usual 20% material contingency. Change it whenever access, geometry, surface condition, or spray loss requires a different allowance.</div>
      </article>
    </section>

    {canViewBudget && <section className="panel">
      <div className="section-header"><div><p className="eyebrow">Organization workflow</p><h2>Repair budget snapshot</h2><p className="muted">Budget values come from open work orders. Add estimates and approvals on the Work Orders page.</p></div></div>
      <div className="metric-grid"><article><strong>{money(budget.planned)}</strong><span>Open estimated work</span></article><article><strong>{money(budget.approved)}</strong><span>Approved budget</span></article><article><strong>{budget.awaiting}</strong><span>Awaiting approval</span></article><article><strong>{budget.withoutEstimate}</strong><span>Missing estimate</span></article></div>
    </section>}
  </div>
}
