import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { GuideSessionProvider } from './data/guideSession.jsx';
import './styles/Readability.css';
import './styles/SingleGuide.css';
const Home=lazy(()=>import('./pages/Home.jsx')),Guide=lazy(()=>import('./pages/Guide.jsx')),Nodes=lazy(()=>import('./pages/Nodes.jsx')),NodeDetail=lazy(()=>import('./pages/NodeDetail.jsx')),Atlas=lazy(()=>import('./pages/Atlas.jsx')),Itinerary=lazy(()=>import('./pages/Itinerary.jsx')),About=lazy(()=>import('./pages/About.jsx')),Services=lazy(()=>import('./pages/Services.jsx')),DragonExperience=lazy(()=>import('./pages/DragonExperience.jsx'));
export default function App(){return <GuideSessionProvider><Layout><Suspense fallback={<div className="page-loading" role="status">正在打开这一页…</div>}><Routes><Route path="/" element={<Home/>}/><Route path="/guide" element={<Guide/>}/><Route path="/guides" element={<Navigate to="/guide" replace/>}/><Route path="/nodes" element={<Nodes/>}/><Route path="/nodes/:id" element={<NodeDetail/>}/><Route path="/atlas" element={<Atlas/>}/><Route path="/itinerary" element={<Itinerary/>}/><Route path="/services" element={<Services/>}/><Route path="/culture/dragon" element={<DragonExperience/>}/><Route path="/about" element={<About/>}/><Route path="*" element={<Home/>}/></Routes></Suspense></Layout></GuideSessionProvider>;}
