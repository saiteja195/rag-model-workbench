export default function MetricsPanel({ queryResult }) {
  if (!queryResult) {
    return null;
  }

  const metrics = [
    {
      label: 'Total Time',
      value: `${queryResult.total_time_ms.toFixed(0)}ms`,
      color: '#6366f1',
      percent: Math.min(100, (queryResult.total_time_ms / 5000) * 100),
    },
    {
      label: 'Embedding',
      value: `${queryResult.embedding_time_ms.toFixed(0)}ms`,
      color: '#06b6d4',
      percent: Math.min(100, (queryResult.embedding_time_ms / queryResult.total_time_ms) * 100),
    },
    {
      label: 'Retrieval',
      value: `${queryResult.retrieval_time_ms.toFixed(0)}ms`,
      color: '#10b981',
      percent: Math.min(100, (queryResult.retrieval_time_ms / queryResult.total_time_ms) * 100),
    },
    {
      label: 'Generation',
      value: `${queryResult.generation_time_ms.toFixed(0)}ms`,
      color: '#f59e0b',
      percent: Math.min(100, (queryResult.generation_time_ms / queryResult.total_time_ms) * 100),
    },
    {
      label: 'Chunks Retrieved',
      value: queryResult.chunks_searched,
      color: '#ec4899',
      percent: Math.min(100, (queryResult.chunks_searched / 10) * 100),
    },
    {
      label: 'Workflow Steps',
      value: queryResult.workflow_steps?.length || 0,
      color: '#8b5cf6',
      percent: Math.min(100, ((queryResult.workflow_steps?.length || 0) / 10) * 100),
    },
  ];

  return (
    <div className="glass-card">
      <div className="section-header">
        <h2>📊 Performance Metrics</h2>
        <div className="line" />
      </div>
      <div className="metrics-grid" id="metrics-grid">
        {metrics.map((m, i) => (
          <div key={i} className="metric-card">
            <div className="metric-value" style={{
              background: `linear-gradient(135deg, ${m.color}, ${m.color}cc)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {m.value}
            </div>
            <div className="metric-label">{m.label}</div>
            <div className="metric-bar">
              <div
                className="metric-bar-fill"
                style={{
                  width: `${m.percent}%`,
                  background: `linear-gradient(90deg, ${m.color}, ${m.color}88)`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
