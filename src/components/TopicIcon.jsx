import { Mountains, ForkKnife, FlowerLotus, Armchair } from '@phosphor-icons/react';
const icons = { mountain: Mountains, food: ForkKnife, culture: FlowerLotus, leisure: Armchair };
export default function TopicIcon({ name, ...props }) {
  const Icon = icons[name] || Mountains;
  return <Icon size={26} weight="light" aria-hidden="true" {...props} />;
}
