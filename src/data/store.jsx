import { createContext, useContext, useEffect, useState } from 'react';
import { getNode } from './nodes.js';
import { emptyPlan, readPlan, savePlan, createStop, scenePlan } from './itinerary.js';

const Ctx = createContext(null);

export function ItineraryProvider({ children }) {
  const [plan, setPlan] = useState(() => { try { return readPlan(localStorage).plan; } catch { return emptyPlan(); } });
  const items = plan.stops.map((stop) => stop.nodeId);
  const [savedLocally, setSavedLocally] = useState(true);
  useEffect(() => {
    try { setSavedLocally(savePlan(localStorage, plan)); }
    catch { setSavedLocally(false); }
  }, [plan]);
  const add = (id) => setPlan((p) => !getNode(id) || p.stops.some((stop) => stop.nodeId === id) ? p : { ...p, stops: [...p.stops, createStop(id)] });
  const remove = (id) => setPlan((p) => ({ ...p, stops: p.stops.filter((stop) => stop.nodeId !== id) }));
  const clear = () => setPlan(emptyPlan());
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
    <Ctx.Provider value={{ items, plan, add, remove, clear, has, savedLocally, updatePlan, updateStop, move, applyScene, setRoute }}>{children}</Ctx.Provider>
  );
}

export function useItinerary() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useItinerary must be inside ItineraryProvider');
  return v;
}
