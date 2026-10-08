import { useDesignReview } from '../data/designReview.jsx';
import { CaretDown } from '@phosphor-icons/react';

// Keep optional tools available without making them dominate the planning page.
export default function ReviewDisclosure({ title, children }) {
  const { modern } = useDesignReview();
  return modern ? <details className="review-disclosure"><summary>{title}<CaretDown size={18} aria-hidden="true"/></summary>{children}</details> : children;
}
