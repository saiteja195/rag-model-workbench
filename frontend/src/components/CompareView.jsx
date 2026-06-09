import { useState } from 'react';
import { compareRAGTypes } from '../api/client';
import { IconBarChart, IconZap, IconTarget, IconNetwork, IconBot, IconLoader, IconSearch, IconBrain } from './Icons';

const RAG_META = {
  traditional: { icon: <IconTarget />, color: '#6366f1' },
  hybrid:      { icon: <IconZap />, color: '#f59e0b' },
  graph:       { icon: <IconNetwork />, color: '#10b981' },
  agentic:     { icon: <IconBot />, color: '#ec4899' },
  naive:       { icon: <IconSearch />, color: '#64748b' },
  hyde:        { icon: <IconBrain />, color: '#8b5cf6' },
};

export default function CompareView({ fileId }) {
  const [question, setQuestion] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCompare = async () => {
    if (!question.trim() || !fileId || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await compareRAGTypes(question, fileId);
      setResults(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCompare();
  };

  // Find the fastest result, ignoring error entries (total_time_ms === 0 means exception placeholder)
  const fastestIdx = results?.results?.reduce((minIdx, r, i, arr) => {
    if (r.total_time_ms === 0) return minIdx;
    if (arr[minIdx].total_time_ms === 0) return i;
    return r.total_time_ms < arr[minIdx].total_time_ms ? i : minIdx;
  }, 0);

  return (
    <div className="glass-card">
      <div className="section-header">
        <IconBarChart />
        <h2>COMPARE RAG TYPES</h2>
        <div className="line" />
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
        Run the same question across all RAG types simultaneously and compare results side by side.
      </p>

      <div className="chat-input-wrapper" style={{ marginBottom: '16px' }}>
        <input
          className="chat-input"
          type="text"
          placeholder={fileId ? 'Ask a question to compare all RAG types...' : 'Upload a document first...'}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!fileId || isLoading}
          id="compare-input"
        />
        <button
          className="btn btn-primary"
          onClick={handleCompare}
          disabled={!question.trim() || !fileId || isLoading}
          id="compare-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {isLoading ? <IconLoader /> : 'Compare'}
        </button>
      </div>

      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '12px' }}>
          ❌ {error}
        </p>
      )}

      {results && results.results && (
        <div className="compare-grid" id="compare-grid">
          {results.results.map((result, i) => {
            const meta = RAG_META[result.rag_type] || RAG_META.traditional;
            const isWinner = i === fastestIdx;
            return (
              <div
                key={result.rag_type}
                className={`compare-card ${isWinner ? 'winner' : ''}`}
                style={{ '--card-accent': meta.color }}
                id={`compare-${result.rag_type}`}
              >
                <div className="compare-header">
                  <span className="icon">{meta.icon}</span>
                  <h3>{result.rag_type.charAt(0).toUpperCase() + result.rag_type.slice(1)} RAG</h3>
                </div>

                <div className="compare-answer">
                  {result.answer}
                </div>

                <div className="compare-metrics">
                  <div className="compare-metric">
                    <div className="compare-metric-value">{result.total_time_ms.toFixed(0)}ms</div>
                    <div className="compare-metric-label">Total</div>
                  </div>
                  <div className="compare-metric">
                    <div className="compare-metric-value">{result.retrieval_time_ms.toFixed(0)}ms</div>
                    <div className="compare-metric-label">Retrieval</div>
                  </div>
                  <div className="compare-metric">
                    <div className="compare-metric-value">{result.generation_time_ms.toFixed(0)}ms</div>
                    <div className="compare-metric-label">Generation</div>
                  </div>
                  <div className="compare-metric">
                    <div className="compare-metric-value">{result.chunks_searched}</div>
                    <div className="compare-metric-label">Chunks</div>
                  </div>
                </div>

                {result.workflow_steps && (
                  <div style={{
                    marginTop: '12px',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {result.workflow_steps.length} workflow steps
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
