import { Link } from 'react-router-dom';
import { ArrowUpRight, Bed, CloudSun, Train, Translate } from '@phosphor-icons/react';
import { serviceUrl } from '../data/travelServices.js';
const shortcuts = [
  { id: 'weather', name: '查天气', icon: CloudSun },
  { id: 'stay', name: '选住宿', icon: Bed },
  { id: 'transport', name: '问交通', icon: Train },
  { id: 'etiquette', name: '礼仪双语', icon: Translate },
];
export default function ServiceShortcuts({ compact = false }) {
  return <section className={`travel-shortcuts ${compact ? 'is-compact' : ''}`} aria-label="旅途服务">
    <div className="section-heading"><div><p className="section-overline">出发前，也照顾好日常</p><h2>吃住行的小事，有人陪你想。</h2></div><Link to="/services">全部旅途服务 <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
    <div className="travel-shortcut-links">{shortcuts.map((service) => {
      const Icon = service.icon;
      return <Link key={service.id} to={serviceUrl(service.id)}><Icon size={23} weight="light" aria-hidden="true" /><span>{service.name}</span><ArrowUpRight size={13} aria-hidden="true" /></Link>;
    })}</div>
  </section>;
}
