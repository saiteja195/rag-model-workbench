import { useState, useEffect } from 'react';
import { getRAGTypes, listDocuments, deleteDocument } from './api/client';
import FileUpload from './components/FileUpload';
import RAGSelector from './components/RAGSelector';
import ChunkViewer from './components/ChunkViewer';
import ChatInterface from './components/ChatInterface';
import WorkflowDiagram from './components/WorkflowDiagram';
import MetricsPanel from './components/MetricsPanel';
import CompareView from './components/CompareView';
import ArchitectureShowcase from './components/ArchitectureShowcase';
import {
  IconLayers, IconMessage, IconBarChart, IconFileText,
  IconNetwork, IconSun, IconMoon, IconBook,
} from './components/Icons';

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved;
      if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    }
    return 'dark';
  });
  const [ragTypes, setRagTypes] = useState([]);
  const [selectedRagType, setSelectedRagType] = useState('traditional');
  const [documents, setDocuments] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [activeTab, setActiveTab] = useState('architectures'); // query, chunks, compare, architectures
  const [lastQueryResult, setLastQueryResult] = useState(null);
  const [showcaseFocusId, setShowcaseFocusId] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    getRAGTypes()
      .then(setRagTypes)
      .catch(() => {
        setRagTypes([
          { id: 'traditional', name: 'Traditional RAG', icon: '🎯', color: '#6366f1', category: 'runnable', best_for: 'Simple, direct questions', workflow_steps: [], strengths: [], weaknesses: [] },
          { id: 'hybrid',      name: 'Hybrid RAG',      icon: '⚡', color: '#f59e0b', category: 'runnable', best_for: 'Questions with specific terms', workflow_steps: [], strengths: [], weaknesses: [] },
          { id: 'graph',       name: 'GraphRAG',         icon: '🕸️', color: '#10b981', category: 'runnable', best_for: 'Relationship-based questions', workflow_steps: [], strengths: [], weaknesses: [] },
          { id: 'agentic',     name: 'Agentic RAG',      icon: '🤖', color: '#ec4899', category: 'runnable', best_for: 'Complex, multi-faceted questions', workflow_steps: [], strengths: [], weaknesses: [] },
        ]);
      });

    listDocuments().then(setDocuments).catch(() => {});
  }, []);

  const handleUploaded = (result) => {
    setActiveFileId(result.file_id);
    listDocuments().then(setDocuments).catch(() => {});
  };

  const handleDeleteDoc = async (e, fileId) => {
    e.stopPropagation();
    try {
      await deleteDocument(fileId);
      setDocuments(prev => prev.filter(d => d.file_id !== fileId));
      if (activeFileId === fileId) {
        setActiveFileId(null);
        setLastQueryResult(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleQueryResult = (result) => setLastQueryResult(result);

  // Navigate to architectures tab and optionally open a specific showcase type
  const handleShowcaseSelect = (ragId) => {
    setShowcaseFocusId(ragId);
    setActiveTab('architectures');
  };

  // "Try It" from showcase: select the engine and navigate to query tab
  const handleTryIt = (engineId) => {
    setSelectedRagType(engineId);
    setActiveTab('query');
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className={`app-layout ${activeTab === 'architectures' ? 'architectures-mode' : ''}`} id="app-layout">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      {activeTab !== 'architectures' && (
        <aside className="sidebar" id="sidebar">
          <div className="brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="brand-icon">
                <IconNetwork />
              </div>
              <div className="brand-text">
                <h1>RAG Workbench</h1>
                <p>Model Comparison Lab</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
          </div>

          {/* RAG Type Selector */}
          <RAGSelector
            ragTypes={ragTypes}
            selectedType={selectedRagType}
            onSelect={setSelectedRagType}
            onShowcaseSelect={handleShowcaseSelect}
          />

          {/* Documents List */}
          <div>
            <div className="section-header">
              <h2>DOCUMENTS</h2>
              <div className="line" />
            </div>
            <div className="doc-list" id="doc-list">
              {documents.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px' }}>
                  No documents uploaded yet
                </p>
              ) : (
                documents.map(doc => (
                  <div
                    key={doc.file_id}
                    className={`doc-item ${activeFileId === doc.file_id ? 'active' : ''}`}
                    onClick={() => setActiveFileId(doc.file_id)}
                    id={`doc-${doc.file_id}`}
                  >
                    <span className="doc-item-icon">
                      <IconFileText />
                    </span>
                    <div className="doc-item-info">
                      <div className="doc-item-name">{doc.filename}</div>
                      <div className="doc-item-meta">
                        {doc.chunk_count} chunks · {formatBytes(doc.file_size)}
                      </div>
                    </div>
                    <button
                      className="doc-item-delete"
                      onClick={(e) => handleDeleteDoc(e, doc.file_id)}
                      title="Delete document"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Backend status */}
          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              🔌 Backend: localhost:8000
            </p>
          </div>
        </aside>
      )}

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="main-content" id="main-content">
        {/* Upload — hidden on architectures tab */}
        {activeTab !== 'architectures' && (
          <FileUpload onUploaded={handleUploaded} />
        )}

        {/* Tabs */}
        {activeTab !== 'architectures' && (
          <div className="tabs" id="main-tabs">
            <button
              className={`tab ${activeTab === 'query' ? 'active' : ''}`}
              onClick={() => setActiveTab('query')}
              id="tab-query"
            >
              <IconMessage /> Query
            </button>
            <button
              className={`tab ${activeTab === 'chunks' ? 'active' : ''}`}
              onClick={() => setActiveTab('chunks')}
              id="tab-chunks"
            >
              <IconLayers /> Chunks
            </button>
            <button
              className={`tab ${activeTab === 'compare' ? 'active' : ''}`}
              onClick={() => setActiveTab('compare')}
              id="tab-compare"
            >
              <IconBarChart /> Compare
            </button>
            <button
              className={`tab ${activeTab === 'architectures' ? 'active' : ''}`}
              onClick={() => setActiveTab('architectures')}
              id="tab-architectures"
            >
              <IconBook /> Architectures
            </button>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'query' && (
          <>
            <ChatInterface
              fileId={activeFileId}
              ragType={selectedRagType}
              onQueryResult={handleQueryResult}
            />

            {lastQueryResult && (
              <>
                <MetricsPanel queryResult={lastQueryResult} />
                <WorkflowDiagram
                  steps={lastQueryResult.workflow_steps}
                  ragType={lastQueryResult.rag_type}
                />
              </>
            )}
          </>
        )}

        {activeTab === 'chunks' && (
          <ChunkViewer
            fileId={activeFileId}
            highlightedChunks={lastQueryResult?.retrieved_chunks || []}
          />
        )}

        {activeTab === 'compare' && (
          <CompareView fileId={activeFileId} />
        )}

        {activeTab === 'architectures' && (
          <ArchitectureShowcase
            ragTypes={ragTypes}
            focusId={showcaseFocusId}
            onTryIt={handleTryIt}
          />
        )}
      </main>
    </div>
  );
}
