import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { User } from "../types";

interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchUser: (userId: string) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  subscribeToUser: (userId: string) => (() => void) | null;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      error: null,

      // Fetch user data from Firestore
      fetchUser: async (userId: string) => {
        set({ loading: true, error: null });

        try {
          const userDocRef = doc(db, "users", userId);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            set({ user: userData, loading: false });
          } else {
            set({
              user: null,
              loading: false,
              error: "User not found",
            });
          }
        } catch (error) {
          console.error("Error fetching user:", error);
          set({
            loading: false,
            error:
              error instanceof Error ? error.message : "Failed to fetch user",
          });
        }
      },

      // Update user data in Firestore
      updateUser: async (userId: string, updates: Partial<User>) => {
        set({ loading: true, error: null });

        try {
          const userDocRef = doc(db, "users", userId);
          await updateDoc(userDocRef, updates);

          // Update local state
          const currentUser = get().user;
          if (currentUser) {
            set({
              user: { ...currentUser, ...updates },
              loading: false,
            });
          }
        } catch (error) {
          console.error("Error updating user:", error);
          set({
            loading: false,
            error:
              error instanceof Error ? error.message : "Failed to update user",
          });
        }
      },

      // Set user directly (useful for login scenarios)
      setUser: (user: User | null) => {
        set({ user, error: null });
      },

      // Clear user data (useful for logout)
      clearUser: () => {
        set({ user: null, error: null, loading: false });
      },

      // Subscribe to real-time user updates
      subscribeToUser: (userId: string) => {
        if (!userId) return null;

        const userDocRef = doc(db, "users", userId);

        const unsubscribe = onSnapshot(
          userDocRef,
          (doc) => {
            if (doc.exists()) {
              const userData = doc.data() as User;
              set({ user: userData, error: null });
            } else {
              set({ user: null, error: "User not found" });
            }
          },
          (error) => {
            console.error("Error in user subscription:", error);
            set({ error: error.message });
          }
        );

        return unsubscribe;
      },
    }),
    {
      name: "user-store", // Storage key
      storage: createJSONStorage(() => localStorage),
      // Only persist the user data, not loading/error states
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);

// Selector hooks for convenient access to specific data
export const useUsername = () => useUserStore((state) => state.user?.userName);
export const useUserAvatar = () => useUserStore((state) => state.user?.avatar);
export const useUserBio = () => useUserStore((state) => state.user?.bio);
export const useUserEmail = () => useUserStore((state) => state.user?.email);
