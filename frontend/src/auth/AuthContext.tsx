import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, login as apiLogin, register as apiRegister, setToken } from '../api';

interface Me {
  id: number;
  email: string;
}

interface AuthContextValue {
  user: Me | null;
  loading: boolean;
  personalMode: boolean;
  registrationEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [personalMode, setPersonalMode] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);

  useEffect(() => {
    api
      .get<{ personal_mode: boolean; registration_enabled: boolean }>('/api/auth/config')
      .then(async (config) => {
        setPersonalMode(config.personal_mode);
        setRegistrationEnabled(config.registration_enabled);
        if (config.personal_mode || getToken()) setUser(await api.get<Me>('/api/auth/me'));
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      personalMode,
      registrationEnabled,
      login: async (email, password) => {
        const { access_token } = await apiLogin(email, password);
        setToken(access_token);
        const me = await api.get<Me>('/api/auth/me');
        setUser(me);
      },
      register: async (email, password) => {
        const { access_token } = await apiRegister(email, password);
        setToken(access_token);
        const me = await api.get<Me>('/api/auth/me');
        setUser(me);
      },
      logout: () => {
        clearToken();
        setUser(null);
      },
    }),
    [user, loading, personalMode, registrationEnabled],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
