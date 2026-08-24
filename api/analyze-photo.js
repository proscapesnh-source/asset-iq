import { COATING_FAILURE_EXPERT_GUIDE } from './coatingFailureExpertPack.js'
const MAX_IMAGE_CHARS = 4_000_000

function collectOutputText(response) {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) return response.output_text.trim()
  const parts = []
  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') parts.push(content.text)
      if (typeof content?.output_text === 'string') parts.push(content.output_text)
    }
  }
  return parts.join('\n').trim()
}

function cleanAnalysis(value = {}) {
  const severity = ['Low', 'Moderate', 'High', 'Critical', 'Unknown'].includes(value.severity) ? value.severity : 'Unknown'
  const rawConfidence = Number(value.confidence) || 0
  const confidence = Math.round(Math.max(0, Math.min(100, rawConfidence > 0 && rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence)))
  const defects = Array.isArray(value.defects) ? value.defects.filter(Boolean).slice(0, 6).map(String) : []
  const recommendations = Array.isArray(value.recommendations) ? value.recommendations.filter(Boolean).slice(0, 5).map(String) : []
  return {
    title: String(value.title || 'Inspection photo').slice(0, 100),
    component: String(value.component || 'Unspecified area').slice(0, 100),
    surface: String(value.surface || 'Unknown').slice(0, 80),
    severity,
    confidence,
    defects,
    summary: String(value.summary || 'No visual summary returned.').slice(0, 700),
    recommendations,
    engineering_review: Boolean(value.engineering_review),
    coating_condition: String(value.coating_condition || 'Not determined').slice(0, 120),
    limitations: String(value.limitations || 'Visual-photo assessment only; verify findings in the field.').slice(0, 400),
    probable_coating_family: String(value.probable_coating_family || 'Not determined').slice(0, 100),
    matched_product: String(value.matched_product || 'Not confirmed').slice(0, 140),
    exact_product_status: String(value.exact_product_status || 'Not confirmed').slice(0, 80),
    observed: String(value.observed || '').slice(0, 700),
    inference: String(value.inference || '').slice(0, 700),
    previous_repair_evidence: String(value.previous_repair_evidence || 'Not determined').slice(0, 400),
    history_alignment: String(value.history_alignment || 'No asset coating history provided').slice(0, 400),
    subtle_indicators: Array.isArray(value.subtle_indicators) ? value.subtle_indicators.filter(Boolean).slice(0, 6).map(String) : [],
    differential_causes: Array.isArray(value.differential_causes) ? value.differential_causes.filter(Boolean).slice(0, 5).map(String) : [],
    inspect_next: Array.isArray(value.inspect_next) ? value.inspect_next.filter(Boolean).slice(0, 6).map(String) : [],
    inspector_challenge: String(value.inspector_challenge || '').slice(0, 500),
    compliance_concerns: Array.isArray(value.compliance_concerns) ? value.compliance_concerns.filter(Boolean).slice(0, 5).map((x) => typeof x === 'string' ? { concern:x, reference:'', confidence:0, verification:'' } : ({ concern:String(x.concern||'').slice(0,240), reference:String(x.reference||'').slice(0,160), confidence:Math.max(0,Math.min(100,Number(x.confidence)||0)), verification:String(x.verification||'').slice(0,300) })) : [],
  }
}


function cleanComponentAnalysis(value = {}) {
  const types = ['Valve','Pump','Nozzle','Manway','Hatch','Agitator / Mixer','Level Sensor','Temperature Sensor','Pressure Gauge','Anode','Ladder','Platform','Vent','Drain','Heat Exchanger','Piping','Other']
  const conditions = ['Excellent','Good','Fair','Poor','Critical','Unknown']
  const rawConfidence = Number(value.confidence) || 0
  return {
    name: String(value.name || '').slice(0,120),
    component_type: types.includes(value.component_type) ? value.component_type : 'Other',
    component_tag: String(value.component_tag || '').slice(0,100),
    manufacturer: String(value.manufacturer || '').slice(0,120),
    model: String(value.model || '').slice(0,120),
    serial_number: String(value.serial_number || '').slice(0,120),
    location: String(value.location || '').slice(0,140),
    condition: conditions.includes(value.condition) ? value.condition : 'Unknown',
    confidence: Math.round(Math.max(0, Math.min(100, rawConfidence > 0 && rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence))),
    visible_text: Array.isArray(value.visible_text) ? value.visible_text.filter(Boolean).slice(0,10).map(String) : [],
    observed: String(value.observed || '').slice(0,700),
    notes: String(value.notes || '').slice(0,700),
    limitations: String(value.limitations || 'Visual identification only; verify field details.').slice(0,400),
  }
}

async function analyzeComponentPayload(payload, imageDataUrl, env) {
  const a = payload?.asset || {}
  const prompt = `You are the component-registration assistant inside PolyShield Asset IQ.
Analyze this photo of equipment attached to or associated with an industrial vessel/tank. The technician wants the PHOTO to do most of the data entry.

Parent vessel:
Name: ${a.name || 'Unknown'}
Type: ${a.asset_type || 'Unknown'}
Contents/service: ${a.contents || 'Unknown'}
Facility: ${a.facility || 'Unknown'}
Location: ${a.location || 'Unknown'}

Rules:
- Identify the most likely maintainable component.
- Read visible nameplate/tag text when legible.
- NEVER invent manufacturer, model, serial number, or component tag. Return empty string if not visibly supported.
- component_type must be exactly one of: Valve, Pump, Nozzle, Manway, Hatch, Agitator / Mixer, Level Sensor, Temperature Sensor, Pressure Gauge, Anode, Ladder, Platform, Vent, Drain, Heat Exchanger, Piping, Other.
- Create a practical short name such as "Outlet Isolation Valve" or "Recirculation Pump".
- Assess only visible condition. Do not infer internal condition, remaining life, pressure rating, or structural adequacy.
- condition must be Excellent, Good, Fair, Poor, Critical, or Unknown.
- visible_text contains useful text actually visible in the photo/nameplate.
- notes is a concise field-ready summary.
- confidence is 0-100.

Return ONLY JSON:
{"name":"","component_type":"Other","component_tag":"","manufacturer":"","model":"","serial_number":"","location":"","condition":"Unknown","confidence":0,"visible_text":[],"observed":"","notes":"","limitations":""}`

  const model = env.OPENAI_VISION_MODEL || 'gpt-5.6-luna'
  const response = await fetch('https://api.openai.com/v1/responses', {
    method:'POST',
    headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model,
      input:[{role:'user',content:[{type:'input_text',text:prompt},{type:'input_image',image_url:imageDataUrl}]}],
      text:{format:{type:'json_object'}},
      max_output_tokens:900,
    }),
  })
  const responseJson = await response.json().catch(()=>({}))
  if (!response.ok) {
    const error = new Error(responseJson?.error?.message || `AI service returned ${response.status}.`)
    error.statusCode = response.status
    throw error
  }
  const raw = collectOutputText(responseJson)
  if (!raw) throw new Error('AI service returned an empty component analysis.')
  let parsed
  try { parsed = JSON.parse(raw) }
  catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI service returned unreadable component data.')
    parsed = JSON.parse(match[0])
  }
  return cleanComponentAnalysis(parsed)
}

export async function analyzePhotoPayload(payload, env = process.env) {
  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) {
    const error = new Error('AI analysis is not configured. Add OPENAI_API_KEY to your environment.')
    error.statusCode = 503
    throw error
  }

  const imageDataUrl = payload?.imageDataUrl
  if (!imageDataUrl || !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(imageDataUrl)) {
    const error = new Error('A JPEG, PNG, or WebP image is required.')
    error.statusCode = 400
    throw error
  }
  if (imageDataUrl.length > MAX_IMAGE_CHARS) {
    const error = new Error('Image is too large for analysis. Please retake or choose a smaller image.')
    error.statusCode = 413
    throw error
  }

  if (payload?.mode === 'component') return analyzeComponentPayload(payload, imageDataUrl, env)

  const assetContext = payload?.asset || {}
  const knowledge = payload?.knowledge || {}
  const knowledgeText = JSON.stringify(knowledge).slice(0, 18000)
  const inspectorCorrection = payload?.inspectorCorrection || null
  const correctionText = inspectorCorrection ? JSON.stringify(inspectorCorrection).slice(0, 6000) : 'None supplied'
  const prompt = `You are the visual inspection assistant inside PolyShield Asset IQ, an industrial asset inspection application.
Analyze this single inspection photograph and return ONLY a JSON object.

Asset context:
- Name: ${assetContext.name || 'Unknown'}
- Asset type: ${assetContext.asset_type || 'Unknown'}
- Contents/service: ${assetContext.contents || 'Unknown'}
- Facility: ${assetContext.facility || 'Unknown'}
- Technician-selected category: ${payload?.category || 'Unknown'}
- Asset DNA (documented/legacy fields may be unknown): ${JSON.stringify(assetContext.dna || {})}
- Recorded repair/rehab/service history: ${JSON.stringify(assetContext.service_events || [])}

Organization-approved Knowledge Center records (may be empty):
${knowledgeText}

Technician correction from the field (authoritative for explicitly corrected fields; re-evaluate the rest of the image around it):
${correctionText}

Built-in PolyShield coating-failure expert guide (curated visual reasoning; use as hypotheses, not proof):
${COATING_FAILURE_EXPERT_GUIDE}

Rules:
- If a technician correction is supplied, treat the explicitly corrected fields and correction note as field-verified context. Do not argue the corrected item back to the prior AI guess unless the correction is internally impossible; instead update the analysis and explain any remaining uncertainty.
- Your goal is not merely to label obvious defects. Look for subtle, secondary, spatial, pattern, edge, weld, staining, discoloration, deformation, shadow, texture, blister-density, corrosion-migration, fastener, nozzle, support, drainage, access, and previous-repair clues an experienced inspector might overlook.
- Before settling on a generic label such as stain, discoloration, dark spot, residue, or damage, compare the morphology/location against the built-in expert guide and organization failure library. Prefer the most technically specific visually-supported term, while preserving uncertainty when alternatives remain.
- Scan the whole frame systematically: center, edges, welds/seams, penetrations/nozzles, fasteners, supports, floor-to-wall transitions, liquid line, splash zone, repair boundaries, and areas with color/texture change.
- First separate OBSERVED visual evidence from INFERENCE.
- Describe only conditions visually supported by the photograph.
- Do not claim wall thickness, substrate loss depth, structural integrity, remaining service life, leak probability, or fitness for service from a photo alone.
- If corrosion, pitting, cracking, coating breakdown, blistering, delamination, exposed substrate, staining, erosion, or other visible defects appear present, identify them cautiously.
- RUST / CORROSION RECOGNITION: On ferrous/steel assets, orange, reddish-brown, brown, or dark-brown corrosion products; rust bloom; rust streaking; rust-colored deposits emerging from seams, welds, holidays, scratches, coating edges, fasteners, or pits should be identified as probable rust/corrosion products when the color + morphology + location support that interpretation. Do not downgrade a probable rust pattern to generic "dark spots" merely because the image is imperfect.
- Differentiate probable rust from mineral deposits, dirt, biological staining, process residue, shadows, and coating discoloration. If those alternatives are plausible, say "probable rust/corrosion products" and list the competing explanation in differential_causes.
- Rust visible through or adjacent to a lining/coating can indicate a coating breach, holiday, edge failure, or substrate exposure. State this as an inference and tell the inspector to verify by cleaning the area, close visual/probe examination, holiday testing when appropriate, and UT thickness measurement when metal loss is suspected.
- Visible rust/corrosion products are not proof of measurable wall loss. Never claim remaining thickness or metal-loss depth without measurements.
- Treat Asset DNA and recorded service history as stronger evidence than visual appearance. Unknown legacy fields are normal and must remain unknown unless supported.
- A service event marked establishes_baseline is the trusted starting point for later comparisons.
- For coatings: identify a broad coating family only when visual/context evidence supports it. NEVER identify an exact manufacturer/product from appearance alone. Set matched_product only when a Knowledge Center product record meaningfully supports the match; otherwise use 'Not confirmed'.
- If an area appears to be a previous patch/recoat/repair, describe the visible evidence cautiously; do not claim when or what product was used unless context supports it.
- Use Knowledge Center defect and repair records as vocabulary/guidance, not as proof that a condition exists.
- Consider multiple plausible causes when visual evidence is non-specific; rank/describe the differential instead of locking onto one cause.
- Look for contradictions between the photograph and the asset/inspection context. If a condition appears more concerning than a typical 'Good' rating would imply, state that in inspector_challenge.
- For standards/compliance: only flag a potential compliance concern when the supplied Knowledge Center standard/guidance actually supports it. Never declare a legal/code violation from a photo. Give the reference, confidence, and what must be verified in the field/documentation.
- inspect_next should tell the inspector exactly what additional view, measurement, test, document, or location would most reduce uncertainty.
- If the image is insufficient, say so and lower confidence.
- Recommendations must be practical next steps such as clean/inspect, obtain UT thickness readings, coating specialist review, engineering review, repair planning, or monitor. Do not prescribe a final engineering repair design from the photo alone.
- Set engineering_review true when the visible condition may warrant qualified engineering evaluation or when severity is Critical.
- Use a concise field-ready photo title. When rust/corrosion products are visually supported, name them directly in the title rather than using vague terms such as "dark spots" or "discoloration".

Return JSON with exactly these keys:
{
  "title": "string",
  "component": "string",
  "surface": "Interior|Exterior|Unknown",
  "severity": "Low|Moderate|High|Critical|Unknown",
  "confidence": 0,
  "defects": ["string"],
  "summary": "string",
  "recommendations": ["string"],
  "engineering_review": false,
  "coating_condition": "string",
  "limitations": "string",
  "probable_coating_family": "string",
  "matched_product": "string or Not confirmed",
  "exact_product_status": "Confirmed by record|Probable match|Family only|Not confirmed",
  "observed": "string containing photo-supported facts only",
  "inference": "string containing cautious interpretation",
  "previous_repair_evidence": "string or Not determined",
  "history_alignment": "string explaining whether the visible condition aligns with supplied product/history context",
  "subtle_indicators": ["non-obvious visual clue"],
  "differential_causes": ["plausible cause or mechanism"],
  "inspect_next": ["specific verification step"],
  "inspector_challenge": "concise challenge when the visible evidence may conflict with an assumed benign condition, otherwise empty string",
  "compliance_concerns": [{"concern":"potential concern, not a violation declaration","reference":"Knowledge Center standard/source","confidence":0,"verification":"what must be confirmed"}]
}`

  const model = env.OPENAI_VISION_MODEL || 'gpt-5.6-luna'
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: prompt },
          { type: 'input_image', image_url: imageDataUrl },
        ],
      }],
      text: { format: { type: 'json_object' } },
      max_output_tokens: 1800,
    }),
  })

  const responseJson = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(responseJson?.error?.message || `AI service returned ${response.status}.`)
    error.statusCode = response.status
    throw error
  }

  const raw = collectOutputText(responseJson)
  if (!raw) throw new Error('AI service returned an empty analysis.')

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI service returned an unreadable analysis.')
    parsed = JSON.parse(match[0])
  }

  return cleanAnalysis(parsed)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  try {
    const analysis = await analyzePhotoPayload(req.body)
    return res.status(200).json({ analysis })
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Photo analysis failed.' })
  }
}
