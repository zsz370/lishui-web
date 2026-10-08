import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { GuideSessionProvider } from './data/guideSession.jsx';
import Home from './pages/Home.jsx';
import { DesignReviewProvider } from './data/designReview.jsx';
import './styles/Readability.css';
import './styles/SingleGuide.css';
const DesignPreview = import.meta.env.DEV ? lazy(() => import('./pages/DesignPreview.jsx')) : null;
const Guide=lazy(()=>import('./pages/Guide.jsx')),Nodes=lazy(()=>import('./pages/Nodes.jsx')),NodeDetail=lazy(()=>import('./pages/NodeDetail.jsx')),Atlas=lazy(()=>import('./pages/Atlas.jsx')),Itinerary=lazy(()=>import('./pages/Itinerary.jsx')),Account=lazy(()=>import('./pages/Account.jsx')),Services=lazy(()=>import('./pages/Services.jsx')),DragonExperience=lazy(()=>import('./pages/DragonExperience.jsx'));
export default function App(){return <DesignReviewProvider><GuideSessionProvider><Layout><Suspense fallback={<div className="page-loading" role="status">正在打开这一页…</div>}><Routes>{import.meta.env.DEV && <Route path="/design-preview" element={<DesignPreview/>}/>}<Route path="/" element={<Home/>}/><Route path="/guide" element={<Guide/>}/><Route path="/guides" element={<Navigate to="/guide" replace/>}/><Route path="/nodes" element={<Nodes/>}/><Route path="/nodes/:id" element={<NodeDetail/>}/><Route path="/atlas" element={<Atlas/>}/><Route path="/itinerary" element={<Itinerary/>}/><Route path="/services" element={<Services/>}/><Route path="/culture/dragon" element={<DragonExperience/>}/><Route path="/login" element={<Account/>}/><Route path="/account" element={<Navigate to="/login" replace/>}/><Route path="/about" element={<Navigate to="/login" replace/>}/><Route path="*" element={<Home/>}/></Routes></Suspense></Layout></GuideSessionProvider></DesignReviewProvider>;}
