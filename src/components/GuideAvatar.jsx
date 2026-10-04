import { useState } from 'react';
export default function GuideAvatar({ persona, className = '' }) {
  if (!persona) return null;
  return <AvatarImage key={persona.avatar} persona={persona} className={className} />;
}
function AvatarImage({ persona, className }) {
  const [failed, setFailed] = useState(false);
  return <span className={`guide-avatar ${className}`}>
    {failed ? <span>{persona.name[0]}</span> : <img src={persona.avatar} alt={`${persona.name}的数字人形象`} loading="lazy" onError={() => setFailed(true)} />}
  </span>;
}
