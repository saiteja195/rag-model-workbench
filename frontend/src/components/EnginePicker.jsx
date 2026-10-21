import { EngineDot } from './ui';

/** Single-select list of the engines that can run against a document. */
export default function EnginePicker({ ragTypes, selected, onSelect, error, onRetry }) {
  const runnable = ragTypes.filter(r => r.category === 'runnable');

  if (error) {
    return (
      <div className="inline-notice" role="alert">
        <p>Can't reach the API, so engines aren't available.</p>
        <button type="button" className="btn btn-quiet" onClick={onRetry}>Try again</button>
      </div>
    );
  }

  if (runnable.length === 0) {
    return <p className="muted small">Loading engines…</p>;
  }

  return (
    <div className="engine-list" role="radiogroup" aria-label="Retrieval engine">
      {runnable.map(rag => (
        <button
          key={rag.id}
          type="button"
          role="radio"
          aria-checked={selected === rag.id}
          className={`engine-option ${selected === rag.id ? 'active' : ''}`}
          onClick={() => onSelect(rag.id)}
        >
          <EngineDot color={rag.color} />
          <span className="engine-option-text">
            <span className="engine-option-name">{rag.name}</span>
            <span className="engine-option-desc">{rag.best_for}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
