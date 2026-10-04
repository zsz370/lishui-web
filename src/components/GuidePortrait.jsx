import { useEffect, useState } from 'react';
import Photo from './Photo.jsx';

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
  // 后续在角色配置中添加 portraitMotion: { idle, thinking } 即可接入本地 GIF。
  const motion = persona.portraitMotion?.[state] || persona.portraitMotion?.idle;
  const src = motion && !paused && !reducedMotion ? motion : persona.portrait;
  return <div className={`guide-portrait ${className}`}>
    <Photo src={src} fallbackSrc={persona.portrait} alt={`${persona.name}的全身数字人形象`} fallback="人物形象暂时无法加载" eager />
    {motion && !reducedMotion && <button type="button" className="portrait-motion-toggle" onClick={() => setPaused((value) => !value)} aria-label={`${paused ? '播放' : '暂停'}${persona.name}的动态形象`}>{paused ? '播放动态' : '暂停动态'}</button>}
  </div>;
}
