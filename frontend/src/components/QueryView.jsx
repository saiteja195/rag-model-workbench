import ChatInterface from './ChatInterface';
import RunInspector from './RunInspector';

/** Conversation on the left, details of the selected answer on the right. */
export default function QueryView({
  fileId, ragType, ragTypes, messages, onAppend, onUploaded, selectedIndex, onSelect,
}) {
  const lastRun = messages.map((m, i) => (m.result ? i : -1)).filter(i => i >= 0).pop();
  const activeIndex = selectedIndex ?? lastRun;
  const result = activeIndex != null ? messages[activeIndex]?.result : null;

  return (
    <div className="query-layout">
      <ChatInterface
        fileId={fileId}
        ragType={ragType}
        ragTypes={ragTypes}
        messages={messages}
        onAppend={onAppend}
        onUploaded={onUploaded}
        selectedIndex={activeIndex}
        onSelect={onSelect}
      />
      <RunInspector result={result} ragTypes={ragTypes} />
    </div>
  );
}
