import { create } from 'zustand';
import { api } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: 'user' | 'moderator' | 'admin';
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { name?: string; avatar_url?: string }) => Promise<void>;
}

const TOKEN_KEY = 'trono-token';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  initialize: async () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return;
    api.setToken(stored);
    try {
      const res = await api.get<AuthUser>('/auth/me');
      if (res.success && res.data) {
        set({ user: res.data, token: stored, isAuthenticated: true });
      } else {
        localStorage.removeItem(TOKEN_KEY);
        api.setToken(null);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      api.setToken(null);
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
        email,
        password,
      });
      if (!res.success || !res.data) {
        throw new Error(res.error?.message ?? 'Erro ao entrar');
      }
      const { token, user } = res.data;
      localStorage.setItem(TOKEN_KEY, token);
      api.setToken(token);
      set({ user, token, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithGoogle: async (idToken) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/google', { id_token: idToken });
      if (!res.success || !res.data) {
        throw new Error(res.error?.message ?? 'Erro ao entrar com Google');
      }
      const { token, user } = res.data;
      localStorage.setItem(TOKEN_KEY, token);
      api.setToken(token);
      set({ user, token, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, name, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/register', {
        email,
        name,
        password,
      });
      if (!res.success || !res.data) {
        throw new Error(res.error?.message ?? 'Erro ao criar conta');
      }
      const { token, user } = res.data;
      localStorage.setItem(TOKEN_KEY, token);
      api.setToken(token);
      set({ user, token, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    api.setToken(null);
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateProfile: async (data) => {
    const res = await api.put<AuthUser>('/auth/me', data);
    if (!res.success || !res.data) {
      throw new Error(res.error?.message ?? 'Erro ao atualizar perfil');
    }
    set({ user: res.data });
  },
}));
