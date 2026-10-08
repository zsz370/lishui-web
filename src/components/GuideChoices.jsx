import { useState } from 'react';
import { customFollowUp } from '../services/followUpChoices.js';

export default function GuideChoices({ groups, pending, onChoose }) {
  return <div className="guide-choice-groups">{groups.map(group=><ChoiceGroup key={group.id} group={group} pending={pending} onChoose={onChoose}/>)}</div>;
}
function ChoiceGroup({group,pending,onChoose}) {
  const [value,setValue]=useState('');
  const date=group.custom?.includes('date') || group.custom==='stay-checkout';
  return <fieldset className="guide-choice-group"><legend>{group.prompt}</legend><div>{group.choices.map(choice=><button type="button" key={choice.label} disabled={pending} onClick={()=>onChoose(choice)}>{choice.label}</button>)}</div>{group.custom&&<form onSubmit={event=>{event.preventDefault();if(value)onChoose(customFollowUp(group,value));}}><label>另填{date?'日期':'预算（元）'}<input type={date?'date':'number'} min={date?undefined:0} max={date?undefined:99999} step={date?undefined:1} required value={value} onChange={event=>setValue(event.target.value)} /></label><button type="submit" disabled={pending||!value}>选用</button></form>}</fieldset>;
}
