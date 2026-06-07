import { useState, useMemo } from 'react';
import { IconBook, IconPlay, IconX, IconChevronDown, IconChevronRight, IconCheckCircle, IconAlertCircle, IconGitBranch, IconSearch, IconExternalLink } from './Icons';

// Map RAG type IDs to their runnable engine labels
const RUNNABLE_ENGINES = ['traditional', 'hybrid', 'graph', 'agentic'];

// Category display order
const CATEGORY_ORDER = {
  runnable: 0,
  showcase: 1,
};

// RAG evolution timeline data
const RAG_TIMELINE = [
  { year: '2020', label: 'RAG v1', desc: 'Lewis et al. — Original RAG paper (Naive)' },
  { year: '2022', label: 'HyDE', desc: 'Zero-shot dense retrieval via hypothetical docs' },
  { year: '2023', label: 'CRAG / Self-RAG / FLARE', desc: 'Self-correcting retrieval patterns emerge' },
  { year: '2023', label: 'Fusion RAG', desc: 'Multi-query fusion via RRF' },
  { year: '2024', label: 'GraphRAG', desc: 'Microsoft — Knowledge graph community summaries' },
  { year: '2024', label: 'LightRAG / Modular RAG', desc: 'Dual-level graph + composable pipeline patterns' },
  { year: '2024', label: 'Multimodal RAG', desc: 'ColPali — PDF pages as image embeddings' },
  { year: '2025', label: 'LazyGraphRAG / StructRAG', desc: 'Cost-efficient graph + dynamic structure routing' },
];

// Comparison table dimensions
const COMPARISON_DIMS = [
  { key: 'indexCost', label: 'Index Cost' },
  { key: 'queryLatency', label: 'Query Latency' },
  { key: 'multiHop', label: 'Multi-hop' },
  { key: 'selfCorrect', label: 'Self-Correct' },
  { key: 'implementation', label: 'Complexity' },
];

// Static comparison data per RAG type
const RAG_COMPARISON = {
  naive:        { indexCost: '⚡ Free', queryLatency: '🟢 Fast', multiHop: '❌ No', selfCorrect: '❌ No', implementation: '🟢 Simple' },
  traditional:  { indexCost: '⚡ Free', queryLatency: '🟢 Fast', multiHop: '❌ No', selfCorrect: '❌ No', implementation: '🟢 Simple' },
  advanced:     { indexCost: '⚡ Free', queryLatency: '🟡 Medium', multiHop: '⚠️ Limited', selfCorrect: '❌ No', implementation: '🟡 Medium' },
  hybrid:       { indexCost: '⚡ Free', queryLatency: '🟡 Medium', multiHop: '⚠️ Limited', selfCorrect: '❌ No', implementation: '🟡 Medium' },
  modular:      { indexCost: '⚡ Free', queryLatency: '🟡 Medium', multiHop: '⚠️ Limited', selfCorrect: '❌ No', implementation: '🔴 High' },
  graph:        { indexCost: '💸 High', queryLatency: '🔴 Slow', multiHop: '✅ Yes', selfCorrect: '❌ No', implementation: '🔴 High' },
  lazygraphrag: { indexCost: '⚡ Free', queryLatency: '🟡 Medium', multiHop: '✅ Yes', selfCorrect: '❌ No', implementation: '🔴 High' },
  lightrag:     { indexCost: '🟡 Medium', queryLatency: '🟡 Medium', multiHop: '✅ Yes', selfCorrect: '❌ No', implementation: '🟡 Medium' },
  agentic:      { indexCost: '⚡ Free', queryLatency: '🔴 Slow', multiHop: '✅ Yes', selfCorrect: '✅ Yes', implementation: '🔴 High' },
  crag:         { indexCost: '⚡ Free', queryLatency: '🟡 Medium', multiHop: '⚠️ Limited', selfCorrect: '✅ Yes', implementation: '🟡 Medium' },
  selfrag:      { indexCost: '💸 High', queryLatency: '🟡 Medium', multiHop: '⚠️ Limited', selfCorrect: '✅ Yes', implementation: '🔴 High' },
  hyde:         { indexCost: '⚡ Free', queryLatency: '🟡 Medium', multiHop: '❌ No', selfCorrect: '❌ No', implementation: '🟢 Simple' },
  flare:        { indexCost: '⚡ Free', queryLatency: '🔴 Slow', multiHop: '✅ Yes', selfCorrect: '⚠️ Partial', implementation: '🔴 High' },
  fusion:       { indexCost: '⚡ Free', queryLatency: '🟡 Medium', multiHop: '❌ No', selfCorrect: '❌ No', implementation: '🟡 Medium' },
  multimodal:   { indexCost: '🟡 Medium', queryLatency: '🟡 Medium', multiHop: '❌ No', selfCorrect: '❌ No', implementation: '🔴 High' },
  structrag:    { indexCost: '🟡 Medium', queryLatency: '🟡 Medium', multiHop: '✅ Yes', selfCorrect: '❌ No', implementation: '🔴 High' },
};

function CategoryBadge({ category }) {
  const isRunnable = category === 'runnable';
  return (
    <span className={`arch-badge ${isRunnable ? 'arch-badge-runnable' : 'arch-badge-showcase'}`}>
      {isRunnable ? <><IconPlay /> Runnable</> : <><IconBook /> Showcase</>}
    </span>
  );
}

function ArchCard({ rag, isSelected, onClick }) {
  return (
    <div
      className={`arch-card ${isSelected ? 'arch-card-selected' : ''}`}
      style={{ '--card-color': rag.color }}
      onClick={onClick}
      id={`arch-card-${rag.id}`}
    >
      <div className="arch-card-top">
        <span className="arch-card-icon">{rag.icon}</span>
        <CategoryBadge category={rag.category} />
      </div>
      <h3 className="arch-card-name">{rag.name}</h3>
      <p className="arch-card-desc">{rag.best_for}</p>
      <div className="arch-card-footer">
        <span className="arch-card-origin">{rag.origin.split('—')[0].trim()}</span>
        <span className="arch-card-arrow">{isSelected ? '▲' : '▼'}</span>
      </div>
    </div>
  );
}

function PipelineDiagram({ diagram }) {
  if (!diagram) return null;
  return (
    <div className="pipeline-diagram">
      <div className="pipeline-diagram-label">
        <IconGitBranch /> Pipeline
      </div>
      <pre className="pipeline-diagram-code">{diagram}</pre>
    </div>
  );
}

function ArchDetailPanel({ rag, onClose, onTryIt }) {
  if (!rag) return null;

  return (
    <div className="arch-detail-overlay" onClick={onClose}>
      <div className="arch-detail-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="arch-detail-header" style={{ '--panel-color': rag.color }}>
          <div className="arch-detail-header-left">
            <span className="arch-detail-icon">{rag.icon}</span>
            <div>
              <h2 className="arch-detail-name">{rag.name}</h2>
              <CategoryBadge category={rag.category} />
            </div>
          </div>
          <button className="arch-detail-close" onClick={onClose}>
            <IconX />
          </button>
        </div>

        {/* Body */}
        <div className="arch-detail-body">
          {/* Key insight callout */}
          {rag.key_insight && (
            <div className="arch-key-insight">
              <span className="arch-key-insight-label">💡 Key Insight</span>
              <p>{rag.key_insight}</p>
            </div>
          )}

          {/* Description */}
          <p className="arch-detail-desc">{rag.description}</p>

          {/* Pipeline diagram */}
          <PipelineDiagram diagram={rag.pipeline_diagram} />

          {/* Two-column: strengths + weaknesses */}
          <div className="arch-sw-grid">
            {rag.strengths?.length > 0 && (
              <div className="arch-sw-col">
                <div className="arch-sw-header strengths-header">
                  <IconCheckCircle /> Strengths
                </div>
                <ul className="arch-sw-list">
                  {rag.strengths.map((s, i) => (
                    <li key={i} className="arch-sw-item arch-strength">{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {rag.weaknesses?.length > 0 && (
              <div className="arch-sw-col">
                <div className="arch-sw-header weaknesses-header">
                  <IconAlertCircle /> Weaknesses
                </div>
                <ul className="arch-sw-list">
                  {rag.weaknesses.map((w, i) => (
                    <li key={i} className="arch-sw-item arch-weakness">{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="arch-meta-grid">
            {rag.origin && (
              <div className="arch-meta-item">
                <span className="arch-meta-label">Origin</span>
                <span className="arch-meta-value">{rag.origin}</span>
              </div>
            )}
            {rag.used_by && (
              <div className="arch-meta-item">
                <span className="arch-meta-label">Used By</span>
                <span className="arch-meta-value">{rag.used_by}</span>
              </div>
            )}
            <div className="arch-meta-item">
              <span className="arch-meta-label">Best For</span>
              <span className="arch-meta-value">{rag.best_for}</span>
            </div>
          </div>

          {/* Workflow steps */}
          {rag.workflow_steps?.length > 0 && (
            <div className="arch-workflow">
              <div className="arch-workflow-label">Workflow Steps</div>
              <div className="arch-workflow-steps">
                {rag.workflow_steps.map((step, i) => (
                  <div key={i} className="arch-workflow-step">
                    <span className="arch-workflow-num">{i + 1}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="arch-detail-cta">
            {(rag.category === 'runnable' || rag.engine_id) && (
              <button
                className="btn-try-it"
                onClick={() => onTryIt(rag.engine_id || rag.id)}
                style={{ '--btn-color': rag.color }}
              >
                <IconPlay />
                {rag.category === 'runnable'
                  ? `Query with ${rag.name}`
                  : `Try with ${rag.name.split(' ')[0]} engine`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonTable({ ragTypes }) {
  const [sortKey, setSortKey] = useState(null);

  const visibleTypes = useMemo(() =>
    ragTypes.filter(r => RAG_COMPARISON[r.id]),
    [ragTypes]
  );

  return (
    <div className="glass-card" id="comparison-table-card">
      <div className="section-header">
        <IconGitBranch />
        <h2>ARCHITECTURE COMPARISON</h2>
        <div className="line" />
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
        Side-by-side comparison of all architectures across key operational dimensions.
      </p>
      <div className="comparison-table-wrapper">
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="comparison-th comparison-th-name">Architecture</th>
              {COMPARISON_DIMS.map(d => (
                <th
                  key={d.key}
                  className={`comparison-th ${sortKey === d.key ? 'active' : ''}`}
                  onClick={() => setSortKey(sortKey === d.key ? null : d.key)}
                >
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleTypes.map((rag) => {
              const cmp = RAG_COMPARISON[rag.id] || {};
              return (
                <tr key={rag.id} className={`comparison-row ${rag.category === 'runnable' ? 'runnable-row' : ''}`}>
                  <td className="comparison-td-name">
                    <span className="comparison-icon">{rag.icon}</span>
                    <span className="comparison-name">{rag.name}</span>
                    {rag.category === 'runnable' && (
                      <span className="comparison-runnable-dot" title="Runnable engine" />
                    )}
                  </td>
                  {COMPARISON_DIMS.map(d => (
                    <td key={d.key} className="comparison-td">{cmp[d.key] || '—'}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '12px', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <span>🟢 Runnable engine available</span>
        <span>💸 High = $5–50/MB corpus</span>
        <span>✅ = supported &nbsp; ⚠️ = partial &nbsp; ❌ = not supported</span>
      </div>
    </div>
  );
}

function RAGTimeline() {
  return (
    <div className="glass-card" id="rag-timeline-card">
      <div className="section-header">
        <IconBook />
        <h2>RAG EVOLUTION TIMELINE</h2>
        <div className="line" />
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
        From the original 2020 paper to the cutting-edge architectures of 2025–2026.
      </p>
      <div className="timeline-container">
        {RAG_TIMELINE.map((item, i) => (
          <div key={i} className="timeline-item">
            <div className="timeline-dot" />
            {i < RAG_TIMELINE.length - 1 && <div className="timeline-line" />}
            <div className="timeline-content">
              <span className="timeline-year">{item.year}</span>
              <span className="timeline-label">{item.label}</span>
              <span className="timeline-desc">{item.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ArchitectureShowcase({ ragTypes, onTryIt }) {
  const [selectedRag, setSelectedRag] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filtered = useMemo(() => {
    return ragTypes
      .filter(r => {
        const matchesSearch =
          !search ||
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.best_for.toLowerCase().includes(search.toLowerCase());
        const matchesCat = categoryFilter === 'all' || r.category === categoryFilter;
        return matchesSearch && matchesCat;
      })
      .sort((a, b) => (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99));
  }, [ragTypes, search, categoryFilter]);

  const runnable = filtered.filter(r => r.category === 'runnable');
  const showcase = filtered.filter(r => r.category === 'showcase');

  const handleTryIt = (engineId) => {
    onTryIt(engineId);
    setSelectedRag(null);
  };

  return (
    <div className="arch-showcase" id="arch-showcase">
      {/* Hero Banner */}
      <div className="arch-hero glass-card">
        <div className="arch-hero-content">
          <h2 className="arch-hero-title">
            RAG Architecture Library
          </h2>
          <p className="arch-hero-subtitle">
            14 industry architectures — from the 2020 original to 2025 cutting-edge.
            Explore, compare, and run the ones that fit your use case.
          </p>
          <div className="arch-hero-stats">
            <div className="arch-stat">
              <span className="arch-stat-num">14</span>
              <span className="arch-stat-label">Architectures</span>
            </div>
            <div className="arch-stat">
              <span className="arch-stat-num">4</span>
              <span className="arch-stat-label">Runnable Engines</span>
            </div>
            <div className="arch-stat">
              <span className="arch-stat-num">2020–2026</span>
              <span className="arch-stat-label">Timeline</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="arch-filters glass-card">
        <div className="arch-search-wrapper">
          <IconSearch />
          <input
            className="arch-search-input"
            type="text"
            placeholder="Search architectures..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="arch-search"
          />
        </div>
        <div className="arch-filter-tabs">
          {['all', 'runnable', 'showcase'].map(cat => (
            <button
              key={cat}
              className={`arch-filter-tab ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
              id={`arch-filter-${cat}`}
            >
              {cat === 'all' ? `All (${ragTypes.length})` :
               cat === 'runnable' ? `⚡ Runnable (${ragTypes.filter(r => r.category === 'runnable').length})` :
               `📖 Showcase (${ragTypes.filter(r => r.category === 'showcase').length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Runnable Engines */}
      {runnable.length > 0 && (
        <div>
          <div className="arch-section-header">
            <span className="arch-section-badge runnable">⚡ Runnable Engines</span>
            <span className="arch-section-sub">Query your documents with these live architectures</span>
          </div>
          <div className="arch-grid arch-grid-runnable">
            {runnable.map(rag => (
              <ArchCard
                key={rag.id}
                rag={rag}
                isSelected={selectedRag?.id === rag.id}
                onClick={() => setSelectedRag(selectedRag?.id === rag.id ? null : rag)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Showcase Architectures */}
      {showcase.length > 0 && (
        <div>
          <div className="arch-section-header">
            <span className="arch-section-badge showcase">📖 Architecture Showcase</span>
            <span className="arch-section-sub">Educational deep-dives into industry-standard patterns</span>
          </div>
          <div className="arch-grid">
            {showcase.map(rag => (
              <ArchCard
                key={rag.id}
                rag={rag}
                isSelected={selectedRag?.id === rag.id}
                onClick={() => setSelectedRag(selectedRag?.id === rag.id ? null : rag)}
              />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon">🔍</span>
          <h3>No architectures found</h3>
          <p>Try adjusting your search or filter.</p>
        </div>
      )}

      {/* Comparison Table */}
      <ComparisonTable ragTypes={ragTypes} />

      {/* RAG Timeline */}
      <RAGTimeline />

      {/* Detail Panel Modal */}
      {selectedRag && (
        <ArchDetailPanel
          rag={selectedRag}
          onClose={() => setSelectedRag(null)}
          onTryIt={handleTryIt}
        />
      )}
    </div>
  );
}
