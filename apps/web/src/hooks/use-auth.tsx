'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { api } from '@/lib/api';

// ─── Types ───
interface User {
  id: string;
  email: string;
  name: string;
  locale: string;
  role?: {
    id: string;
    name: string;
    code: string;
  };
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

// ─── Context ───
const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ───
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    if (stored && token) {
      try {
        const user = JSON.parse(stored) as User;
        setState({ user, isLoading: false, isAuthenticated: true });
      } catch {
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    } else {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const res = await api.post<LoginResponse>('/auth/login', credentials);
    localStorage.setItem('access_token', res.accessToken);
    localStorage.setItem('refresh_token', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    setState({ user: res.user, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setState({ user: null, isLoading: false, isAuthenticated: false });
    window.location.href = '/en/login';
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ───
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
