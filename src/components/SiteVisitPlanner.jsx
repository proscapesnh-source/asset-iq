import { useState } from 'react'

const KEY = 'polyshield_site_visit_drafts_v1'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const blank = { client:'',site:'',address:'',contact:'',scope:'',shape:'Cylinder',diameter:'',height:'',length:'',width:'',floor:true,roof:false,material:'Durachem',substrate:'concrete',thickness:'100',waste:'20',rate:'',labor:'',notes:'',photos:[],dimensionsVerified:false,blastMethod:'',blastRate:'',blastMedia:'garnet',mediaLbsPerSqFt:'',mediaWaste:'10',existingCoating:'unknown' }
const coverage = { concrete:800,bolted:850,welded:1100 }
const num = x => Math.max(0, Number(x) || 0)
const dollars = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n)
const MEDIA_GUIDANCE = {
 garnet: {name:'Garnet',detail:'Candidate for controlled profiling and coating removal; verify grade, achievable profile, dust controls, consumption and production by test blast.'},
 coal_slag: {name:'Coal slag',detail:'Candidate for approved open-blast applications; evaluate dust, possible constituent exposure, spent-media disposal and achieved profile.'},
 copper_slag: {name:'Copper slag',detail:'Candidate where approved and available; evaluate dust/metals exposure, disposal classification, achieved profile and test-blast productivity.'}
}
function mediaAdvice(condition, ai) {
 const text = [ai?.summary,...(ai?.observed||[]),...(ai?.possible_concerns||[])].filter(Boolean).join(' ').toLowerCase()
 const hazard = condition==='hazardous' || /lead|chromat|hazardous coating|asbestos/.test(text)
 const coating = condition==='unknown' ? (/(blister|peel|flak|delaminat|rust|corrosion)/.test(text)?'thin':'unknown') : condition
 const detail = hazard
  ? 'Do not choose abrasive from photographs. Stop pending coating identification, exposure assessment, containment and waste controls.'
  : coating==='heavy'
  ? 'Heavy adherent coating: test-blast garnet and any permitted slag media at the required profile; rank by achieved removal rate, consumption and total cost.'
  : coating==='concrete'
  ? 'Concrete: confirm specified surface preparation and concrete soundness; abrasive type and method require test patches and coating-system approval.'
  : coating==='bare'
  ? 'Bare steel or mill scale: select media grade to achieve the specified cleanliness and anchor profile, then verify with test panels.'
  : coating==='thin'
  ? 'Deteriorated coating: compare removal rate and required profile during a test blast; garnet is a starting candidate, not an automatic winner.'
  : 'Coating type is unverified. Obtain coating history and test results before ranking abrasive productivity.'
 return {hazard,coating,detail}
}

export default function SiteVisitPlanner() {
 const [drafts,setDrafts] = useState(read)
 const [draft,setDraft] = useState({...blank})
 const [selected,setSelected] = useState(null)
 const [message,setMessage] = useState('')
 const [aiReview,setAiReview] = useState(null)
 const [aiBusy,setAiBusy] = useState(false)
 const reviewWithAI = async () => {
  if (!draft.photos.length) { setMessage('Add a site photo first.'); return }
  setAiBusy(true)
  try {
   const response=await fetch('/api/analyze-site-visit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({site:{...draft,photos:[]},imageDataUrl:draft.photos[0].data})})
   const body=await response.json()
   if(!response.ok)throw new Error(body.error||'Review unavailable')
   setAiReview(body.analysis)
  }catch(error){setMessage(error.message)}
  finally{setAiBusy(false)}
 }
 const update=(field,value)=>setDraft(d=>({...d,[field]:value,...(['diameter','height','length','width'].includes(field)?{dimensionsVerified:false}:{})}))
 const area= draft.shape==='Cylinder' ? Math.PI*num(draft.diameter)*num(draft.height)+(draft.floor?Math.PI*num(draft.diameter)**2/4:0)+(draft.roof?Math.PI*num(draft.diameter)**2/4:0) : 2*(num(draft.length)+num(draft.width))*num(draft.height)+(draft.floor?num(draft.length)*num(draft.width):0)+(draft.roof?num(draft.length)*num(draft.width):0)
 const orderArea=area*(1+num(draft.waste)/100)
 const kits=draft.material==='Durachem'?Math.ceil(orderArea/coverage[draft.substrate]):null
 const subtotal=num(draft.rate)*kits+num(draft.labor)
 const blastingHours=num(draft.blastRate)>0?area/num(draft.blastRate):null
 const mediaWeight=num(draft.mediaLbsPerSqFt)>0?area*num(draft.mediaLbsPerSqFt)*(1+num(draft.mediaWaste)/100):null
 const advice=mediaAdvice(draft.existingCoating,aiReview)
 const checks=[
  {label:'Identify the customer and site',done:!!draft.client.trim()&&!!draft.site.trim()&&!!draft.address.trim(),help:'Record customer, job-site name and full address.'},
  {label:'Document the tank and scope',done:!!draft.scope.trim(),help:'Identify the tank, coating scope and surfaces included.'},
  {label:'Verify physical measurements',done:!!draft.dimensionsVerified&&(draft.shape==='Cylinder'?num(draft.diameter)>0&&num(draft.height)>0:num(draft.length)>0&&num(draft.width)>0&&num(draft.height)>0),help:'Measure tank dimensions in feet; do not estimate dimensions from a photo alone.'},
  {label:'Capture site photographs',done:draft.photos.length>0,help:'Photograph overall tank, access points, penetrations, repairs and areas needing special preparation.'},
  {label:'Record inspection findings',done:!!draft.notes.trim(),help:'Document corrosion, seams, leaks, existing lining, surface preparation and restricted access.'},
  {label:'Confirm material and thickness',done:!!draft.material.trim()&&num(draft.thickness)>0,help:'Verify selected product TDS and required application thickness.'},
  {label:'Complete pricing inputs',done:num(draft.rate)>0&&draft.labor!==''&&kits!==null,help:'Enter verified package price and other costs; non-Durachem products require TDS coverage data.'}
 ]
 const incomplete=checks.filter(c=>!c.done)
 const readyForReview=incomplete.length===0

 const save=()=>{if(!draft.client.trim()||!draft.site.trim()||!area){setMessage('Client, job site and valid dimensions are required.');return}
 const item={...draft,id:selected||('visit-'+Date.now()),updatedAt:new Date().toISOString(),status:'Draft — not sent to Zoho'}
 const next=[item,...drafts.filter(d=>d.id!==item.id)]
 try{localStorage.setItem(KEY,JSON.stringify(next));setDrafts(next);setSelected(item.id);setMessage('Site visit draft saved on this device. Not synced to Zoho.')}catch{setMessage('Device storage full. Remove photos or export your draft.')}
 }
 const load=item=>{setSelected(item.id);setDraft({...blank,...item});setMessage('Saved draft loaded.')}
 const addPhotos=async e=>{const files=[...e.target.files].slice(0,4);const results=[]
 for(const file of files){if(file.size>600000){setMessage('Please use images smaller than 600 KB for device-only drafts.');continue}
 const data=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>resolve(null);reader.readAsDataURL(file)})
 if(data)results.push({name:file.name,data})}
 setDraft(d=>({...d,photos:[...d.photos,...results].slice(0,8)}));e.target.value=''
 }
 const print=()=>{if(!readyForReview){setMessage('Complete the survey checklist before printing a draft quote.');return}window.print()}
 return <section className="panel" id="site-visit-planner">
 <div className="section-header"><div><p className="eyebrow">Planning / field workflow</p><h2>Site visit → job-site quote</h2><p className="muted">Record a customer's site, document measurements and photos, prepare a material estimate and print a draft quote. Drafts remain on this device until shared storage and Zoho sync are configured.</p></div></div>
 {!!drafts.length&&<label>Resume site visit<select value={selected||''} onChange={e=>{const item=drafts.find(x=>x.id===e.target.value);if(item)load(item)}}><option value="">New site visit</option>{drafts.map(x=><option key={x.id} value={x.id}>{x.client} — {x.site}</option>)}</select></label>}
 <section className="calculator-note" aria-label="Guided site survey review">
 <h3>Guided field survey</h3>
 <p>Follow each step. Missing items are flagged before a quote can be printed. A qualified estimator must approve the final scope, quantities and pricing.</p>
 <p role="status"><strong>{checks.length-incomplete.length} of {checks.length} survey checks complete</strong> — {readyForReview?'Ready for estimator review':'More information needed'}</p>
 <ol>{checks.map(c=><li key={c.label}><strong>{c.done?'✓':'○'} {c.label}</strong>{!c.done&&<span> — {c.help}</span>}</li>)}</ol>
 <p><strong>Field prompts:</strong> Check interior versus exterior surfaces, roof and floor inclusion, substrate condition, bolts/welds, nozzles, manways, obstructions, access, containment, and environmental conditions. Flag uncertain conditions for supervisor review.</p>
 <p className="muted">AI identifies visible features and asks follow-up questions. The technician must physically confirm dimensions before quoting; surface preparation and production are rule-based inputs, not AI decisions.</p>
 </section>
 <div className="form-grid planner-inputs">
 <label>Customer / company<input value={draft.client} onChange={e=>update('client',e.target.value)}/></label>
 <label>Job-site name<input value={draft.site} onChange={e=>update('site',e.target.value)}/></label>
 <label>Site address<input value={draft.address} onChange={e=>update('address',e.target.value)}/></label>
 <label>Site contact<input value={draft.contact} onChange={e=>update('contact',e.target.value)}/></label>
 <label>Scope / tank identification<input value={draft.scope} onChange={e=>update('scope',e.target.value)}/></label>
 <label>Tank shape<select value={draft.shape} onChange={e=>update('shape',e.target.value)}><option>Cylinder</option><option>Rectangular</option></select></label>
 {draft.shape==='Cylinder'?<label>Diameter (ft)<input type="number" min="0" value={draft.diameter} onChange={e=>update('diameter',e.target.value)}/></label>:<><label>Length (ft)<input type="number" min="0" value={draft.length} onChange={e=>update('length',e.target.value)}/></label><label>Width (ft)<input type="number" min="0" value={draft.width} onChange={e=>update('width',e.target.value)}/></label></>}
 <label>Height (ft)<input type="number" min="0" value={draft.height} onChange={e=>update('height',e.target.value)}/></label>
 <label><input type="checkbox" checked={!!draft.dimensionsVerified} onChange={e=>update('dimensionsVerified',e.target.checked)}/> I physically checked the dimensions against the AI/site-photo assessment</label>
 <label>Existing coating condition / type<select value={draft.existingCoating||'unknown'} onChange={e=>update('existingCoating',e.target.value)}><option value="unknown">Unknown — field verification required</option><option value="bare">Bare steel / mill scale</option><option value="thin">Thin, aged or deteriorated coating</option><option value="heavy">Heavy or strongly adhered coating</option><option value="concrete">Concrete substrate / surface preparation</option><option value="hazardous">Potential hazardous or lead-containing coating — testing required</option></select></label>
 <label>Blast media<select value={draft.blastMedia||'garnet'} onChange={e=>update('blastMedia',e.target.value)}><option value="garnet">Garnet</option><option value="coal_slag">Coal slag</option><option value="copper_slag">Copper slag</option></select></label>
 <label>Field-approved abrasive consumption (lb/ft²)<input type="number" min="0" step="0.1" value={draft.mediaLbsPerSqFt||''} onChange={e=>update('mediaLbsPerSqFt',e.target.value)} placeholder="Enter manufacturer / test-blast rate"/></label>
 <label>Abrasive allowance (%)<input type="number" min="0" value={draft.mediaWaste??'10'} onChange={e=>update('mediaWaste',e.target.value)}/></label>
 <p className="muted">Calculated abrasive required: {mediaWeight===null?'Enter a verified consumption rate':Math.ceil(mediaWeight).toLocaleString()+' lb ('+(mediaWeight/2000).toFixed(2)+' US short tons)'}. Media consumption is based on measured preparation area, not coating order coverage. Evaluate existing coating, target profile, blast standard, nozzle and pressure, access, containment, worker exposure, and test-blast results before comparing productivity.</p>
 <section className="calculator-note" aria-label="Abrasive media recommendations">
 <h3>AI-assisted abrasive selection</h3>
 <p><strong>Provisional field guidance:</strong> {advice.detail}</p>
 <p><strong>Interpretation:</strong> {draft.existingCoating==='unknown'&&advice.coating!=='unknown'?'Visual observations suggest deterioration; a technician must confirm coating type.':'Uses technician-selected coating condition and any available AI site findings.'}</p>
 <p><strong>Comparison candidates:</strong></p>
 <ul>{Object.entries(MEDIA_GUIDANCE).map(([id,entry])=><li key={id}><strong>{entry.name}{draft.blastMedia===id?' (selected)':''}:</strong> {entry.detail}</li>)}</ul>
 <p>{advice.hazard?'Potential hazardous coating: abrasive recommendation is on hold.':'No media is declared best until the required cleanliness and profile, hazard review, test-blast rate (ft²/hour), consumption (lb/ft²), cost and waste handling are verified.'}</p>
 </section>
 <label>Blast method / surface preparation<input value={draft.blastMethod||''} onChange={e=>update('blastMethod',e.target.value)} placeholder="Enter specified preparation method"/></label>
 <label>Approved blast production rate (ft²/hour)<input type="number" min="0" value={draft.blastRate||''} onChange={e=>update('blastRate',e.target.value)} placeholder="Enter field-approved rate"/></label>
 <p className="muted">Blasting quantities use physical surface area and the entered field production rate—not AI judgment. {blastingHours!==null?'Calculated blast production hours: '+blastingHours.toFixed(1)+' (excludes setup, containment, cleanup and other allowances).':'Enter a field-approved production rate to calculate blasting hours.'}</p>
 <label>Coating / material<input value={draft.material} onChange={e=>update('material',e.target.value)} /></label>
 {draft.material==='Durachem'&&<label>Tank substrate<select value={draft.substrate} onChange={e=>update('substrate',e.target.value)}><option value="concrete">Concrete — 800 ft²/kit</option><option value="bolted">Bolted steel — 850 ft²/kit</option><option value="welded">Welded steel — 1,100 ft²/kit</option></select></label>}
 <label>Thickness (mils)<input type="number" min="1" value={draft.thickness} onChange={e=>update('thickness',e.target.value)}/></label>
 <label>Waste allowance (%)<input type="number" min="0" value={draft.waste} onChange={e=>update('waste',e.target.value)}/></label>
 <label>Material cost per kit ($)<input type="number" min="0" value={draft.rate} onChange={e=>update('rate',e.target.value)}/></label>
 <label>Other quoted costs ($)<input type="number" min="0" value={draft.labor} onChange={e=>update('labor',e.target.value)}/></label>
 </div>
 <div className="planner-toggles"><label><input type="checkbox" checked={draft.floor} onChange={e=>update('floor',e.target.checked)}/>Include floor</label><label><input type="checkbox" checked={draft.roof} onChange={e=>update('roof',e.target.checked)}/>Include roof</label></div>
 <label>Inspection findings / scope notes<textarea value={draft.notes} rows={3} onChange={e=>update('notes',e.target.value)} /></label>
 <label>Site photographs (up to 8 small images)<input type="file" accept="image/*" capture="environment" multiple onChange={addPhotos}/></label>
 <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{draft.photos.map((p,i)=><figure key={i} style={{width:100,margin:0}}><img src={p.data} alt={p.name} style={{width:100,height:80,objectFit:'cover'}}/><button type="button" onClick={()=>update('photos',draft.photos.filter((_,j)=>j!==i))}>Remove</button></figure>)}</div>
 <section className="calculator-note"><h3>AI field assistant</h3>
 <button type="button" disabled={aiBusy||!draft.photos.length} onClick={reviewWithAI}>{aiBusy?'Analyzing…':'Review photo and site survey with AI'}</button>
 {aiReview&&<div><p>{aiReview.summary}</p>
 {['observed','components','possible_concerns','next_questions'].map(key=><div key={key}><strong>{key.replaceAll('_',' ')}</strong><ul>{(aiReview[key]||[]).map((item,i)=><li key={i}>{item}</li>)}</ul></div>)}
 <p>{aiReview.limitations}</p><small>AI findings require technician verification. Do not use photo estimates for dimensions or engineering approval.</small></div>}
 </section>
 <div className="calculator-results"><div><small>Measured surface</small><strong>{Math.round(area).toLocaleString()} ft²</strong></div><div><small>Order coverage, including waste</small><strong>{Math.round(orderArea).toLocaleString()} ft²</strong></div><div><small>Durachem kits</small><strong>{kits===null?'TDS needed':kits}</strong></div><div><small>Draft estimate (entered costs)</small><strong>{kits===null?'Material estimate pending':dollars(subtotal)}</strong></div></div>
 <p className="muted">Estimate excludes taxes, mobilization, equipment, overhead and any unentered costs. Durachem field coverage is not thickness-adjusted until reference mils are defined. Other products require verified manufacturer coverage before kit estimates.</p>
 <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:12}}><button type="button" className="primary-button" onClick={save}>Save site visit draft</button><button type="button" className="secondary-button" onClick={print} disabled={!readyForReview}>Print draft quote</button><button type="button" className="secondary-button" onClick={()=>{setDraft({...blank});setSelected(null);setMessage('New site visit started.')}}>New visit</button><button type="button" className="secondary-button" disabled title="Secure job-site sync endpoint is not yet available">Push job site to Zoho — setup required</button></div>
 {message&&<p role="status">{message}</p>}
 </section>
}