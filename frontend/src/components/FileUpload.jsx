import { useState, useRef } from 'react';
import { uploadDocument } from '../api/client';
import { IconUpload, IconLoader, IconFileText } from './Icons';

export default function FileUpload({ onUploaded }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    handleDrag(e);
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    handleDrag(e);
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    handleDrag(e);
    setIsDragOver(false);
    const files = e.dataTransfer?.files;
    if (files?.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files?.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file) => {
    setError(null);
    setUploadResult(null);
    setIsUploading(true);

    try {
      const result = await uploadDocument(file);
      setUploadResult(result);
      if (onUploaded) onUploaded(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="glass-card">
      <div className="section-header">
        <IconFileText />
        <h2>UPLOAD DOCUMENT</h2>
        <div className="line" />
      </div>

      <div
        className={`upload-zone ${isDragOver ? 'dragover' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDrag}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        id="upload-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf,.md"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="file-input"
        />

        {isUploading ? (
          <>
            <span className="upload-zone-icon">
              <IconLoader />
            </span>
            <h3>Processing document...</h3>
            <p>Parsing, chunking, and embedding your file</p>
            <div className="upload-progress">
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: '80%' }} />
              </div>
            </div>
          </>
        ) : (
          <>
            <span className="upload-zone-icon">
              <IconUpload />
            </span>
            <h3>Drop your document here</h3>
            <p>
              or <span className="highlight">click to browse</span>
              {' '}— supports .txt, .pdf, .md
            </p>
          </>
        )}
      </div>

      {uploadResult && (
        <div className="upload-stats" id="upload-stats">
          <div className="upload-stat">
            <span className="upload-stat-value">{uploadResult.chunk_count}</span>
            <span className="upload-stat-label">Chunks</span>
          </div>
          <div className="upload-stat">
            <span className="upload-stat-value">{uploadResult.processing_time_ms.toFixed(0)}ms</span>
            <span className="upload-stat-label">Processing</span>
          </div>
          <div className="upload-stat">
            <span className="upload-stat-value">{formatBytes(uploadResult.file_size)}</span>
            <span className="upload-stat-label">File Size</span>
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '12px', textAlign: 'center' }}>
          ❌ {error}
        </p>
      )}
    </div>
  );
}
