export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function formatMs(ms) {
  if (ms == null) return '–';
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`;
}

export function findType(ragTypes, id) {
  return ragTypes.find(t => t.id === id);
}

export function matchesQuery(rag, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    rag.name.toLowerCase().includes(q) ||
    rag.id.toLowerCase().includes(q) ||
    (rag.best_for || '').toLowerCase().includes(q)
  );
}
