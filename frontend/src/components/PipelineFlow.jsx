import {
  IconMessage, IconSettings, IconTarget, IconSearch, IconBrain,
  IconLayers, IconGitBranch, IconCheckCircle, IconRefresh,
} from './Icons';

const KINDS = {
  input:    { label: 'Input',     icon: IconMessage },
  process:  { label: 'Step',      icon: IconSettings },
  embed:    { label: 'Embedding', icon: IconTarget },
  search:   { label: 'Search',    icon: IconSearch },
  llm:      { label: 'LLM call',  icon: IconBrain },
  store:    { label: 'Storage',   icon: IconLayers },
  decision: { label: 'Decision',  icon: IconGitBranch },
  output:   { label: 'Output',    icon: IconCheckCircle },
  loop:     { label: 'Loop back', icon: IconRefresh },
};

function collectKinds(steps, found = new Set()) {
  steps.forEach(step => {
    if (step.branch) step.branch.forEach(p => collectKinds(p.steps, found));
    else found.add(step.kind);
  });
  return found;
}

function Node({ step }) {
  const { icon: Icon } = KINDS[step.kind] || KINDS.process;
  return (
    <div className={`flow-node kind-${step.kind}`}>
      <span className="flow-node-icon" aria-hidden="true"><Icon /></span>
      <span className="flow-node-text">
        <strong>{step.label}</strong>
        {step.note && <span>{step.note}</span>}
      </span>
    </div>
  );
}

function Steps({ steps }) {
  return (
    <ol className="flow-steps">
      {steps.map((step, i) => (
        <li key={i} className={step.branch ? 'flow-branch' : undefined}>
          {step.branch ? <Branch step={step} /> : <Node step={step} />}
        </li>
      ))}
    </ol>
  );
}

function Branch({ step }) {
  return (
    <>
      <span className="flow-branch-label">
        {step.mode === 'parallel' ? 'In parallel' : 'Depends on the result'}
      </span>
      <div className="flow-branch-grid">
        {step.branch.map((p, i) => (
          <div key={i} className="flow-path">
            <span className="flow-path-when">{p.when}</span>
            <Steps steps={p.steps} />
          </div>
        ))}
      </div>
    </>
  );
}

function Lane({ lane }) {
  return (
    <section className="flow-lane">
      {lane.title && <h4 className="flow-lane-title">{lane.title}</h4>}
      {lane.layout === 'grid' ? (
        <ul className="flow-grid">
          {lane.steps.map((step, i) => <li key={i}><Node step={step} /></li>)}
        </ul>
      ) : (
        <Steps steps={lane.steps} />
      )}
      {lane.note && <p className="flow-note">{lane.note}</p>}
      {lane.loop && (
        <p className="flow-loop"><IconRefresh /> {lane.loop}</p>
      )}
    </section>
  );
}

/** Visual pipeline for one architecture; falls back to the text diagram. */
export default function PipelineFlow({ spec, fallback }) {
  if (!spec) {
    return fallback ? <pre className="pipeline">{fallback}</pre> : null;
  }

  const kinds = new Set();
  spec.lanes.forEach(l => collectKinds(l.steps, kinds));

  return (
    <div className="flow">
      <ul className="flow-legend" aria-label="Legend">
        {Object.entries(KINDS).filter(([k]) => kinds.has(k)).map(([k, { label, icon: Icon }]) => (
          <li key={k} className={`kind-${k}`}><Icon />{label}</li>
        ))}
      </ul>
      {spec.lanes.map((lane, i) => <Lane key={i} lane={lane} />)}
    </div>
  );
}
