import { useState, useCallback, useEffect } from 'react';
import useTheme from './hooks/useTheme';
import useRagTypes from './hooks/useRagTypes';
import useDocuments from './hooks/useDocuments';
import Sidebar from './components/Sidebar';
import QueryView from './components/QueryView';
import CompareView from './components/CompareView';
import ChunkViewer from './components/ChunkViewer';
import ArchitectureShowcase from './components/ArchitectureShowcase';
import { EngineDot } from './components/ui';
import { IconNetwork, IconSun, IconMoon, IconMenu } from './components/Icons';
import { findType } from './utils/format';

const TABS = [
  { id: 'query', label: 'Query' },
  { id: 'compare', label: 'Compare' },
  { id: 'chunks', label: 'Chunks' },
  { id: 'library', label: 'Library' },
];

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const { ragTypes, error: ragTypesError, reload: reloadRagTypes } = useRagTypes();
  const { documents, error: documentsError, refresh, remove } = useDocuments();

  const [tab, setTab] = useState('query');
  const [selectedRagType, setSelectedRagType] = useState('traditional');
  const [activeFileId, setActiveFileId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Conversations are kept per document so switching tabs or files never loses them.
  const [chats, setChats] = useState({});
  const [selectedByFile, setSelectedByFile] = useState({});

  // Start on the first document rather than an empty selection.
  useEffect(() => {
    if (!activeFileId && documents.length > 0) setActiveFileId(documents[0].file_id);
  }, [activeFileId, documents]);

  const messages = chats[activeFileId] || [];
  const appendMessage = useCallback((fileId, message) => {
    setChats(prev => ({ ...prev, [fileId]: [...(prev[fileId] || []), message] }));
    setSelectedByFile(prev => ({ ...prev, [fileId]: null })); // follow the newest answer
  }, []);

  const lastResult = [...messages].reverse().find(m => m.result)?.result;

  const handleUploaded = (result) => {
    setActiveFileId(result.file_id);
    refresh();
  };

  const handleDelete = async (fileId) => {
    if (!(await remove(fileId))) return;
    setChats(({ [fileId]: _, ...rest }) => rest);
    if (activeFileId === fileId) setActiveFileId(null);
  };

  const activeDoc = documents.find(d => d.file_id === activeFileId);
  const activeEngine = findType(ragTypes, selectedRagType);
  const showSidebar = tab !== 'library';

  const goTo = (id) => { setTab(id); setDrawerOpen(false); };
  const tryEngine = (engineId) => { setSelectedRagType(engineId); goTo('query'); };

  return (
    <div className={`shell ${showSidebar ? 'with-sidebar' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><IconNetwork /></span>
          <span className="brand-name">RAG Workbench</span>
        </div>

        <nav className="nav" aria-label="Sections">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className="nav-item"
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => goTo(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </header>

      <div className="body">
        {showSidebar && (
          <Sidebar
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            documents={documents}
            documentsError={documentsError}
            activeFileId={activeFileId}
            onSelectDocument={(id) => { setActiveFileId(id); setDrawerOpen(false); }}
            onDeleteDocument={handleDelete}
            onUploaded={handleUploaded}
            ragTypes={ragTypes}
            ragTypesError={ragTypesError}
            onRetryRagTypes={reloadRagTypes}
            selectedRagType={selectedRagType}
            onSelectRagType={(id) => { setSelectedRagType(id); setDrawerOpen(false); }}
            onBrowseLibrary={() => goTo('library')}
          />
        )}

        <main className="main" id="main">
          {showSidebar && (
            <div className="context-bar">
              <span className="context-item">
                <span className="muted">Document</span>
                <strong>{activeDoc?.filename || 'None selected'}</strong>
              </span>
              <span className="context-item">
                <span className="muted">Engine</span>
                <strong><EngineDot color={activeEngine?.color} />{activeEngine?.name || selectedRagType}</strong>
              </span>
              <button type="button" className="btn btn-quiet context-edit" onClick={() => setDrawerOpen(true)}>
                <IconMenu /> Change
              </button>
            </div>
          )}

          {tab === 'query' && (
            <QueryView
              fileId={activeFileId}
              ragType={selectedRagType}
              ragTypes={ragTypes}
              messages={messages}
              onAppend={appendMessage}
              onUploaded={handleUploaded}
              selectedIndex={selectedByFile[activeFileId] ?? null}
              onSelect={(i) => setSelectedByFile(prev => ({ ...prev, [activeFileId]: i }))}
            />
          )}
          {tab === 'compare' && (
            <CompareView fileId={activeFileId} ragTypes={ragTypes} onUploaded={handleUploaded} />
          )}
          {tab === 'chunks' && (
            <ChunkViewer
              fileId={activeFileId}
              highlightedChunks={lastResult?.retrieved_chunks || []}
              onUploaded={handleUploaded}
            />
          )}
          {tab === 'library' && (
            <ArchitectureShowcase ragTypes={ragTypes} onTryIt={tryEngine} />
          )}
        </main>
      </div>
    </div>
  );
}
