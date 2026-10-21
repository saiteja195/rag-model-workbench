import { useState } from 'react';
import { runQuery } from '../api/client';
import { IconBarChart, IconCheck } from './Icons';
import { EmptyState, EngineDot, LatencyBar, Stat } from './ui';
import FileUpload from './FileUpload';
import { formatMs } from '../utils/format';

export default function CompareView({ fileId, ragTypes, onUploaded }) {
  const runnable = ragTypes.filter(r => r.category === 'runnable');
  const [chosen, setChosen] = useState(null); // null = all runnable
  const [question, setQuestion] = useState('');
  const [runs, setRuns] = useState({}); // id -> { status, result, error }

  const selectedIds = chosen ?? runnable.map(r => r.id);
  const isRunning = Object.values(runs).some(r => r.status === 'loading');

  const toggle = (id) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id];
    setChosen(next);
  };

  const compare = () => {
    const q = question.trim();
    if (!q || !fileId || isRunning || selectedIds.length === 0) return;

    setRuns(Object.fromEntries(selectedIds.map(id => [id, { status: 'loading' }])));
    // Each engine reports as soon as it finishes instead of waiting for the slowest.
    selectedIds.forEach(id => {
      runQuery(q, id, fileId)
        .then(result => setRuns(prev => ({ ...prev, [id]: { status: 'done', result } })))
        .catch(err => setRuns(prev => ({ ...prev, [id]: { status: 'error', error: err.message } })));
    });
  };

  const entries = selectedIds
    .filter(id => runs[id])
    .map(id => ({ rag: runnable.find(r => r.id === id), id, ...runs[id] }));
  const done = entries.filter(e => e.status === 'done');
  const slowest = Math.max(1, ...done.map(e => e.result.total_time_ms));
  const fastestId = !isRunning && done.length > 1
    ? done.reduce((a, b) => (b.result.total_time_ms < a.result.total_time_ms ? b : a)).id
    : null;

  if (!fileId) {
    return (
      <div className="panel">
        <EmptyState icon={<IconBarChart />} title="Pick a document to compare engines">
          Select one in the setup panel or upload a new file.
        </EmptyState>
        <FileUpload variant="full" onUploaded={onUploaded} />
      </div>
    );
  }

  return (
    <div className="compare">
      <header className="page-head">
        <h1>Compare engines</h1>
        <p>Ask one question and run it through several engines. Results appear as each one finishes.</p>
      </header>

      <fieldset className="engine-chips">
        <legend>Engines to run</legend>
        {runnable.map(rag => {
          const on = selectedIds.includes(rag.id);
          return (
            <label key={rag.id} className={`chip chip-toggle ${on ? 'on' : ''}`}>
              <input type="checkbox" checked={on} onChange={() => toggle(rag.id)} disabled={isRunning} />
              {on ? <IconCheck /> : <EngineDot color={rag.color} />}
              {rag.name}
            </label>
          );
        })}
      </fieldset>

      <form className="composer" onSubmit={(e) => { e.preventDefault(); compare(); }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question to run through each engine"
          aria-label="Question to compare"
          disabled={isRunning}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!question.trim() || isRunning || selectedIds.length === 0}
        >
          {isRunning ? 'Running…' : `Compare ${selectedIds.length}`}
        </button>
      </form>

      {entries.length === 0 && (
        <EmptyState icon={<IconBarChart />} title="No comparison yet">
          Choose the engines above, then ask a question to see answers and timing side by side.
        </EmptyState>
      )}

      {done.length > 0 && (
        <section className="panel" aria-label="Latency comparison">
          <h2 className="panel-title">Latency</h2>
          <ul className="latency-rank">
            {[...done].sort((a, b) => a.result.total_time_ms - b.result.total_time_ms).map(e => (
              <li key={e.id}>
                <span className="latency-rank-name"><EngineDot color={e.rag?.color} />{e.rag?.name || e.id}</span>
                <LatencyBar result={e.result} scale={slowest} />
                <span className="mono">{formatMs(e.result.total_time_ms)}</span>
              </li>
            ))}
          </ul>
          <ul className="latency-legend">
            <li><span className="latency-swatch seg-embed" />Embedding</li>
            <li><span className="latency-swatch seg-retrieve" />Retrieval</li>
            <li><span className="latency-swatch seg-generate" />Generation</li>
          </ul>
        </section>
      )}

      {entries.length > 0 && (
        <div className="compare-grid">
          {entries.map(e => (
            <article
              key={e.id}
              className={`run-card ${e.id === fastestId ? 'fastest' : ''}`}
              style={{ '--dot': e.rag?.color }}
              aria-busy={e.status === 'loading'}
            >
              <header>
                <h3><EngineDot color={e.rag?.color} />{e.rag?.name || e.id}</h3>
                {e.id === fastestId && <span className="badge badge-good">Fastest</span>}
                {e.status === 'loading' && <span className="badge">Running</span>}
                {e.status === 'error' && <span className="badge badge-bad">Failed</span>}
              </header>

              {e.status === 'loading' && <div className="skeleton" aria-hidden="true"><i /><i /><i /></div>}

              {e.status === 'error' && <p className="form-error" role="alert">{e.error}</p>}

              {e.status === 'done' && (
                <>
                  <p className="answer-text">{e.result.answer}</p>
                  <dl className="stats stats-tight">
                    <Stat label="Total" value={formatMs(e.result.total_time_ms)} />
                    <Stat label="Retrieval" value={formatMs(e.result.retrieval_time_ms)} />
                    <Stat label="Generation" value={formatMs(e.result.generation_time_ms)} />
                    <Stat label="Chunks" value={e.result.chunks_searched} />
                  </dl>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
