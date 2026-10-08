import { createContext, useContext, useState } from 'react';

const DesignReviewContext = createContext({ modern: true, mobile: false, framed: false, reviewEnabled: false, setModern: () => {}, setMobile: () => {} });
export function DesignReviewProvider({ children }) {
  const [reviewEnabled] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return import.meta.env.DEV && (params.get('designReview') === '1' || params.get('reviewFrame') === '1');
  });
  const [modern, setModern] = useState(() => !reviewEnabled || new URLSearchParams(window.location.search).get('version') !== 'original');
  const [mobile, setMobile] = useState(false);
  const framed = import.meta.env.DEV && window.self !== window.top;
  return <DesignReviewContext.Provider value={{ modern, setModern, mobile, setMobile, framed, reviewEnabled }}>{children}</DesignReviewContext.Provider>;
}
export const useDesignReview = () => useContext(DesignReviewContext);
