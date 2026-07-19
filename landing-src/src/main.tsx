import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import Home from './pages/Home';
import Products from './pages/Products';
import StoreAnalyzer from './pages/StoreAnalyzer';
import CampaignCalculator from './pages/CampaignCalculator';
import ContentScheduler from './pages/ContentScheduler';
import Login from './pages/Login';
import Register from './pages/Register';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/store-analyzer" element={<StoreAnalyzer />} />
          <Route path="/campaign-calculator" element={<CampaignCalculator />} />
          <Route
            path="/content-scheduler"
            element={
              <RequireAuth>
                <ContentScheduler />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
