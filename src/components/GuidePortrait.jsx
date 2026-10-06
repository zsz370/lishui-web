import { useEffect, useState } from 'react';
import GuideMedia from './GuideMedia.jsx';

export default function GuidePortrait({ persona, className = '', state = 'idle' }) {
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  if (!persona) return null;
  const motion = persona.portraitMotion?.[state] || persona.portraitMotion?.idle;
  return <div className={`guide-portrait ${className}`}>
    <GuideMedia persona={persona} state={state} animated={!paused && !reducedMotion} />
    {motion && !reducedMotion && <button type="button" className="portrait-motion-toggle" onClick={() => setPaused((value) => !value)} aria-label={`${paused ? '播放' : '暂停'}${persona.name}的动态形象`}>{paused ? '播放动态' : '暂停动态'}</button>}
  </div>;
}
