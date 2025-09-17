import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  initializeAuth: () => () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      initializeAuth: () => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          set({ user });
        });
        return unsubscribe;
      },
    }),
    {
      name: "auth-storage", // Persist auth state in localStorage
    }
  )
);
