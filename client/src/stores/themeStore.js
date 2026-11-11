import { create } from "zustand";
import { persist } from "zustand/middleware";

import { STORAGE_KEYS } from "../app/config/constants";

/**
 * theme         what the person chose: "light" | "dark" | "system"  (saved)
 * resolvedTheme what is actually shown: "light" | "dark"           (derived)
 */
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: "dark",
      resolvedTheme:
        typeof document !== "undefined"
          ? (document.documentElement.dataset.theme ?? "dark")
          : "dark",

      setTheme: (theme) => set({ theme }),
      setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
    }),
    {
      name: STORAGE_KEYS.theme,
      partialize: ({ theme }) => ({ theme }),
    },
  ),
);
