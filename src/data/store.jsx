import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);

export function ItineraryProvider({ children }) {
  const [items, setItems] = useState([]);
  const add = (id) => setItems((p) => (p.includes(id) ? p : [...p, id]));
  const remove = (id) => setItems((p) => p.filter((x) => x !== id));
  const clear = () => setItems([]);
  const has = (id) => items.includes(id);
  return (
    <Ctx.Provider value={{ items, add, remove, clear, has }}>{children}</Ctx.Provider>
  );
}

export function useItinerary() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useItinerary must be inside ItineraryProvider');
  return v;
}
