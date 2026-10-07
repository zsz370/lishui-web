import {Link} from 'react-router-dom';
import {ArrowUpRight} from '@phosphor-icons/react';
import {guideLink,host} from '../data/personas.js';
import GuideAvatar from './GuideAvatar.jsx';
export default function PageGuide({id,title,description,node,service,prompts,preferences}) {
 return <section id={id} className="single-guide-entry"><GuideAvatar persona={host}/><div><h2>{title||'有疑问，直接问淮源姐'}</h2><p>{description||'把感兴趣的地方和出行需求告诉我，我们接着聊。'}</p>{prompts?.length>0&&<div className="single-guide-prompts">{prompts.slice(0,2).map(q=><Link key={q} state={{preferences}} to={guideLink({nodeId:node?.id,serviceId:service?.id,question:q})}>{q}</Link>)}</div>}</div><Link className="experience-button" state={{preferences}} to={guideLink({nodeId:node?.id,serviceId:service?.id})}>问淮源姐 <ArrowUpRight size={18}/></Link></section>;
}
