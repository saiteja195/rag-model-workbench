import { useState, useMemo, useEffect, useRef } from 'react';
import {
  IconPlay, IconX, IconCheckCircle, IconAlertCircle, IconGitBranch,
} from './Icons';
import { getIconComponent } from './IconMap';
import { EmptyState, SearchInput, Segmented, EngineDot } from './ui';
import { matchesQuery } from '../utils/format';
import PipelineFlow from './PipelineFlow';
import { PIPELINES } from '../data/pipelines';

const TIMELINE = [
  { year: '2020', label: 'RAG', desc: 'Lewis et al. publish the original retrieval-augmented generation paper.' },
  { year: '2022', label: 'HyDE', desc: 'Zero-shot dense retrieval using hypothetical documents.' },
  { year: '2023', label: 'CRAG, Self-RAG, FLARE', desc: 'Self-correcting retrieval patterns emerge.' },
  { year: '2023', label: 'Fusion RAG', desc: 'Multi-query retrieval merged with reciprocal rank fusion.' },
  { year: '2024', label: 'GraphRAG', desc: 'Microsoft adds knowledge-graph community summaries.' },
  { year: '2024', label: 'LightRAG, Modular RAG', desc: 'Dual-level graph retrieval and composable pipelines.' },
  { year: '2024', label: 'Multimodal RAG', desc: 'ColPali embeds PDF pages as images.' },
  { year: '2025', label: 'LazyGraphRAG, StructRAG', desc: 'Cheaper graph indexing and dynamic structure routing.' },
];

// tone: good < warn < bad < muted, used for colour and for sorting best-first.
const DIMENSIONS = [
  { key: 'indexCost', label: 'Index cost', values: { free: ['Free', 'good'], medium: ['Medium', 'warn'], high: ['High', 'bad'] } },
  { key: 'latency', label: 'Query latency', values: { fast: ['Fast', 'good'], medium: ['Medium', 'warn'], slow: ['Slow', 'bad'] } },
  { key: 'multiHop', label: 'Multi-hop', values: { yes: ['Yes', 'good'], limited: ['Limited', 'warn'], no: ['No', 'muted'] } },
  { key: 'selfCorrect', label: 'Self-correcting', values: { yes: ['Yes', 'good'], partial: ['Partial', 'warn'], no: ['No', 'muted'] } },
  { key: 'complexity', label: 'Complexity', values: { simple: ['Simple', 'good'], medium: ['Medium', 'warn'], high: ['High', 'bad'] } },
];
const TONE_RANK = { good: 0, warn: 1, bad: 2, muted: 3 };

//                 cost      latency   multiHop  selfCorrect complexity
const COMPARISON = {
  naive:        ['free',   'fast',   'no',      'no',      'simple'],
  traditional:  ['free',   'fast',   'no',      'no',      'simple'],
  advanced:     ['free',   'medium', 'limited', 'no',      'medium'],
  hybrid:       ['free',   'medium', 'limited', 'no',      'medium'],
  modular:      ['free',   'medium', 'limited', 'no',      'high'],
  graph:        ['high',   'slow',   'yes',     'no',      'high'],
  lazygraphrag: ['free',   'medium', 'yes',     'no',      'high'],
  lightrag:     ['medium', 'medium', 'yes',     'no',      'medium'],
  agentic:      ['free',   'slow',   'yes',     'yes',     'high'],
  crag:         ['free',   'medium', 'limited', 'yes',     'medium'],
  selfrag:      ['high',   'medium', 'limited', 'yes',     'high'],
  hyde:         ['free',   'medium', 'no',      'no',      'simple'],
  flare:        ['free',   'slow',   'yes',     'partial', 'high'],
  fusion:       ['free',   'medium', 'no',      'no',      'medium'],
  multimodal:   ['medium', 'medium', 'no',      'no',      'high'],
  structrag:    ['medium', 'medium', 'yes',     'no',      'high'],
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'runnable', label: 'Runnable' },
  { value: 'showcase', label: 'Reference' },
];

function CategoryTag({ category }) {
  return category === 'runnable'
    ? <span className="badge badge-accent"><IconPlay /> Runnable</span>
    : <span className="badge">Reference</span>;
}

function ArchCard({ rag, onOpen }) {
  return (
    <button type="button" className="arch-card" style={{ '--dot': rag.color }} onClick={onOpen}>
      <span className="arch-card-icon">{getIconComponent(rag.icon)}</span>
      <span className="arch-card-body">
        <span className="arch-card-name">{rag.name}</span>
        <span className="arch-card-desc">{rag.best_for}</span>
      </span>
      <span className="arch-card-foot">
        <CategoryTag category={rag.category} />
        <span className="arch-card-origin">{(rag.origin || '').split('—')[0].trim()}</span>
      </span>
    </button>
  );
}

function DetailPanel({ rag, onClose, onTryIt }) {
  const closeRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  const engineId = rag.category === 'runnable' ? rag.id : rag.engine_id;

  return (
    <div className="drawer-scrim" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arch-detail-title"
        style={{ '--dot': rag.color }}
        onClick={e => e.stopPropagation()}
      >
        <header className="drawer-head">
          <span className="arch-card-icon">{getIconComponent(rag.icon)}</span>
          <div>
            <h2 id="arch-detail-title">{rag.name}</h2>
            <CategoryTag category={rag.category} />
          </div>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Close details">
            <IconX />
          </button>
        </header>

        <div className="drawer-body">
          {rag.key_insight && <p className="insight">{rag.key_insight}</p>}
          <p>{rag.description}</p>

          {(PIPELINES[rag.id] || rag.pipeline_diagram) && (
            <section>
              <h3><IconGitBranch /> How it works</h3>
              <PipelineFlow spec={PIPELINES[rag.id]} fallback={rag.pipeline_diagram} />
            </section>
          )}

          <div className="pros-cons">
            {rag.strengths?.length > 0 && (
              <section>
                <h3 className="good"><IconCheckCircle /> Strengths</h3>
                <ul>{rag.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </section>
            )}
            {rag.weaknesses?.length > 0 && (
              <section>
                <h3 className="bad"><IconAlertCircle /> Weaknesses</h3>
                <ul>{rag.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </section>
            )}
          </div>

          <dl className="facts">
            {rag.origin && <div><dt>Origin</dt><dd>{rag.origin}</dd></div>}
            {rag.used_by && <div><dt>Used by</dt><dd>{rag.used_by}</dd></div>}
            <div><dt>Best for</dt><dd>{rag.best_for}</dd></div>
          </dl>

          {rag.workflow_steps?.length > 0 && (
            <section>
              <h3>Workflow</h3>
              <ol className="plain-steps">
                {rag.workflow_steps.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
            </section>
          )}
        </div>

        {engineId && (
          <footer className="drawer-foot">
            <button type="button" className="btn btn-primary" onClick={() => onTryIt(engineId)}>
              <IconPlay />
              {rag.category === 'runnable' ? `Query with ${rag.name}` : `Try the ${engineId} engine`}
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}

function ComparisonTable({ ragTypes }) {
  const [sortKey, setSortKey] = useState(null);

  const rows = useMemo(() => {
    const list = ragTypes.filter(r => COMPARISON[r.id]);
    const idx = DIMENSIONS.findIndex(d => d.key === sortKey);
    if (idx < 0) return list;
    const rank = (r) => TONE_RANK[DIMENSIONS[idx].values[COMPARISON[r.id][idx]][1]];
    return [...list].sort((a, b) => rank(a) - rank(b));
  }, [ragTypes, sortKey]);

  return (
    <section className="panel" aria-labelledby="compare-table-title">
      <h2 className="panel-title" id="compare-table-title">Side by side</h2>
      <p className="muted small">Select a column heading to sort best-first.</p>
      <div className="table-scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th scope="col">Architecture</th>
              {DIMENSIONS.map(d => (
                <th
                  key={d.key}
                  scope="col"
                  aria-sort={sortKey === d.key ? 'ascending' : 'none'}
                >
                  <button type="button" onClick={() => setSortKey(sortKey === d.key ? null : d.key)}>
                    {d.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(rag => (
              <tr key={rag.id}>
                <th scope="row">
                  <EngineDot color={rag.color} />
                  {rag.name}
                  {rag.category === 'runnable' && <span className="badge badge-accent">Runnable</span>}
                </th>
                {DIMENSIONS.map((d, i) => {
                  const [label, tone] = d.values[COMPARISON[rag.id][i]];
                  return (
                    <td key={d.key}><span className={`tone tone-${tone}`}>{label}</span></td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">High index cost is roughly $5 to $50 per MB of corpus.</p>
    </section>
  );
}

function Timeline() {
  return (
    <section className="panel" aria-labelledby="timeline-title">
      <h2 className="panel-title" id="timeline-title">How RAG evolved</h2>
      <ol className="timeline">
        {TIMELINE.map((item, i) => (
          <li key={i}>
            <span className="timeline-year mono">{item.year}</span>
            <div>
              <strong>{item.label}</strong>
              <p>{item.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function ArchitectureShowcase({ ragTypes, onTryIt }) {
  const [openId, setOpenId] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = useMemo(
    () => ragTypes.filter(r => matchesQuery(r, search) && (category === 'all' || r.category === category)),
    [ragTypes, search, category],
  );
  const runnable = filtered.filter(r => r.category === 'runnable');
  const reference = filtered.filter(r => r.category !== 'runnable');
  const runnableTotal = ragTypes.filter(r => r.category === 'runnable').length;
  const open = ragTypes.find(r => r.id === openId);

  return (
    <div className="library">
      <header className="page-head">
        <h1>Architecture library</h1>
        <p>
          {ragTypes.length} retrieval architectures from 2020 to today.
          {' '}{runnableTotal} can run on your documents; the rest are reference write-ups.
        </p>
      </header>

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search architectures" />
        <Segmented options={FILTERS} value={category} onChange={setCategory} label="Filter by type" />
      </div>

      {runnable.length > 0 && (
        <section aria-label="Runnable engines">
          <h2 className="group-title">Runnable <span className="count">{runnable.length}</span></h2>
          <div className="arch-grid">
            {runnable.map(r => <ArchCard key={r.id} rag={r} onOpen={() => setOpenId(r.id)} />)}
          </div>
        </section>
      )}

      {reference.length > 0 && (
        <section aria-label="Reference architectures">
          <h2 className="group-title">Reference <span className="count">{reference.length}</span></h2>
          <div className="arch-grid">
            {reference.map(r => <ArchCard key={r.id} rag={r} onOpen={() => setOpenId(r.id)} />)}
          </div>
        </section>
      )}

      {filtered.length === 0 && (
        <EmptyState title="No architectures match">Try a different search or filter.</EmptyState>
      )}

      <ComparisonTable ragTypes={ragTypes} />
      <Timeline />

      {open && (
        <DetailPanel
          rag={open}
          onClose={() => setOpenId(null)}
          onTryIt={(id) => { setOpenId(null); onTryIt(id); }}
        />
      )}
    </div>
  );
}
