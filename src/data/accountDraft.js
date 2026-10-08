import { PLAN_KEY, readPlan, normalizePlan, emptyPlan } from './itinerary.js';
export const draftKey=userId=>userId?PLAN_KEY+':account:'+userId:PLAN_KEY;
export function readAccountDraft(storage,userId,guestPlan) {
  if(!userId)return readPlan(storage).plan;
  try{const saved=storage.getItem(draftKey(userId));return saved?normalizePlan(JSON.parse(saved)):normalizePlan(guestPlan)||emptyPlan();}
  catch{return normalizePlan(guestPlan);}
}
export function saveAccountDraft(storage,userId,plan){try{storage.setItem(draftKey(userId),JSON.stringify(normalizePlan(plan)));return true;}catch{return false;}}
