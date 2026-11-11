import { create } from "zustand";
import { persist } from "zustand/middleware";

import { STORAGE_KEYS } from "../app/config/constants";
import * as authApi from "../features/auth/api/authApi";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,

      signIn: async (credentials) => {
        const { user, token } = await authApi.login(credentials);
        set({ user, token });
      },

      signUp: async (details) => {
        const { user, token } = await authApi.register(details);
        set({ user, token });
      },

      signOut: () => set({ user: null, token: null }),
    }),
    {
      name: STORAGE_KEYS.auth,
      partialize: ({ user, token }) => ({ user, token }),
    },
  ),
);

export const selectIsAuthenticated = (state) => Boolean(state.token);
