export default function OSHAStarterResources() {
  const resources = [
    { name: 'Free OSHA safety training materials', description: 'Official no-cost handouts, hazard-awareness resources and worker training references, including English and Spanish materials.', url: 'https://www.osha.gov/complianceassistance/training-resources' },
    { name: 'OSHA Outreach 10-hour program overview', description: 'Learn what OSHA 10 covers, the difference between Construction and General Industry, and what a valid course-completion card means.', url: 'https://www.osha.gov/training/outreach' },
    { name: 'Find an authorized OSHA 10-hour online provider', description: 'Only OSHA-authorized trainers and providers can issue Outreach course-completion cards. Provider fees may apply; a free preparation course is not the OSHA 10 card.', url: 'https://www.osha.gov/training/outreach/training-providers' },
  ]
  return <section className="panel" aria-label="Free OSHA training resources">
    <div className="section-header"><div><p className="eyebrow">Free for all PolyShield users</p><h2>OSHA Safety Learning & OSHA 10 Pathway</h2></div></div>
    <p>Use these official OSHA resources at no charge to study workplace hazard awareness, employee rights and job-site safety. This library does <strong>not</strong> award an OSHA 10-hour Outreach card or claim to be an OSHA-authorized 10-hour course.</p>
    <p className="muted">For an official OSHA 10-hour course-completion card, complete a Construction or General Industry course through an OSHA-authorized trainer or online provider. Training providers may charge a fee. Site-specific training, permits and supervisor authorization are still required where applicable.</p>
    <div className="activity-list">{resources.map(item => <article key={item.url}><div><strong>{item.name}</strong><p>{item.description}</p><a href={item.url} target="_blank" rel="noopener noreferrer">Open official OSHA resource ↗</a></div></article>)}</div>
  </section>
}
