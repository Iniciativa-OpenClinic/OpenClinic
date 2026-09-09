import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.js';
import DashboardPage from './pages/DashboardPage.js';
import { useAuth } from './hooks/useAuth.js';
import { useConfig } from './context/ConfigContext.js';
import { useI18n } from './i18n/context.js';

export default function App() {
  const { accessToken } = useAuth();
  const { config } = useConfig();
  const { setLocale, setSupportedLocales } = useI18n();

  useEffect(() => {
    if (config?.supportedLocales && Array.isArray(config.supportedLocales)) {
      setSupportedLocales(config.supportedLocales);
    }
    if (typeof window !== 'undefined') {
      const storedLocale = localStorage.getItem('openclinic_locale');
      if (!storedLocale && config?.defaultLocale) {
        setLocale(config.defaultLocale as any);
      }
    }
  }, [config, setLocale, setSupportedLocales]);

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
