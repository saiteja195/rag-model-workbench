import { IconNetwork, IconClock } from './Icons';

export default function WorkflowDiagram({ steps, ragType }) {
  if (!steps || steps.length === 0) {
    return (
      <div className="glass-card">
        <div className="section-header">
          <IconNetwork />
          <h2>WORKFLOW</h2>
          <div className="line" />
        </div>
        <div className="empty-state" style={{ padding: '32px' }}>
          <span className="empty-state-icon">
            <IconNetwork />
          </span>
          <h3>No Workflow Yet</h3>
          <p>Ask a question to see the RAG pipeline execute step by step</p>
        </div>
      </div>
    );
  }

  const totalTime = steps.reduce((sum, s) => sum + s.duration_ms, 0);

  return (
    <div className="glass-card">
      <div className="section-header">
        <IconNetwork />
        <h2>WORKFLOW — {ragType ? ragType.toUpperCase() : 'RAG'} PIPELINE</h2>
        <div className="line" />
      </div>

      <div style={{
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
        marginBottom: '16px',
        fontFamily: 'var(--font-mono)',
      }}>
        {steps.length} steps · {totalTime.toFixed(0)}ms total
      </div>

      <div className="workflow-steps" id="workflow-steps">
        {steps.map((step, i) => (
          <div key={i} className="workflow-step">
            <div className="step-indicator">
              <div className={`step-dot ${step.status === 'completed' ? 'completed' : ''}`} />
              <div className="step-line" />
            </div>
            <div className="step-content">
              <div className="step-name">{step.step_name}</div>
              <div className="step-description">{step.description}</div>
              <span className="step-duration">
                <IconClock /> {step.duration_ms.toFixed(1)}ms
              </span>
              {(step.input_preview || step.output_preview) && (
                <div className="step-io">
                  {step.input_preview && <div>→ in: {step.input_preview}</div>}
                  {step.output_preview && <div>← out: {step.output_preview}</div>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
