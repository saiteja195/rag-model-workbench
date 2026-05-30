import { useState, useEffect } from 'react';
import { getDocumentChunks } from '../api/client';

export default function ChunkViewer({ fileId, highlightedChunks = [] }) {
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!fileId) return;
    setLoading(true);
    getDocumentChunks(fileId)
      .then(setChunks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fileId]);

  const highlightedSet = new Set(highlightedChunks.map(c => c.chunk_index));

  const filteredChunks = filter
    ? chunks.filter(c => c.text.toLowerCase().includes(filter.toLowerCase()))
    : chunks;

  // Sort: highlighted chunks first
  const sortedChunks = [...filteredChunks].sort((a, b) => {
    const aHl = highlightedSet.has(a.chunk_index) ? 0 : 1;
    const bHl = highlightedSet.has(b.chunk_index) ? 0 : 1;
    if (aHl !== bHl) return aHl - bHl;
    return a.chunk_index - b.chunk_index;
  });

  const getScoreClass = (chunkIndex) => {
    const match = highlightedChunks.find(c => c.chunk_index === chunkIndex);
    if (!match) return '';
    if (match.score > 0.7) return 'high';
    if (match.score > 0.4) return 'medium';
    return 'low';
  };

  const getScore = (chunkIndex) => {
    const match = highlightedChunks.find(c => c.chunk_index === chunkIndex);
    return match ? match.score : null;
  };

  if (!fileId) {
    return (
      <div className="glass-card">
        <div className="empty-state">
          <span className="empty-state-icon">📄</span>
          <h3>No Document Selected</h3>
          <p>Upload a document to see its chunks here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="section-header">
        <h2>🧩 Document Chunks ({chunks.length})</h2>
        <div className="line" />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          className="chat-input"
          placeholder="Filter chunks..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ borderRadius: '8px', width: '100%' }}
          id="chunk-filter"
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="loading-spinner" />
        </div>
      ) : (
        <div className="chunk-viewer" id="chunk-viewer">
          {sortedChunks.map((chunk) => {
            const isHighlighted = highlightedSet.has(chunk.chunk_index);
            const score = getScore(chunk.chunk_index);
            return (
              <div
                key={chunk.chunk_id}
                className={`chunk-card ${isHighlighted ? 'highlighted' : ''}`}
                id={`chunk-${chunk.chunk_index}`}
              >
                <div className="chunk-header">
                  <span className="chunk-index">Chunk #{chunk.chunk_index}</span>
                  {score !== null && (
                    <span className={`chunk-score ${getScoreClass(chunk.chunk_index)}`}>
                      Score: {score.toFixed(3)}
                    </span>
                  )}
                </div>
                <div className="chunk-text">
                  {chunk.text.length > 300
                    ? chunk.text.substring(0, 300) + '...'
                    : chunk.text}
                </div>
                {chunk.embedding_preview && chunk.embedding_preview.length > 0 && (
                  <div className="chunk-embedding">
                    embedding: [{chunk.embedding_preview.map(v => v.toFixed(4)).join(', ')}, ...]
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
