function extractAI(photo) {
  if (photo.ai_analysis) return photo.ai_analysis
  const line = String(photo.annotation_note || '')
  if (!line.startsWith('AI reviewed')) return null
  const severity = line.match(/Severity\s+([^·]+)/i)?.[1]?.trim() || 'Recorded'
  const confidence = line.match(/Confidence\s+(\d+)%/i)?.[1]
  const defectText = line.split('·').slice(3).join('·').trim()
  return {
    title: photo.title || photo.file_name || 'Inspection photo',
    severity,
    confidence: confidence ? Number(confidence) : null,
    defects: defectText ? defectText.split(',').map((item) => item.trim()).filter(Boolean) : [],
    summary: photo.notes || 'Inspector-reviewed AI draft recorded with this photo.',
  }
}

export default function AISection({ inspection }) {
  const insights = (inspection?.photos || []).map((photo) => ({ photo, analysis: extractAI(photo) })).filter((item) => item.analysis)
  return <section className="report-section-v2 ai-section">
    <div className="report-section-title"><span>05</span><div><p className="eyebrow">AI-assisted assessment</p><h2>Photo intelligence</h2></div></div>
    {!insights.length ? <div className="ai-pending"><div className="ai-icon">AI</div><div><strong>No reviewed AI findings in this inspection</strong><p>Photo intelligence is available during the field inspection. AI output is treated as a draft and must be reviewed by the inspector before it is included in the permanent record.</p></div><span>Inspector review required</span></div> : <div className="report-ai-findings">
      <div className="report-ai-notice"><strong>{insights.length} inspector-reviewed AI photo finding{insights.length === 1 ? '' : 's'}</strong><p>These observations are visual-photo assistance only and do not replace measurements, testing, engineering evaluation, or fitness-for-service assessment.</p></div>
      {insights.map(({ photo, analysis }, index) => <article className="report-ai-item" key={photo.id || index}>
        <div><span>{String(index + 1).padStart(2, '0')}</span><strong>{analysis.title}</strong></div>
        <div className="report-ai-meta"><b>{analysis.severity} severity</b>{analysis.confidence != null && <b>{analysis.confidence}% confidence</b>}</div>
        <p>{analysis.summary}</p>
        {analysis.defects?.length > 0 && <small>Visible findings: {analysis.defects.join(', ')}</small>}
      </article>)}
    </div>}
  </section>
}
