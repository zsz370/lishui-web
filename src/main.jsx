import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ItineraryProvider } from './data/store.jsx';
import App from './App.jsx';
import './index.css';
import './styles/Experience.css';
import './styles/Services.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ItineraryProvider>
        <App />
      </ItineraryProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
