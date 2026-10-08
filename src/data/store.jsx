import { createContext, useContext, useEffect, useState } from 'react';
import { getNode } from './nodes.js';
import { emptyPlan, readPlan, savePlan, createStop, scenePlan, normalizePlan } from './itinerary.js';
import { useAccount } from './account.jsx';
import { readAccountDraft, saveAccountDraft } from './accountDraft.js';

const Ctx = createContext(null);

export function ItineraryProvider({ children }) {
  const [initial] = useState(() => { try { return readPlan(localStorage).plan; } catch { return emptyPlan(); } });
  const account=useAccount();
  const [draft,setDraft]=useState({ownerId:null,plan:initial});
  const plan=draft.plan;
  const setPlan=value=>setDraft(old=>({...old,plan:typeof value==='function'?value(old.plan):value}));
  const [cloudCard,setCloudCard]=useState(null);
  useEffect(()=>{
    if(account.status!=='ready')return;
    const ownerId=account.user?.id||null;
    if(ownerId===draft.ownerId)return;
    setCloudCard(null);
    setDraft(old=>{let next;try{next=readAccountDraft(localStorage,ownerId,old.ownerId?emptyPlan():old.plan);}catch{next=old.ownerId?emptyPlan():old.plan;}return{ownerId,plan:next};});
  },[account.status,account.user?.id]);
  const hadSavedPlan = Boolean(initial.stops.length || initial.date || initial.budget || initial.adults || initial.origin.query);
  const items = plan.stops.map((stop) => stop.nodeId);
  const [savedLocally, setSavedLocally] = useState(true);
  useEffect(() => {
    try { setSavedLocally(draft.ownerId?saveAccountDraft(localStorage,draft.ownerId,plan):savePlan(localStorage, plan)); }
    catch { setSavedLocally(false); }
  }, [plan,draft.ownerId]);
  const add = (id) => setPlan((p) => !getNode(id) || p.stops.some((stop) => stop.nodeId === id) ? p : { ...p, stops: [...p.stops, createStop(id)] });
  const remove = (id) => setPlan((p) => ({ ...p, stops: p.stops.filter((stop) => stop.nodeId !== id) }));
  const clear = () => {setPlan(emptyPlan());setCloudCard(null);};
  const loadAccountCard=card=>{setPlan(normalizePlan(card.plan));setCloudCard({id:card.id,title:card.title,updatedAt:card.updated_at,ownerId:account.user?.id});};
  const markAccountCard=card=>setCloudCard({id:card.id,title:card.title,updatedAt:card.updated_at,ownerId:account.user?.id});
  const updatePlan = (patch) => setPlan((p) => ({ ...p, ...patch }));
  const updateStop = (id, patch) => setPlan((p) => ({ ...p, stops: p.stops.map((stop) => stop.nodeId === id ? { ...stop, ...patch } : stop) }));
  const move = (id, offset) => setPlan((p) => {
    const index = p.stops.findIndex((stop) => stop.nodeId === id), target = index + offset;
    if (index < 0 || target < 0 || target >= p.stops.length) return p;
    const stops = [...p.stops]; [stops[index], stops[target]] = [stops[target], stops[index]];
    return { ...p, stops };
  });
  const applyScene = (scene) => setPlan((p) => scenePlan(scene, p));
  const setRoute = (key, route) => setPlan((p) => ({ ...p, routes: { ...p.routes, [key]: route } }));
  const has = (id) => items.includes(id);
  return (
    <Ctx.Provider value={{ items, plan, hadSavedPlan, add, remove, clear, has, savedLocally, updatePlan, updateStop, move, applyScene, setRoute,cloudCard,loadAccountCard,markAccountCard }}>{children}</Ctx.Provider>
  );
}

export function useItinerary() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useItinerary must be inside ItineraryProvider');
  return v;
}
