import React from 'react';
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

      <div className="workflow-flowchart-container" id="workflow-steps">
        <div className="workflow-flowchart">
          {steps.map((step, i) => {
            const isCompleted = step.status === 'completed';
            const nextIsCompleted = i < steps.length - 1 && steps[i + 1].status === 'completed';

            return (
              <React.Fragment key={i}>
                <div className="flowchart-node-wrapper">
                  <div className={`flowchart-node ${isCompleted ? 'completed' : ''}`}>
                    <div className="node-header">
                      <div className="node-name">{step.step_name}</div>
                      <div className="node-duration">
                        <IconClock /> {step.duration_ms.toFixed(1)}ms
                      </div>
                    </div>
                    <div className="node-desc">{step.description}</div>
                    {(step.input_preview || step.output_preview) && (
                      <div className="node-io">
                        {step.input_preview && (
                          <div className="io-line" title={step.input_preview}>
                            <span className="io-label">IN:</span>{step.input_preview}
                          </div>
                        )}
                        {step.output_preview && (
                          <div className="io-line" title={step.output_preview}>
                            <span className="io-label">OUT:</span>{step.output_preview}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flowchart-edge ${nextIsCompleted ? 'completed' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
