import { useState, useRef, useEffect } from 'react';
import { runQuery } from '../api/client';
import { IconMessage, IconArrowUp } from './Icons';
import { EmptyState, EngineDot, LatencyBar } from './ui';
import FileUpload from './FileUpload';
import { formatMs, findType } from '../utils/format';

const STARTERS = [
  'Summarize this document in a few sentences',
  'What are the main topics covered?',
  'List any dates, names or numbers that stand out',
];

export default function ChatInterface({
  fileId, ragType, ragTypes, messages, onAppend, selectedIndex, onSelect, onUploaded,
}) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef(null);
  const rag = findType(ragTypes, ragType);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isLoading]);

  const canSend = Boolean(input.trim() && fileId && ragType && !isLoading);

  const send = async (text = input) => {
    const question = text.trim();
    if (!question || !fileId || !ragType || isLoading) return;

    onAppend(fileId, { role: 'user', content: question });
    setInput('');
    setIsLoading(true);
    try {
      const result = await runQuery(question, ragType, fileId);
      onAppend(fileId, { role: 'assistant', content: result.answer, result });
    } catch (err) {
      onAppend(fileId, { role: 'assistant', content: err.message, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <section className="chat" aria-label="Conversation">
      <div className="chat-scroll">
        <div className="chat-messages" aria-live="polite">
          {messages.length === 0 && !fileId && (
            <div className="chat-empty">
              <EmptyState icon={<IconMessage />} title="Start with a document">
                Upload a file and ask questions about it. Each answer shows how it was retrieved.
              </EmptyState>
              <FileUpload variant="full" onUploaded={onUploaded} />
            </div>
          )}

          {messages.length === 0 && fileId && (
            <div className="chat-empty">
              <EmptyState icon={<IconMessage />} title="Ask about this document">
                {rag ? `Answers will use ${rag.name}.` : 'Pick an engine in the setup panel.'}
              </EmptyState>
              <div className="starters">
                {STARTERS.map(s => (
                  <button key={s} type="button" className="chip" onClick={() => send(s)} disabled={!ragType}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <Message
              key={i}
              message={msg}
              ragTypes={ragTypes}
              selected={selectedIndex === i}
              onSelect={() => onSelect(i)}
            />
          ))}

          {isLoading && (
            <div className="message assistant pending">
              <span className="loading-dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="muted small">Retrieving with {rag?.name || ragType}…</span>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={fileId ? 'Ask a question about your document' : 'Upload a document to begin'}
          aria-label="Question"
          disabled={!fileId || !ragType || isLoading}
        />
        <button type="submit" className="send-btn" disabled={!canSend} aria-label="Send question">
          <IconArrowUp />
        </button>
      </form>
    </section>
  );
}

function Message({ message, ragTypes, selected, onSelect }) {
  const { role, content, result, isError } = message;

  if (role === 'user') {
    return <div className="message user">{content}</div>;
  }

  const rag = result && findType(ragTypes, result.rag_type);

  return (
    <article className={`message assistant ${isError ? 'error' : ''} ${selected ? 'selected' : ''}`}>
      {isError && <strong className="message-error-title">Query failed</strong>}
      <p className="answer-text">{content}</p>
      {result && (
        <button
          type="button"
          className="message-meta"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label="Show details for this answer"
        >
          <span className="message-engine"><EngineDot color={rag?.color} />{rag?.name || result.rag_type}</span>
          <span className="mono">{formatMs(result.total_time_ms)}</span>
          <span className="message-bar"><LatencyBar result={result} /></span>
          <span className="mono">{result.retrieved_chunks?.length || 0} chunks</span>
        </button>
      )}
    </article>
  );
}
