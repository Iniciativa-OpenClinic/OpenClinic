import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.js';
import { ConfigProvider } from './context/ConfigContext.js';
import { AuthProvider } from './context/AuthContext.js';
import { I18nProvider } from './i18n/context.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider>
      <I18nProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </I18nProvider>
    </ConfigProvider>
  </React.StrictMode>,
);
