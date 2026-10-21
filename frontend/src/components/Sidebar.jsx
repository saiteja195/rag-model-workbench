import FileUpload from './FileUpload';
import EnginePicker from './EnginePicker';
import { IconFileText, IconTrash, IconX, IconBook } from './Icons';
import { formatBytes } from '../utils/format';

export default function Sidebar({
  open, onClose,
  documents, documentsError, activeFileId, onSelectDocument, onDeleteDocument, onUploaded,
  ragTypes, ragTypesError, onRetryRagTypes, selectedRagType, onSelectRagType,
  onBrowseLibrary,
}) {
  return (
    <>
      <div className={`scrim ${open ? 'visible' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Documents and engine">
        <div className="sidebar-head">
          <span>Setup</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close setup">
            <IconX />
          </button>
        </div>

        <section className="side-section">
          <h2>Documents</h2>
          {documents.length === 0 && <FileUpload variant="compact" onUploaded={onUploaded} />}

          {documentsError && <p className="form-error" role="alert">{documentsError}</p>}

          {documents.length > 0 && (
            <ul className="doc-list">
              {documents.map(doc => (
                <li key={doc.file_id}>
                  <div className={`doc-item ${activeFileId === doc.file_id ? 'active' : ''}`}>
                    <button
                      type="button"
                      className="doc-select"
                      aria-pressed={activeFileId === doc.file_id}
                      onClick={() => onSelectDocument(doc.file_id)}
                    >
                      <IconFileText />
                      <span className="doc-text">
                        <span className="doc-name">{doc.filename}</span>
                        <span className="doc-meta">{doc.chunk_count} chunks, {formatBytes(doc.file_size)}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => onDeleteDocument(doc.file_id)}
                      aria-label={`Delete ${doc.filename}`}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {documents.length > 0 && <FileUpload variant="compact" onUploaded={onUploaded} />}
        </section>

        <section className="side-section">
          <h2>Retrieval engine</h2>
          <EnginePicker
            ragTypes={ragTypes}
            selected={selectedRagType}
            onSelect={onSelectRagType}
            error={ragTypesError}
            onRetry={onRetryRagTypes}
          />
          <button type="button" className="link-btn" onClick={onBrowseLibrary}>
            <IconBook /> Browse all architectures
          </button>
        </section>
      </aside>
    </>
  );
}
