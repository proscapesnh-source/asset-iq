function fileToCompressedDataUrl(file, maxDimension = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read image.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Could not load image for analysis.'))
      image.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
        const width = Math.max(1, Math.round(image.width * scale))
        const height = Math.max(1, Math.round(image.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export async function analyzeInspectionPhoto(photo, asset, knowledge = {}, inspectorCorrection = null) {
  const imageDataUrl = await fileToCompressedDataUrl(photo.file)
  const response = await fetch('/api/analyze-photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageDataUrl,
      category: photo.category,
      asset: {
        name: asset?.name,
        asset_type: asset?.asset_type,
        contents: asset?.contents,
        facility: asset?.facility,
        manufacturer: asset?.manufacturer,
        model: asset?.model,
        dna: asset?.dna || null,
        service_events: (asset?.service_events || []).slice(0, 20),
      },
      inspectorCorrection,
      knowledge: {
        coatings: (knowledge.coatings || []).slice(0, 20).map((x) => ({ manufacturer:x.manufacturer, product_name:x.product_name, coating_family:x.coating_family, color:x.color, dft_range:x.dft_range, service_environment:x.service_environment, visual_characteristics:x.visual_characteristics, failure_modes:x.failure_modes, repair_guidance:x.repair_guidance })),
        failures: (knowledge.failures || []).slice(0, 45).map((x) => ({ name:x.name, category:x.category, visual_indicators:x.visual_indicators, severity_guidance:x.severity_guidance, verification:x.verification })),
        repairs: (knowledge.repairs || []).slice(0, 15).map((x) => ({ name:x.name, compatible_families:x.compatible_families, surface_prep:x.surface_prep, procedure:x.procedure, qa_qc:x.qa_qc, limitations:x.limitations })),
        standards: (knowledge.standards || []).slice(0, 20).map((x) => ({ name:x.name, source:x.source, version:x.version, scope:x.scope, guidance:x.guidance })),
      },
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'AI photo analysis failed.')
  return body.analysis
}

export function aiAnnotationLine(analysis) {
  if (!analysis) return ''
  const defects = analysis.defects?.length ? analysis.defects.join(', ') : 'No specific defect identified'
  return `AI reviewed · Severity ${analysis.severity} · Confidence ${analysis.confidence}% · ${defects}`
}

export function aiNotesDraft(analysis) {
  if (!analysis) return ''
  const recommendations = analysis.recommendations?.length ? ` Recommended next steps: ${analysis.recommendations.join('; ')}.` : ''
  return `${analysis.summary}${recommendations}`.trim()
}


export async function analyzeComponentPhoto(file, asset) {
  const imageDataUrl = await fileToCompressedDataUrl(file)
  const response = await fetch('/api/analyze-photo', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      mode:'component',
      imageDataUrl,
      asset:{name:asset?.name,asset_type:asset?.asset_type,contents:asset?.contents,facility:asset?.facility,location:asset?.location},
    }),
  })
  const body = await response.json().catch(()=>({}))
  if (!response.ok) throw new Error(body.error || 'AI component identification failed.')
  return body.analysis
}
