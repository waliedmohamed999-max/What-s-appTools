import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Products from './pages/Products';
import StoreAnalyzer from './pages/StoreAnalyzer';
import CampaignCalculator from './pages/CampaignCalculator';
import ContentScheduler from './pages/ContentScheduler';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/store-analyzer" element={<StoreAnalyzer />} />
        <Route path="/campaign-calculator" element={<CampaignCalculator />} />
        <Route path="/content-scheduler" element={<ContentScheduler />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
