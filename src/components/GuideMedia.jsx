import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Photo from './Photo.jsx';
import { guideSpeechActivity } from '../services/guideSpeechActivity.js';

export default function GuideMedia({ persona, state = 'idle' }) {
  const speaking = useSyncExternalStore(guideSpeechActivity.subscribe, guideSpeechActivity.getSnapshot, () => false);
  const [failedSources, setFailedSources] = useState([]);
  const source = persona.portraitMotion?.[speaking || state === 'speaking' ? 'speaking' : 'idle'];
  const poster = persona.motionPoster || persona.portrait;
  const fail = () => setFailedSources((current) => current.includes(source) ? current : [...current, source]);
  return <span className={`guide-media${persona.transparent ? ' guide-media--transparent' : ''}`}>
    {source && !failedSources.includes(source)
      ? <MotionVideo key={source} src={source} poster={poster} name={persona.name} onFailure={fail} />
      : <Photo src={poster} fallbackSrc={persona.transparent ? undefined : persona.portrait} alt={`${persona.name}的全身数字人形象`} fallback="人物形象暂时无法加载" eager />}
  </span>;
}

function MotionVideo({ src, poster, name, onFailure }) {
  const element = useRef(null);
  useEffect(() => {
    let disposed = false;
    const update = () => {
      const video = element.current;
      if (!video) return;
      if (document.hidden) video.pause();
      else {
        const result = video.play();
        result?.catch(() => { if (!disposed) onFailure(); });
      }
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', update);
      element.current?.pause();
    };
  }, [src]);
  return <video ref={element} className="guide-motion-video" src={src} poster={poster}
    width="480" height="720" muted autoPlay loop playsInline preload="metadata"
    controls={false} disablePictureInPicture disableRemotePlayback
    controlsList="nodownload nofullscreen noremoteplayback" tabIndex={-1} draggable={false}
    style={{ pointerEvents: 'none' }}
    aria-label={`${name}的动态数字人形象`} onError={onFailure} />;
}
