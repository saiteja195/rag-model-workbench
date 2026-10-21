import { useState, useRef } from 'react';
import { uploadDocument } from '../api/client';
import { IconUpload, IconLoader } from './Icons';

/**
 * Drop zone for .txt / .pdf / .md files.
 * variant="compact" fits in the sidebar; "full" is the empty-state version.
 */
export default function FileUpload({ onUploaded, variant = 'compact' }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const processFile = async (file) => {
    setError(null);
    setIsUploading(true);
    try {
      const result = await uploadDocument(file);
      onUploaded?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  };

  const open = () => !isUploading && inputRef.current?.click();

  return (
    <div className={`upload upload-${variant}`}>
      <div
        className={`upload-zone ${isDragOver ? 'dragover' : ''} ${isUploading ? 'busy' : ''}`}
        role="button"
        tabIndex={0}
        aria-busy={isUploading}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
        onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf,.md"
          hidden
          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        />
        <span className="upload-icon" aria-hidden="true">
          {isUploading ? <IconLoader /> : <IconUpload />}
        </span>
        <div className="upload-copy">
          <strong>{isUploading ? 'Processing document' : 'Upload a document'}</strong>
          <span>
            {isUploading
              ? 'Parsing, chunking and embedding'
              : 'Drop a file or click to browse. .txt, .pdf, .md'}
          </span>
        </div>
        {isUploading && <span className="upload-progress" aria-hidden="true" />}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
