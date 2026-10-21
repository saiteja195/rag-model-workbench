import { IconSearch } from './Icons';
import { formatMs } from '../utils/format';

export function EngineDot({ color }) {
  return <span className="engine-dot" style={{ '--dot': color }} aria-hidden="true" />;
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="empty-state">
      {icon && <span className="empty-state-icon" aria-hidden="true">{icon}</span>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, label, className = '' }) {
  return (
    <label className={`search-input ${className}`}>
      <IconSearch />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label || placeholder}
      />
    </label>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? 'active' : ''}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>{value}{hint && <span className="stat-hint">{hint}</span>}</dd>
    </div>
  );
}

/**
 * Stacked bar splitting a run's latency into embedding / retrieval /
 * generation / other. `scale` is the value that fills the full track, so
 * several bars can share one scale (compare view) or each fill itself.
 */
export function LatencyBar({ result, scale, legend = false }) {
  const total = result.total_time_ms || 0;
  const embed = result.embedding_time_ms || 0;
  const retrieve = result.retrieval_time_ms || 0;
  const generate = result.generation_time_ms || 0;
  const other = Math.max(0, total - embed - retrieve - generate);
  const full = scale || total || 1;

  const segments = [
    { key: 'embed', label: 'Embedding', value: embed },
    { key: 'retrieve', label: 'Retrieval', value: retrieve },
    { key: 'generate', label: 'Generation', value: generate },
    { key: 'other', label: 'Other', value: other },
  ];

  return (
    <div className="latency">
      <div
        className="latency-track"
        role="img"
        aria-label={segments.map(s => `${s.label} ${formatMs(s.value)}`).join(', ')}
      >
        {segments.map(s => (
          <span
            key={s.key}
            className={`latency-seg seg-${s.key}`}
            style={{ width: `${(s.value / full) * 100}%` }}
          />
        ))}
      </div>
      {legend && (
        <ul className="latency-legend">
          {segments.filter(s => s.key !== 'other' || s.value > 1).map(s => (
            <li key={s.key}>
              <span className={`latency-swatch seg-${s.key}`} aria-hidden="true" />
              {s.label}
              <span className="mono">{formatMs(s.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
