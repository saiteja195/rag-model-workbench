import { useState, useRef, useEffect } from 'react';
import { runQuery } from '../api/client';
import { IconMessage, IconArrowUp } from './Icons';

export default function ChatInterface({ fileId, ragType, onQueryResult }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || !fileId || !ragType || isLoading) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await runQuery(question, ragType, fileId);

      // Add assistant message with metadata
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.answer,
        metadata: {
          totalTime: result.total_time_ms,
          retrievalTime: result.retrieval_time_ms,
          generationTime: result.generation_time_ms,
          embeddingTime: result.embedding_time_ms,
          chunksSearched: result.chunks_searched,
          retrievedChunks: result.retrieved_chunks,
          workflowSteps: result.workflow_steps,
          ragType: result.rag_type,
        }
      }]);

      if (onQueryResult) onQueryResult(result);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}`,
        isError: true,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = input.trim() && fileId && ragType && !isLoading;

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="chat-container" id="chat-container">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <span className="empty-state-icon">
                <IconMessage />
              </span>
              <h3>Ask a Question</h3>
              <p>
                {!fileId
                  ? 'Upload a document first, then ask questions about it'
                  : !ragType
                  ? 'Select a RAG type from the sidebar'
                  : `Ready to query with ${ragType} RAG. Type your question below!`}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}

          {isLoading && (
            <div className="chat-message assistant">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="loading-spinner" />
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                  Searching with {ragType} RAG...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <input
              className="chat-input"
              type="text"
              placeholder={
                !fileId
                  ? 'Upload a document first...'
                  : !ragType
                  ? 'Select a RAG type...'
                  : 'Ask a question about your document...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!fileId || !ragType || isLoading}
              id="chat-input"
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!canSend}
              title="Send message"
              id="chat-send"
            >
              <IconArrowUp />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ message }) {
  const [showChunks, setShowChunks] = useState(false);
  const { role, content, metadata, isError } = message;

  return (
    <div className={`chat-message ${role} ${isError ? 'error' : ''}`}>
      <div className="answer-text">{content}</div>

      {metadata && (
        <>
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '10px',
            flexWrap: 'wrap',
          }}>
            <MiniMetric label="Total" value={`${metadata.totalTime.toFixed(0)}ms`} />
            <MiniMetric label="Retrieval" value={`${metadata.retrievalTime.toFixed(0)}ms`} />
            <MiniMetric label="Generation" value={`${metadata.generationTime.toFixed(0)}ms`} />
            <MiniMetric label="Chunks" value={metadata.chunksSearched} />
          </div>

          {metadata.retrievedChunks?.length > 0 && (
            <>
              <button
                className="retrieved-chunks-toggle"
                onClick={() => setShowChunks(!showChunks)}
              >
                {showChunks ? '▼' : '▶'} {metadata.retrievedChunks.length} retrieved chunks
              </button>

              {showChunks && (
                <div className="retrieved-chunks-list">
                  {metadata.retrievedChunks.map((chunk, i) => (
                    <div key={i} className="retrieved-chunk-mini">
                      <span className="score">#{chunk.chunk_index} (score: {chunk.score.toFixed(3)})</span>
                      <br />
                      {chunk.text.substring(0, 150)}...
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <span style={{
      fontSize: '0.65rem',
      fontFamily: 'var(--font-mono)',
      color: 'var(--text-muted)',
      background: 'rgba(0,0,0,0.2)',
      padding: '2px 6px',
      borderRadius: '4px',
    }}>
      {label}: <span style={{ color: 'var(--accent-cyan)' }}>{value}</span>
    </span>
  );
}
