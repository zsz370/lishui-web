import GuideMedia from './GuideMedia.jsx';

export default function GuidePortrait({ persona, className = '', state = 'idle' }) {
  if (!persona) return null;
  return <div className={`guide-portrait ${className}`}>
    <GuideMedia persona={persona} state={state} />
  </div>;
}
