// src/store/userStore
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User } from "@/types";
import type { AnonymousMessage } from "../types";

interface UserState {
  user: User | null;
  messages: AnonymousMessage[] | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchUser: (userId: string) => Promise<void>;
  fetchMessages: (userId: string) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  subscribeToUser: (userId: string) => (() => void) | null;
  subscribeToMessages: (userId: string) => (() => void) | null;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      messages: null,
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
            // Ensure all fields exist with default values
            if (!userData.points) userData.points = "0";
            if (userData.freeThreadsRemaining === undefined)
              userData.freeThreadsRemaining = 3;
            if (userData.hasSeenRefillPrompt === undefined)
              userData.hasSeenRefillPrompt = false;
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

      // Fetch messages from Firestore (initial fetch without subscription)
      fetchMessages: async (userId: string) => {
        set({ loading: true, error: null });

        try {
          const q = query(
            collection(db, `users/${userId}/messages`),
            orderBy("timestamp", "desc")
          );
          const snapshot = await getDocs(q);
          const messageData = snapshot.docs.map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              } as AnonymousMessage)
          );
          set({ messages: messageData, loading: false });
        } catch (error) {
          console.error("Error fetching messages:", error);
          set({
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch messages",
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
        if (user) {
          // Ensure all fields exist with default values
          if (!user.points) user.points = "0";
          if (user.freeThreadsRemaining === undefined)
            user.freeThreadsRemaining = 3;
          if (user.hasSeenRefillPrompt === undefined)
            user.hasSeenRefillPrompt = false;
        }
        set({ user, error: null });
      },

      // Clear user data (useful for logout)
      clearUser: () => {
        set({ user: null, messages: null, error: null, loading: false });
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
              // Ensure all fields exist with default values
              if (!userData.points) userData.points = "0";
              if (userData.freeThreadsRemaining === undefined)
                userData.freeThreadsRemaining = 3;
              if (userData.hasSeenRefillPrompt === undefined)
                userData.hasSeenRefillPrompt = false;
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

      // Subscribe to real-time message updates
      subscribeToMessages: (userId: string) => {
        if (!userId) return null;

        const q = query(
          collection(db, `users/${userId}/messages`),
          orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const messageData = snapshot.docs.map(
              (doc) =>
                ({
                  id: doc.id,
                  ...doc.data(),
                } as AnonymousMessage)
            );
            set({ messages: messageData, error: null });
          },
          (error) => {
            console.error("Error in message subscription:", error);
            set({ error: error.message });
          }
        );

        return unsubscribe;
      },
    }),
    {
      name: "user-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        messages: state.messages,
      }),
    }
  )
);

// Selector hooks for convenient access to specific data
export const useUsername = () => useUserStore((state) => state.user?.userName);
export const useUserAvatar = () => useUserStore((state) => state.user?.avatar);
export const useUserBio = () => useUserStore((state) => state.user?.bio);
export const useUserEmail = () => useUserStore((state) => state.user?.email);
export const useUserPoints = () =>
  useUserStore((state) => state.user?.points || "0");
export const useFreeThreadsRemaining = () =>
  useUserStore((state) => state.user?.freeThreadsRemaining || 0);
export const useHasSeenRefillPrompt = () =>
  useUserStore((state) => state.user?.hasSeenRefillPrompt || false);
export const useMessages = () => useUserStore((state) => state.messages);
