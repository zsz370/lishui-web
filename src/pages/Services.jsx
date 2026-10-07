import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Bed, CloudSun, Train, Translate, Lifebuoy, Wheelchair, Gift, MapTrifold } from '@phosphor-icons/react';
import { travelServices, getTravelService, serviceUrl, stayDefaults, serviceSources } from '../data/travelServices.js';
import { getPersona, guideUrl } from '../data/personas.js';
import GuideAvatar from '../components/GuideAvatar.jsx';
import PageGuide from '../components/PageGuide.jsx';
import WeatherPanel from '../components/WeatherPanel.jsx';
import StayPlanner from '../components/StayPlanner.jsx';

const icons = { weather: CloudSun, stay: Bed, transport: Train, etiquette: Translate, support: Lifebuoy, accessibility: Wheelchair, shopping: Gift, planning: MapTrifold };

export default function Services() {
  const [params] = useSearchParams();
  const service = getTravelService(params.get('service')) || travelServices[0];
  const guide = getPersona(service.expert);

  const [preferences, setPreferences] = useState(stayDefaults);
  return <div className="services-experience"><Link to="/" className="detail-back"><ArrowLeft size={17} aria-hidden="true" />回到会客厅</Link>
    <div className="explore-heading"><div><p className="section-overline">玩得尽兴，也过得从容</p><h1>旅途服务</h1><p>住宿、天气、交通和日常需求，直接问淮源姐。</p></div><Link to="/itinerary">看看我的行程 <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
    <nav className="service-menu" aria-label="旅途服务分类">{travelServices.map((item) => {
      const Icon = icons[item.icon];
      return <Link key={item.id} to={serviceUrl(item.id)} className={item.id === service.id ? 'is-selected' : ''} aria-current={item.id === service.id ? 'page' : undefined}><Icon size={22} weight="light" aria-hidden="true" /><span>{item.shortName}</span></Link>;
    })}</nav>
    <div className="service-guide-heading"><GuideAvatar persona={guide} /><div><h2>{service.name}</h2><p>{guide.name} · {service.description}</p></div><Link to={guideUrl(guide.id)}>问淮源姐 <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    <div className="service-content-layout"><section className="service-information" aria-label={`${service.name}资料与建议`}>
      {service.id === 'weather' ? <WeatherPanel /> : service.id === 'stay' ? <StayPlanner onPreferences={setPreferences} /> : <div className="service-reading"><h3>先把这几件事想清楚</h3><ul>{service.points.map((point) => <li key={point}>{point}</li>)}</ul>
        {service.id === 'transport' && <><div className="transport-options"><h4>怎么到溧水？</h4><p><strong>高铁：</strong>在12306按出发站与到达站核对车次，到站后再安排接驳。</p><p><strong>地铁：</strong>S7与S9服务方向不同，按实际目的地查看当日线路与换乘。</p><p><strong>自驾：</strong>核对景区正式入口、停车场与返程路线，不默认有空位或充电桩。</p></div><a className="service-reference" href={serviceSources.transit.url} target="_blank" rel="noreferrer">查看最新地铁调整参考 <ArrowUpRight size={14} aria-hidden="true" /></a></>}
        {service.id === 'support' && <div className="service-urgent"><h4>紧急危险，先联系现场人员</h4><p>公安110 · 医疗急救120 · 火警119</p><small>网页提供指引，不能代替报警、救援或现场登记。</small><a href={serviceSources.hotlines.url} target="_blank" rel="noreferrer">电话来源：南京市政府</a></div>}
        {service.id === 'etiquette' && <div className="service-phrases"><p><strong>May I take a photo here?</strong><span>请问这里可以拍照吗？</span></p><p><strong>Where is the restroom, please?</strong><span>请问洗手间在哪里？</span></p><p><strong>Could you help me, please?</strong><span>请问可以帮我一下吗？</span></p></div>}
        {service.id === 'accessibility' && <Link className="experience-text-button" to={serviceUrl('stay')}>一起考虑住宿条件 <ArrowUpRight size={15} aria-hidden="true" /></Link>}
        {service.id === 'shopping' && <Link className="experience-text-button" to="/nodes?topic=flavors&group=sweet">认识糕点与乡味 <ArrowUpRight size={15} aria-hidden="true" /></Link>}
        {service.id === 'planning' && <Link className="experience-button" to="/itinerary">整理我的行程 <ArrowUpRight size={15} aria-hidden="true" /></Link>}
      </div>}
    </section><section className="service-conversation" aria-label={`${guide.name}服务咨询`}><PageGuide service={service} title={`问问${service.name}`} prompts={service.prompts} preferences={preferences} /></section></div>
    <p className="service-boundary-note">可查询天气、住宿报价、地点路线与译文；淮源姐结合你的条件整理安排。房型库存、末班车、设施与订单规则请向对应经营方确认。</p>
  </div>;
}
