/**
 * API client for the RAG Model Workbench backend.
 */

const API_BASE = '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ── Documents ────────────────────────────────────────────────────

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || 'Upload failed');
  }

  return res.json();
}

export async function listDocuments() {
  return request('/documents');
}

export async function getDocumentChunks(fileId) {
  return request(`/documents/${fileId}/chunks`);
}

export async function deleteDocument(fileId) {
  return request(`/documents/${fileId}`, { method: 'DELETE' });
}

// ── Query ────────────────────────────────────────────────────────

export async function runQuery(question, ragType, fileId, topK = 5) {
  return request('/query', {
    method: 'POST',
    body: JSON.stringify({
      question,
      rag_type: ragType,
      file_id: fileId,
      top_k: topK,
    }),
  });
}

export async function compareRAGTypes(question, fileId, ragTypes = null, topK = 5) {
  return request('/query/compare', {
    method: 'POST',
    body: JSON.stringify({
      question,
      file_id: fileId,
      rag_types: ragTypes || ['traditional', 'hybrid', 'graph', 'agentic'],
      top_k: topK,
    }),
  });
}

// ── RAG Types ────────────────────────────────────────────────────

export async function getRAGTypes() {
  return request('/rag-types');
}

export async function getRAGTypeDetail(ragId) {
  return request(`/rag-types/${ragId}`);
}

// ── Health ────────────────────────────────────────────────────────

export async function healthCheck() {
  return request('/health');
}
