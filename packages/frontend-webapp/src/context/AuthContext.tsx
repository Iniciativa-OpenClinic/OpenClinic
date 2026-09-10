import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  refreshTokens as apiRefresh,
  getProfile as apiGetProfile,
  getCapabilities as apiGetCapabilities,
  getPermissions as apiGetPermissions,
  getAccessToken,
  clearTokens,
  setOnSessionExpired,
} from '../services/api.js';
import { t } from '../i18n/index.js';
import type { UserProfile, TokenPayload, IAMCapability } from '../types/auth.js';
import { ResourceAction, UserRole } from '@openclinic/core/shared';

function decodeJwtPayload(token: string): TokenPayload | null {
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(atob(base64)) as TokenPayload;
  } catch {
    return null;
  }
}

interface AuthContextType {
  accessToken: string | null;
  user: UserProfile | null;
  claims: TokenPayload | null;
  capabilities: IAMCapability[];
  permissions: string[];
  error: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  fetchProfile: () => Promise<void>;
  hasCapability: (resourceKey: string, action?: ResourceAction) => boolean;
  hasPermission: (key: string) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(getAccessToken());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [claims, setClaims] = useState<TokenPayload | null>(null);
  const [capabilities, setCapabilities] = useState<IAMCapability[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expiredCountdown, setExpiredCountdown] = useState<number | null>(null);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setAccessToken(null);
      setUser(null);
      setClaims(null);
      setExpiredCountdown(null);
      clearTokens();
    }
  }, []);

  // Registrar callback de sessão expirada do apiFetch
  useEffect(() => {
    setOnSessionExpired(() => {
      setExpiredCountdown((prev) => (prev === null ? 3 : prev));
    });
    return () => {
      setOnSessionExpired(null);
    };
  }, []);

  // Timer regressivo de 3 segundos para logout automático
  useEffect(() => {
    if (expiredCountdown === null) return;

    if (expiredCountdown <= 0) {
      logout();
      return;
    }

    const timer = setTimeout(() => {
      setExpiredCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [expiredCountdown, logout]);

  const login = useCallback(async (identifier: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiLogin(identifier, password);
      setAccessToken(response.access_token);
      setUser(response.user);
      setClaims(decodeJwtPayload(response.access_token));

      // Carregar permissions e capabilities
      try {
        const [caps, perms] = await Promise.all([
          apiGetCapabilities(),
          apiGetPermissions(),
        ]);
        setCapabilities(caps);
        setPermissions(perms);
      } catch {
        // Fallback silencioso
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ERROR_PROCESS_REQUEST'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const response = await apiRefresh();
      setAccessToken(response.access_token);
      setClaims(decodeJwtPayload(response.access_token));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ERROR_TOKEN_EXPIRED'));
      return false;
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    setError(null);
    try {
      const profile = await apiGetProfile();
      setUser(profile);

      try {
        const [caps, perms] = await Promise.all([
          apiGetCapabilities(),
          apiGetPermissions(),
        ]);
        setCapabilities(caps);
        setPermissions(perms);
      } catch {
        // Fallback silencioso
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ERROR_COMMUNICATION'));
    }
  }, []);

  const hasCapability = useCallback(
    (resourceKey: string, action: ResourceAction = ResourceAction.READ): boolean => {
      if (!user) return false;
      if (user.role === UserRole.OWNER) return true;

      const cap = capabilities.find((c) => c.key === resourceKey);
      if (!cap) return false;

      if (cap.actions.includes(ResourceAction.ALL) || cap.actions.includes(ResourceAction.MANAGE)) return true;
      return cap.actions.includes(action);
    },
    [user, capabilities]
  );

  const hasPermission = useCallback(
    (key: string): boolean => {
      if (!user) return false;
      if (user.role === UserRole.OWNER) return true;
      return permissions.includes(key);
    },
    [user, permissions]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        claims,
        capabilities,
        permissions,
        error,
        isLoading,
        login,
        logout,
        refresh,
        fetchProfile,
        hasCapability,
        hasPermission,
        clearError,
      }}
    >
      {children}

      {/* POPUP MODAL: Sessão Expirada com Contagem Regressiva de 3s */}
      {expiredCountdown !== null && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: 16,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: '28px 24px',
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #fde68a',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            {/* Ícone de Alerta Animado */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#d97706',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                marginBottom: 16,
                border: '2px solid #fde68a',
              }}
            >
              ⏳
            </div>

            <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '1.2rem', fontWeight: 800 }}>
              {t('SESSION_EXPIRED_TITLE')}
            </h3>

            <p style={{ margin: '0 0 20px', color: '#475569', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {t('SESSION_EXPIRED_MSG', { seconds: expiredCountdown })}
            </p>

            {/* Badge com Contador Regressivo */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 20,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  letterSpacing: '0.05em',
                }}
              >
                <span>⏱️</span>
                <span>{expiredCountdown}s</span>
              </div>
            </div>

            {/* Botão para Redirecionamento Imediato */}
            <button
              onClick={() => logout()}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: 10,
                background: '#0ea5e9',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
                transition: 'transform 0.1s ease',
              }}
            >
              {t('BTN_GO_TO_LOGIN_NOW')} ({expiredCountdown}s)
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
