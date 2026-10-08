import { collectCollaboration, taskPresentation } from '../services/guideCollaboration.js';
import './GuideCollaboration.css';

export function ExpertProgress({tasks}) {
  return <ul className="guide-expert-progress" aria-label="专家工具协作进度">{tasks.map(task=>{
    const display=taskPresentation(task);
    return <li key={task.taskId} data-status={task.status}><span>{display.name}</span><span>{display.label}</span></li>;
  })}</ul>;
}

export default function GuideCollaboration({message}) {
  const {experts,groups}=message.collaboration || collectCollaboration([message]);
  if (!experts.length && !groups.length) return null;
  return <section className="guide-collaboration" aria-label="协作说明">
    <h3>协作说明</h3>
    {experts.length>0&&<ExpertProgress tasks={experts}/>}
    {!message.recommendedPlan&&experts.some(task=>task.taskId==='planning_summary')&&<p>行程是本次结果的整理草案，待核项与未完成查询仍需确认。</p>}
    {groups.length>0&&<details><summary>查看{groups.map(group=>group.title).join(' / ')}来源</summary><div>{groups.map(group=><section key={group.id} data-source={group.id}><h4>{group.title}</h4>{(group.notes || [group.note]).filter(Boolean).map(note=><p key={note}>{note}</p>)}{group.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}</a>)}</section>)}</div></details>}
  </section>;
}
