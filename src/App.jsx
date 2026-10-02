import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Nodes from './pages/Nodes.jsx';
import NodeDetail from './pages/NodeDetail.jsx';
import Itinerary from './pages/Itinerary.jsx';
import About from './pages/About.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/nodes" element={<Nodes />} />
        <Route path="/nodes/:id" element={<NodeDetail />} />
        <Route path="/itinerary" element={<Itinerary />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  );
}
