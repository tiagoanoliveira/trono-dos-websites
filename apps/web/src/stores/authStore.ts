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
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; avatar_url?: string }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const res = await api.get<AuthUser>('/auth/me');
      if (res.success && res.data) {
        set({ user: res.data, isAuthenticated: true });
      } else {
        set({ user: null, isAuthenticated: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false });
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
      const { user } = res.data;
      set({ user, isAuthenticated: true });
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
      const { user } = res.data;
      set({ user, isAuthenticated: true });
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
      const { user } = res.data;
      set({ user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await api.post('/auth/logout');
    set({ user: null, isAuthenticated: false });
  },

  updateProfile: async (data) => {
    const res = await api.put<AuthUser>('/auth/me', data);
    if (!res.success || !res.data) {
      throw new Error(res.error?.message ?? 'Erro ao atualizar perfil');
    }
    set({ user: res.data });
  },
}));
