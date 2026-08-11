import { useMemo, useState } from 'react'

const LIBRARIES = {
  coatings: {
    title: 'Coating Library', eyebrow: 'Product intelligence', icon: '◫',
    description: 'Approved coating systems and product facts the AI can use as grounded context.',
    empty: 'No coating systems yet.',
    fields: [
      ['manufacturer','Manufacturer','text','e.g. Carboline'], ['product_name','Product name','text','e.g. Product 123'],
      ['coating_family','Coating family','select',['Epoxy','Polyurea','Polyurethane','Cementitious','Vinyl Ester','FRP','Other']],
      ['color','Typical color','text','Optional'], ['dft_range','Typical DFT','text','e.g. 80–120 mils'],
      ['service_environment','Service environment','text','Potable water, wastewater, chemical…'],
      ['surface_prep','Surface preparation','textarea','Known manufacturer/specification requirements'],
      ['visual_characteristics','Visual characteristics','textarea','Appearance cues useful for classification'],
      ['failure_modes','Common failure modes','textarea','Blistering, delamination, abrasion…'],
      ['repair_guidance','Repair / compatibility notes','textarea','Approved or known repair approach'],
      ['reference_url','TDS / reference URL','text','Optional manufacturer document link'],
    ],
  },
  failures: {
    title: 'Failure Library', eyebrow: 'Defect intelligence', icon: '△',
    description: 'Standardized defect language, visual cues, causes, severity guidance, and verification steps.',
    empty: 'No failure modes yet.',
    fields: [
      ['name','Failure / defect name','text','e.g. Underfilm corrosion'],
      ['category','Category','select',['Corrosion','Coating','Concrete','Mechanical','Weld / Joint','Other']],
      ['visual_indicators','Visual indicators','textarea','What can reasonably be recognized in a field photo'],
      ['typical_causes','Typical causes','textarea','Potential causes — not automatic conclusions'],
      ['severity_guidance','Severity guidance','textarea','How inspectors should differentiate low/moderate/high/critical'],
      ['verification','Recommended verification','textarea','UT, adhesion testing, holiday testing, engineer review…'],
      ['repair_guidance','Repair guidance','textarea','General planning guidance'],
    ],
  },
  repairs: {
    title: 'Repair Library', eyebrow: 'Repair intelligence', icon: '◇',
    description: 'Standard repair methods the AI may suggest for inspector review when evidence supports them.',
    empty: 'No repair methods yet.',
    fields: [
      ['name','Repair method','text','e.g. Localized polyurea patch'],
      ['compatible_families','Compatible coating families','text','Polyurea, epoxy…'],
      ['surface_prep','Surface preparation','textarea','General required preparation'],
      ['procedure','Procedure / scope','textarea','High-level field procedure'],
      ['qa_qc','QA / QC checks','textarea','DFT, holiday test, adhesion, cure verification…'],
      ['limitations','Limitations / escalation','textarea','Conditions requiring engineering or manufacturer review'],
    ],
  },
  standards: {
    title: 'Inspection Standards', eyebrow: 'Company rules', icon: '▤',
    description: 'Customer or company-specific inspection terminology and acceptance guidance.',
    empty: 'No inspection standards yet.',
    fields: [
      ['name','Standard name','text','e.g. Internal Tank Inspection Procedure'],
      ['source','Source / owner','text','Company, manufacturer, customer…'],
      ['version','Version / date','text','Optional'],
      ['scope','Scope','textarea','Where this standard applies'],
      ['guidance','Inspection guidance','textarea','Rules the AI should reference when drafting findings'],
      ['reference_url','Reference URL','text','Optional document link'],
    ],
  },
}

const STARTER = {
  coatings: [
    { manufacturer:'Generic / field classification', product_name:'Polyurea elastomeric lining', coating_family:'Polyurea', dft_range:'Project / manufacturer specific', service_environment:'Industrial immersion and protective lining service', visual_characteristics:'Typically seamless, elastomeric, relatively high-build lining. Exact product cannot be confirmed from appearance alone.', failure_modes:'Abrasion, mechanical damage, loss of adhesion, blistering, cuts/tears, localized delamination', repair_guidance:'Confirm existing product and compatibility before repair. Prepare and feather repair perimeter per approved procedure.' },
    { manufacturer:'Generic / field classification', product_name:'High-build epoxy lining', coating_family:'Epoxy', dft_range:'Project / manufacturer specific', service_environment:'Industrial immersion and corrosion protection', visual_characteristics:'Often hard, smooth to lightly textured coating. Color and gloss vary widely; exact product cannot be confirmed visually.', failure_modes:'Blistering, cracking, underfilm corrosion, delamination, abrasion, pinholes/holidays', repair_guidance:'Verify existing system and compatibility. Remove unsound coating and prepare substrate/edges per approved repair specification.' },
    { manufacturer:'Generic / field classification', product_name:'Cementitious / mineral lining', coating_family:'Cementitious', dft_range:'Project / manufacturer specific', service_environment:'Water-containing steel or concrete assets where specified', visual_characteristics:'Mineral/cement-like surface texture, commonly gray or off-white. Staining and cracking may be visible.', failure_modes:'Cracking, debonding, erosion, spalling, mineral deposition', repair_guidance:'Determine bond condition and substrate condition; repair using compatible system and manufacturer procedure.' },
  ],
  failures: [
    { name:'Surface corrosion', category:'Corrosion', visual_indicators:'Visible rust/oxide on exposed metallic surface.', typical_causes:'Moisture/oxygen exposure, coating damage, inadequate protection.', severity_guidance:'Escalate with extent, recurrence, pitting evidence, or critical location.', verification:'Clean/inspect; consider UT thickness measurements when section loss is possible.', repair_guidance:'Address source and restore protective system after substrate condition is verified.' },
    { name:'Pitting corrosion', category:'Corrosion', visual_indicators:'Localized cavities/depressions associated with corrosion; depth cannot be determined reliably from a photo.', typical_causes:'Localized electrochemical attack, deposits, coating holidays, service chemistry.', severity_guidance:'High concern when widespread, deep-appearing, leaking, or on critical pressure/structural areas.', verification:'Clean and obtain calibrated pit-depth/UT measurements; engineering review where warranted.', repair_guidance:'Repair design depends on measured remaining thickness and service conditions.' },
    { name:'Coating delamination', category:'Coating', visual_indicators:'Lifted, peeled, detached, curled, or visibly separated coating/liner.', typical_causes:'Adhesion loss, contamination, moisture, incompatible repair, substrate corrosion.', severity_guidance:'Severity increases with exposed substrate, active corrosion, broad extent, or immersion service.', verification:'Map extent; inspect perimeter and substrate; consider adhesion testing when appropriate.', repair_guidance:'Remove unsound material to sound edges and repair with verified compatible system.' },
    { name:'Blistering', category:'Coating', visual_indicators:'Raised domes/bubbles or localized swelling in coating film.', typical_causes:'Osmotic effects, trapped contamination/moisture, permeation, cathodic effects, application conditions.', severity_guidance:'Assess density, size, rupture, exposed substrate and service criticality.', verification:'Document size/density; open representative blisters only under approved inspection procedure.', repair_guidance:'Determine cause before broad repair; remove failed coating and restore compatible system as specified.' },
  ],
  repairs: [
    { name:'Localized coating patch', compatible_families:'Use only with confirmed compatible coating system', surface_prep:'Remove failed/unsound material; prepare substrate and feather sound coating edges to approved specification.', procedure:'Define repair boundary, verify substrate condition, prepare, prime when required, apply compatible repair material, cure.', qa_qc:'Verify surface prep, environmental conditions, cure, DFT where applicable, and holiday testing when required.', limitations:'Do not select final repair material solely from photo identification; verify original/current system and service requirements.' },
    { name:'Full lining rehabilitation', compatible_families:'System selected by owner/specifier/manufacturer for service', surface_prep:'Remove failed lining and prepare substrate to project specification.', procedure:'Condition assessment, repair steel/concrete as required, surface preparation, lining application, cure and acceptance testing.', qa_qc:'Profile/cleanliness, environmental logs, WFT/DFT, cure, holiday testing and documented acceptance as applicable.', limitations:'Requires project-specific scope, material compatibility review, and qualified technical oversight.' },
  ],
  standards: [],
}

function blank(fields) { return Object.fromEntries(fields.map(([key]) => [key, ''])) }
function Field({ spec, value, onChange }) {
  const [key,label,type,optionsOrPlaceholder] = spec
  if (type === 'select') return <label>{label}<select value={value || ''} onChange={(e) => onChange(key,e.target.value)}><option value="">Select</option>{optionsOrPlaceholder.map((o)=><option key={o}>{o}</option>)}</select></label>
  if (type === 'textarea') return <label className="full-width">{label}<textarea rows="3" value={value || ''} placeholder={optionsOrPlaceholder || ''} onChange={(e)=>onChange(key,e.target.value)}/></label>
  return <label>{label}<input value={value || ''} placeholder={optionsOrPlaceholder || ''} onChange={(e)=>onChange(key,e.target.value)}/></label>
}

export default function KnowledgeCenter({ knowledge, onCreate, onDelete, onSeed }) {
  const [tab,setTab] = useState('coatings')
  const cfg = LIBRARIES[tab]
  const [showForm,setShowForm] = useState(false)
  const [form,setForm] = useState(() => blank(LIBRARIES.coatings.fields))
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const items = knowledge?.[tab] || []
  const total = useMemo(() => Object.keys(LIBRARIES).reduce((n,k)=>n+(knowledge?.[k]?.length||0),0),[knowledge])
  const changeTab = (next) => { setTab(next); setShowForm(false); setError(''); setForm(blank(LIBRARIES[next].fields)) }
  const submit = async (e) => { e.preventDefault(); setBusy(true); setError(''); try { await onCreate(tab, form); setForm(blank(cfg.fields)); setShowForm(false) } catch(err){ setError(err.message || 'Could not save knowledge record.') } finally { setBusy(false) } }
  const seed = async () => { setBusy(true); setError(''); try { await onSeed(STARTER) } catch(err){ setError(err.message || 'Could not load starter knowledge.') } finally { setBusy(false) } }

  return <div className="page-stack knowledge-center">
    <div className="page-heading"><div><p className="eyebrow">PolyShield Intelligence Engine</p><h1>Knowledge Center</h1><p>Ground AI inspection drafts in your approved coating, failure, repair, and inspection knowledge.</p></div><div className="knowledge-actions"><button className="secondary-button" disabled={busy || total > 0} onClick={seed}>Load starter knowledge</button><button className="primary-button" onClick={()=>setShowForm(!showForm)}>＋ Add {cfg.title.replace(' Library','')}</button></div></div>
    <section className="knowledge-hero panel"><div><strong>{total}</strong><span>Grounding records</span></div><p><b>AI rule:</b> visual appearance may suggest a coating family, but PolyShield should only name an exact product when the asset record or approved knowledge provides evidence for it.</p></section>
    <div className="knowledge-tabs">{Object.entries(LIBRARIES).map(([id,item])=><button key={id} className={tab===id?'active':''} onClick={()=>changeTab(id)}><span>{item.icon}</span><strong>{item.title}</strong><small>{knowledge?.[id]?.length || 0}</small></button>)}</div>
    {showForm && <form className="panel form-grid knowledge-form" onSubmit={submit}><div className="full-width"><p className="eyebrow">New grounding record</p><h2>{cfg.title}</h2></div>{cfg.fields.map((spec)=><Field key={spec[0]} spec={spec} value={form[spec[0]]} onChange={(key,value)=>setForm({...form,[key]:value})}/>) }{error&&<div className="error-message full-width">{error}</div>}<div className="form-actions full-width"><button type="button" className="secondary-button" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary-button" disabled={busy}>{busy?'Saving…':'Save to Knowledge Center'}</button></div></form>}
    <section className="panel"><div className="section-header"><div><p className="eyebrow">{cfg.eyebrow}</p><h2>{cfg.title}</h2><p className="muted">{cfg.description}</p></div></div>{!items.length?<div className="empty-state"><strong>{cfg.empty}</strong><p>Add your first record or load the safe generic starter set.</p></div>:<div className="knowledge-grid">{items.map((item)=><article key={item.id} className="knowledge-card"><div className="knowledge-card-head"><div><span className="knowledge-type">{item.coating_family || item.category || item.source || 'Approved knowledge'}</span><h3>{item.product_name || item.name}</h3>{item.manufacturer&&<p>{item.manufacturer}</p>}</div><button className="danger-text" onClick={()=>onDelete(tab,item.id)}>Remove</button></div><div className="knowledge-card-body">{cfg.fields.filter(([key])=>!['product_name','name','manufacturer','coating_family','category','source'].includes(key) && item[key]).slice(0,5).map(([key,label])=><div key={key}><small>{label}</small><p>{item[key]}</p></div>)}</div></article>)}</div>}</section>
  </div>
}

export { STARTER }
