import { useState } from 'react';
import { ImageSquare } from '@phosphor-icons/react';

export default function Photo({ src, fallbackSrc, alt, className = '', eager = false, fallback = '这段故事，听导游慢慢讲' }) {
  return <PhotoContent key={`${src || 'no-photo'}:${fallbackSrc || ''}`} src={src} fallbackSrc={fallbackSrc} alt={alt} className={className} eager={eager} fallback={fallback} />;
}

function PhotoContent({ src, fallbackSrc, alt, className, eager, fallback }) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  return (
    <span className={`experience-photo ${className} ${ready ? 'is-ready' : ''}`}>
      {!src || failed ? <span className="photo-fallback"><ImageSquare size={30} weight="light" aria-hidden="true" /><span>{fallback}</span></span> : <>
        {!ready && <span className="photo-loading" aria-hidden="true" />}
        <img src={useFallback ? fallbackSrc : src} alt={alt} loading={eager ? 'eager' : 'lazy'} onLoad={() => setReady(true)} onError={() => {
          if (fallbackSrc && !useFallback && fallbackSrc !== src) { setUseFallback(true); setReady(false); }
          else setFailed(true);
        }} />
      </>}
    </span>
  );
}
