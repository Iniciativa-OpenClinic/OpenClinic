import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.js';
import DashboardPage from './pages/DashboardPage.js';
import { useAuth } from './hooks/useAuth.js';
import { useConfig } from './context/ConfigContext.js';
import { useI18n, LOCALE_STORAGE_KEY } from './i18n/context.js';
import type { SupportedLocale } from '@openclinic/core/shared';

export default function App() {
  const { accessToken, isInitializing } = useAuth();
  const { config } = useConfig();
  const { setLocale, setSupportedLocales } = useI18n();

  useEffect(() => {
    if (config?.supportedLocales && Array.isArray(config.supportedLocales)) {
      setSupportedLocales(config.supportedLocales);
    }
    if (typeof window !== 'undefined') {
      const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (!storedLocale && config?.defaultLocale) {
        setLocale(config.defaultLocale as SupportedLocale);
      }
    }
  }, [config, setLocale, setSupportedLocales]);

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #cbd5e1', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', height: '100vh', maxHeight: '100vh', background: '#f1f5f9', padding: 16, boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Routes>
        <Route path="/login" element={accessToken ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/dashboard" element={accessToken ? <DashboardPage /> : <Navigate to="/login" />} />
        <Route path="/*" element={accessToken ? <DashboardPage /> : <Navigate to="/login" />} />
      </Routes>
    </div>
  );
}
