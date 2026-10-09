import { useState } from 'react';
import { ImageSquare } from '@phosphor-icons/react';
import { responsivePhotos } from '../data/responsiveMedia.js';

export default function Photo({ src, fallbackSrc, alt, className = '', eager = false, fallback = '这段故事，听导游慢慢讲' }) {
  const responsive = responsivePhotos[src];
  return <PhotoContent key={`${src || 'no-photo'}:${fallbackSrc || ''}`} src={responsive?.src || src} srcSet={responsive?.srcSet} fallbackSrc={fallbackSrc || (responsive ? src : undefined)} alt={alt} className={className} eager={eager} fallback={fallback} />;
}

function PhotoContent({ src, srcSet, fallbackSrc, alt, className, eager, fallback }) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  return (
    <span className={`experience-photo ${className} ${ready ? 'is-ready' : ''}`}>
      {!src || failed ? <span className="photo-fallback"><ImageSquare size={30} weight="light" aria-hidden="true" /><span>{fallback}</span></span> : <>
        {!ready && <span className="photo-loading" aria-hidden="true" />}
        <img decoding="async" src={useFallback ? fallbackSrc : src} srcSet={useFallback ? undefined : srcSet} sizes={srcSet ? '(max-width: 767px) 100vw, 640px' : undefined} alt={alt} loading={eager ? 'eager' : 'lazy'} onLoad={() => setReady(true)} onError={() => {
          if (fallbackSrc && !useFallback && fallbackSrc !== src) { setUseFallback(true); setReady(false); }
          else setFailed(true);
        }} />
      </>}
    </span>
  );
}
