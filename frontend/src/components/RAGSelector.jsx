const RAG_COLORS = {
  traditional: { accent: '#6366f1', glow: 'rgba(99, 102, 241, 0.3)' },
  hybrid:      { accent: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
  graph:       { accent: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' },
  agentic:     { accent: '#ec4899', glow: 'rgba(236, 72, 153, 0.3)' },
};

export default function RAGSelector({ ragTypes, selectedType, onSelect }) {
  if (!ragTypes || ragTypes.length === 0) {
    return (
      <div>
        <div className="section-header">
          <h2>⚡ RAG Type</h2>
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

  return (
    <div>
      <div className="section-header">
        <h2>⚡ RAG Type</h2>
        <div className="line" />
      </div>
      <div className="rag-selector" id="rag-selector">
        {ragTypes.map((rag) => {
          const colors = RAG_COLORS[rag.id] || RAG_COLORS.traditional;
          return (
            <div
              key={rag.id}
              className={`rag-card ${selectedType === rag.id ? 'active' : ''}`}
              onClick={() => onSelect(rag.id)}
              style={{
                '--card-accent': colors.accent,
                '--card-glow': colors.glow,
              }}
              id={`rag-card-${rag.id}`}
            >
              <div className="rag-card-header">
                <div className="rag-card-icon">{rag.icon}</div>
                <span className="rag-card-name">{rag.name}</span>
              </div>
              <p className="rag-card-desc">
                {rag.best_for}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
