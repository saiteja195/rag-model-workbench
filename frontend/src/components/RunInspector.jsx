import { EngineDot, EmptyState, Stat, LatencyBar } from './ui';
import { IconBarChart } from './Icons';
import { formatMs, findType } from '../utils/format';

/** Everything about one query run: timing, pipeline steps and retrieved chunks. */
export default function RunInspector({ result, ragTypes }) {
  if (!result) {
    return (
      <div className="inspector inspector-empty">
        <EmptyState icon={<IconBarChart />} title="Nothing to inspect yet">
          Ask a question and the timing, pipeline steps and retrieved chunks show up here.
        </EmptyState>
      </div>
    );
  }

  const rag = findType(ragTypes, result.rag_type);
  const steps = result.workflow_steps || [];
  const chunks = result.retrieved_chunks || [];

  return (
    <div className="inspector">
      <header className="inspector-head">
        <div className="inspector-engine">
          <EngineDot color={rag?.color} />
          <strong>{rag?.name || result.rag_type}</strong>
        </div>
        <p className="inspector-question">{result.question}</p>
      </header>

      <section className="inspector-section">
        <h3>Timing</h3>
        <dl className="stats">
          <Stat label="Total" value={formatMs(result.total_time_ms)} />
          <Stat label="Chunks searched" value={result.chunks_searched} />
          <Stat label="Steps" value={steps.length} />
        </dl>
        <LatencyBar result={result} legend />
      </section>

      {steps.length > 0 && (
        <section className="inspector-section">
          <h3>Pipeline</h3>
          <ol className="steps">
            {steps.map((step, i) => (
              <li key={i} className={`step ${step.status}`}>
                <div className="step-head">
                  <span className="step-name">{step.step_name}</span>
                  <span className="mono step-time">{formatMs(step.duration_ms)}</span>
                </div>
                <p className="step-desc">{step.description}</p>
                {(step.input_preview || step.output_preview) && (
                  <details className="step-io">
                    <summary>Input and output</summary>
                    {step.input_preview && <p><span>In</span>{step.input_preview}</p>}
                    {step.output_preview && <p><span>Out</span>{step.output_preview}</p>}
                  </details>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {chunks.length > 0 && (
        <section className="inspector-section">
          <h3>Retrieved chunks <span className="count">{chunks.length}</span></h3>
          <ul className="chunk-results">
            {chunks.map((chunk, i) => (
              <li key={i}>
                <div className="chunk-results-head">
                  <span className="mono">Chunk {chunk.chunk_index}</span>
                  <ScoreBadge score={chunk.score} />
                </div>
                <p className="clamp-3">{chunk.text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function ScoreBadge({ score }) {
  const tone = score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'low';
  return <span className={`score score-${tone} mono`}>{score.toFixed(3)}</span>;
}
