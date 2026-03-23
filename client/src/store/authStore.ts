import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { connectSocket, disconnectSocket } from '../socket/socket';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        connectSocket(token);
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        disconnectSocket();
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'weorder-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
