import GuideMedia from './GuideMedia.jsx';
export default function GuideAvatar({ persona, className = '' }) {
  if (!persona) return null;
  return <span className={`guide-avatar ${className}`}>
    <GuideMedia persona={persona} />
  </span>;
}
