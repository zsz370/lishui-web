import { Link } from 'react-router-dom';
import { ArrowUpRight, MapTrifold, BookOpen } from '@phosphor-icons/react';
import HomeHero from '../components/HomeHero.jsx';
import Photo from '../components/Photo.jsx';
import {useItinerary} from '../data/store.jsx';
import './Home.css';
const picks=[{id:'n_tsq',name:'天生桥',subtitle:'沿一段河谷，认识秦淮源头',photo:'/nodes/n_tsq.jpg'},{id:'n_wx',name:'无想山',subtitle:'在山林之间，听一个故事',photo:'/nodes/n_wx.jpg'},{id:'f_szc',name:'洪蓝乡味',subtitle:'坐下来，尝一餐本地滋味',photo:'/assets/catalog/food-honglan-chicken.webp'}];
export default function Home(){const {items}=useItinerary();return <div className="home-experience single-home"><HomeHero itineraryCount={items.length}/>
 <section className="home-discover"><header><h2>从一处喜欢的地方开始。</h2><p>先看看风景，再让淮源姐陪你慢慢了解。</p></header><div className="home-picks">{picks.map(p=><Link key={p.id} to={'/nodes/'+p.id}><Photo src={p.photo} alt={p.name}/><div><h3>{p.name}</h3><p>{p.subtitle}</p><ArrowUpRight size={20}/></div></Link>)}</div><Link className="home-secondary-link" to="/nodes">发现更多山水、乡味与民俗 <ArrowUpRight size={18}/></Link></section>
 <section className="home-atlas-feature"><div><BookOpen size={29}/><h2>溧水的风物，<br/>值得慢慢翻。</h2><p>把山水、美食、民俗和街区收进一本图鉴。遇到好奇的内容，随时问淮源姐。</p><Link className="experience-button" to="/atlas">翻阅风物图鉴 <ArrowUpRight size={18}/></Link></div><Link to="/atlas" aria-label="打开风物图鉴"><Photo src="/assets/catalog/culture-luoshan-dragon.png" alt="骆山大龙资料配图"/></Link></section>
 <section className="home-itinerary-feature"><MapTrifold size={32}/><div><h2>把想去的地方，留在行程里。</h2><p>安排日期、交通和停留，生成可以随身带走的行程卡。</p></div><Link className="experience-button" to="/itinerary">整理我的行程{items.length?` · ${items.length}处`:''}<ArrowUpRight size={18}/></Link></section>
 </div>;}
