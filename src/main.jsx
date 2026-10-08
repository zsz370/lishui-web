import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ItineraryProvider } from './data/store.jsx';
import App from './App.jsx';
import './index.css';
import './styles/Experience.css';
import './styles/Services.css';
import './styles/TravelDesign.css';
import './styles/Expedition.css';
import './pages/DesignPreview.css';
import './styles/WholeSiteDesign.css';
import { AccountProvider } from './data/account.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AccountProvider><ItineraryProvider>
        <App />
      </ItineraryProvider></AccountProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
