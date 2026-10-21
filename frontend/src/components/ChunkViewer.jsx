import { useState, useEffect, useMemo } from 'react';
import { getDocumentChunks } from '../api/client';
import { IconLayers } from './Icons';
import { EmptyState, SearchInput } from './ui';
import FileUpload from './FileUpload';
import { ScoreBadge } from './RunInspector';

const PAGE = 40;

export default function ChunkViewer({ fileId, highlightedChunks = [], onUploaded }) {
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [visible, setVisible] = useState(PAGE);
  const [retrievedFirst, setRetrievedFirst] = useState(true);

  useEffect(() => {
    if (!fileId) { setChunks([]); return; }
    setLoading(true);
    setError(null);
    getDocumentChunks(fileId)
      .then(setChunks)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [fileId]);

  useEffect(() => setVisible(PAGE), [filter, fileId, retrievedFirst]);

  const scores = useMemo(
    () => new Map(highlightedChunks.map(c => [c.chunk_index, c.score])),
    [highlightedChunks],
  );

  const sorted = useMemo(() => {
    const q = filter.toLowerCase();
    const matches = q ? chunks.filter(c => c.text.toLowerCase().includes(q)) : chunks;
    return [...matches].sort((a, b) => {
      if (retrievedFirst) {
        const d = Number(scores.has(b.chunk_index)) - Number(scores.has(a.chunk_index));
        if (d) return d;
      }
      return a.chunk_index - b.chunk_index;
    });
  }, [chunks, filter, scores, retrievedFirst]);

  if (!fileId) {
    return (
      <div className="panel">
        <EmptyState icon={<IconLayers />} title="Pick a document to see its chunks">
          Select one in the setup panel or upload a new file.
        </EmptyState>
        <FileUpload variant="full" onUploaded={onUploaded} />
      </div>
    );
  }

  return (
    <div className="chunks">
      <header className="page-head">
        <h1>Chunks <span className="count">{chunks.length}</span></h1>
        <p>
          {scores.size > 0
            ? `${scores.size} chunks were retrieved by your last query and are marked with their similarity score.`
            : 'Run a query to see which chunks it retrieves.'}
        </p>
      </header>

      <div className="toolbar">
        <SearchInput value={filter} onChange={setFilter} placeholder="Filter chunks by text" />
        {scores.size > 0 && (
          <label className="check">
            <input
              type="checkbox"
              checked={retrievedFirst}
              onChange={(e) => setRetrievedFirst(e.target.checked)}
            />
            Retrieved first
          </label>
        )}
      </div>

      {error && <p className="form-error" role="alert">Couldn't load chunks: {error}</p>}
      {loading && <div className="loading-row"><span className="spinner" aria-label="Loading chunks" /></div>}

      {!loading && sorted.length === 0 && !error && (
        <EmptyState title="No chunks match">Try a different filter.</EmptyState>
      )}

      <ul className="chunk-list">
        {sorted.slice(0, visible).map(chunk => {
          const score = scores.get(chunk.chunk_index);
          return (
            <li key={chunk.chunk_id} className={`chunk ${score != null ? 'retrieved' : ''}`}>
              <div className="chunk-head">
                <span className="mono">Chunk {chunk.chunk_index}</span>
                {score != null && <ScoreBadge score={score} />}
              </div>
              <p className="clamp-4">{chunk.text}</p>
              {chunk.embedding_preview?.length > 0 && (
                <details className="chunk-embedding">
                  <summary>Embedding preview</summary>
                  <code>[{chunk.embedding_preview.map(v => v.toFixed(4)).join(', ')}, …]</code>
                </details>
              )}
            </li>
          );
        })}
      </ul>

      {sorted.length > visible && (
        <button type="button" className="btn btn-quiet more" onClick={() => setVisible(v => v + PAGE)}>
          Show {Math.min(PAGE, sorted.length - visible)} more of {sorted.length - visible} remaining
        </button>
      )}
    </div>
  );
}
