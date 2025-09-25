// src/store/themeStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeState {
  theme: "fun" | "pro";
  setTheme: (theme: "fun" | "pro") => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "fun", // Default to fun mode for child-like aesthetic
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "fun" ? "pro" : "fun",
        })),
    }),
    {
      name: "theme-storage", // Persist theme in localStorage
    }
  )
);