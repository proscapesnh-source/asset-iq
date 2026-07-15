export default function Projects({ projects, assets, onBack, onAdvance }) {
  return (
    <div className="page-stack">
      <button className="back-link" type="button" onClick={onBack}>← Back</button>
      {projects.map((project) => {
        const asset = assets.find((item) => item.id === project.assetId)
        return (
          <section className="panel" key={project.id}>
            <p className="eyebrow">Open project</p>
            <h2>{project.title}</h2>
            <p>{asset?.name}</p>
            <div className="stage-list">
              {project.stages.map((stage, index) => (
                <div className={index <= project.stageIndex ? 'stage complete' : 'stage'} key={stage}>
                  <span>{index <= project.stageIndex ? '✓' : '○'}</span><strong>{stage}</strong>
                </div>
              ))}
            </div>
            <button className="primary-button project-button" type="button" onClick={() => onAdvance(project.id)}>
              {project.stageIndex >= project.stages.length - 1 ? 'Project closed' : 'Advance project stage'}
            </button>
            <p className="record-note">Closing a project creates the next service cycle and preserves the previous cycle as read-only history.</p>
          </section>
        )
      })}
    </div>
  )
}
