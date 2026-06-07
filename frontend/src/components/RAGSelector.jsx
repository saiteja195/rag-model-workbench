import { useState } from 'react';
import { IconSettings, IconTarget, IconZap, IconNetwork, IconBot, IconBook, IconPlay, IconChevronDown, IconChevronRight, IconSearch } from './Icons';

const RAG_COLORS = {
  traditional:  { accent: '#6366f1', glow: 'rgba(99, 102, 241, 0.3)' },
  hybrid:       { accent: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
  graph:        { accent: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' },
  agentic:      { accent: '#ec4899', glow: 'rgba(236, 72, 153, 0.3)' },
  naive:        { accent: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.3)' },
  advanced:     { accent: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.3)' },
  modular:      { accent: '#14b8a6', glow: 'rgba(20, 184, 166, 0.3)' },
  lazygraphrag: { accent: '#22d3ee', glow: 'rgba(34, 211, 238, 0.3)' },
  lightrag:     { accent: '#a78bfa', glow: 'rgba(167, 139, 250, 0.3)' },
  crag:         { accent: '#f43f5e', glow: 'rgba(244, 63, 94, 0.3)' },
  selfrag:      { accent: '#fb923c', glow: 'rgba(251, 146, 60, 0.3)' },
  hyde:         { accent: '#d946ef', glow: 'rgba(217, 70, 239, 0.3)' },
  flare:        { accent: '#84cc16', glow: 'rgba(132, 204, 22, 0.3)' },
  fusion:       { accent: '#06b6d4', glow: 'rgba(6, 182, 212, 0.3)' },
  multimodal:   { accent: '#f97316', glow: 'rgba(249, 115, 22, 0.3)' },
  structrag:    { accent: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
};

const RAG_ICONS = {
  traditional:  <IconTarget />,
  hybrid:       <IconZap />,
  graph:        <IconNetwork />,
  agentic:      <IconBot />,
};

function RAGCard({ rag, isSelected, onSelect }) {
  const colors = RAG_COLORS[rag.id] || RAG_COLORS.traditional;
  const icon = RAG_ICONS[rag.id] || null;
  const isRunnable = rag.category === 'runnable';

  return (
    <div
      className={`rag-card ${isSelected ? 'active' : ''} ${!isRunnable ? 'rag-card-showcase' : ''}`}
      onClick={() => onSelect(rag)}
      style={{
        '--card-accent': colors.accent,
        '--card-glow': colors.glow,
      }}
      id={`rag-card-${rag.id}`}
    >
      <div className="rag-card-header">
        <div className="rag-card-icon">
          {icon || <span style={{ fontSize: '0.9rem' }}>{rag.icon}</span>}
        </div>
        <span className="rag-card-name">{rag.name}</span>
        {!isRunnable && (
          <span className="rag-card-showcase-badge" title="Showcase only">📖</span>
        )}
      </div>
      <p className="rag-card-desc">{rag.best_for}</p>
    </div>
  );
}

export default function RAGSelector({ ragTypes, selectedType, onSelect, onShowcaseSelect }) {
  const [runnableOpen, setRunnableOpen] = useState(true);
  const [showcaseOpen, setShowcaseOpen] = useState(true);
  const [search, setSearch] = useState('');

  if (!ragTypes || ragTypes.length === 0) {
    return (
      <div>
        <div className="section-header">
          <IconSettings />
          <h2>RAG TYPE</h2>
          <div className="line" />
        </div>
        <div className="empty-state" style={{ padding: '24px' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            Loading RAG types...
          </p>
        </div>
      </div>
    );
  }

  const runnable = ragTypes.filter(r => r.category === 'runnable');
  const showcase = ragTypes.filter(r => r.category === 'showcase');

  const filterRags = (list) =>
    list.filter(r =>
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase())
    );

  const filteredRunnable = filterRags(runnable);
  const filteredShowcase = filterRags(showcase);

  const handleSelect = (rag) => {
    if (rag.category === 'runnable') {
      onSelect(rag.id);
    } else {
      // Navigate to architectures tab for showcase types
      if (onShowcaseSelect) onShowcaseSelect(rag.id);
    }
  };

  return (
    <div>
      <div className="section-header">
        <IconSettings />
        <h2>RAG TYPE</h2>
        <div className="line" />
      </div>

      {/* Search */}
      <div className="rag-search-wrapper">
        <IconSearch />
        <input
          className="rag-search-input"
          type="text"
          placeholder="Search architectures..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          id="rag-search-input"
        />
      </div>

      {/* Runnable Engines */}
      <div className="rag-group">
        <button
          className="rag-group-header"
          onClick={() => setRunnableOpen(p => !p)}
          id="rag-group-runnable"
        >
          <span className="rag-group-badge runnable-badge">
            <IconPlay /> Runnable
          </span>
          <span className="rag-group-count">{filteredRunnable.length}</span>
          <span className="rag-group-chevron">
            {runnableOpen ? <IconChevronDown /> : <IconChevronRight />}
          </span>
        </button>
        {runnableOpen && (
          <div className="rag-selector" id="rag-selector-runnable">
            {filteredRunnable.map(rag => (
              <RAGCard
                key={rag.id}
                rag={rag}
                isSelected={selectedType === rag.id}
                onSelect={handleSelect}
              />
            ))}
            {filteredRunnable.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '8px' }}>
                No matches
              </p>
            )}
          </div>
        )}
      </div>

      {/* Showcase Library */}
      <div className="rag-group">
        <button
          className="rag-group-header"
          onClick={() => setShowcaseOpen(p => !p)}
          id="rag-group-showcase"
        >
          <span className="rag-group-badge showcase-badge">
            <IconBook /> Library
          </span>
          <span className="rag-group-count">{filteredShowcase.length}</span>
          <span className="rag-group-chevron">
            {showcaseOpen ? <IconChevronDown /> : <IconChevronRight />}
          </span>
        </button>
        {showcaseOpen && (
          <div className="rag-selector" id="rag-selector-showcase">
            {filteredShowcase.map(rag => (
              <RAGCard
                key={rag.id}
                rag={rag}
                isSelected={selectedType === rag.id}
                onSelect={handleSelect}
              />
            ))}
            {filteredShowcase.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '8px' }}>
                No matches
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
