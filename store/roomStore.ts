import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Room } from "../types";

interface RoomState {
  rooms: Room[];
  isLoading: boolean;
  error: string | null;
  unsubscribe: Unsubscribe | null;

  // Actions
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  removeRoom: (roomId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Firebase operations
  subscribeToRooms: (userId: string) => void;
  unsubscribeFromRooms: () => void;
  createRoom: (roomData: {
    name: string;
    bio: string;
    creatorId: string;
  }) => Promise<string>;

  // Utility functions
  getRoomById: (roomId: string) => Room | undefined;
  getUserRooms: (userId: string) => Room[];
  clearRooms: () => void;
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set, get) => ({
      rooms: [],
      isLoading: false,
      error: null,
      unsubscribe: null,

      // Basic state setters
      setRooms: (rooms) => set({ rooms, error: null }),

      addRoom: (room) =>
        set((state) => ({
          rooms: [...state.rooms, room],
          error: null,
        })),

      updateRoom: (roomId, updates) =>
        set((state) => ({
          rooms: state.rooms.map((room) =>
            room.id === roomId ? { ...room, ...updates } : room
          ),
        })),

      removeRoom: (roomId) =>
        set((state) => ({
          rooms: state.rooms.filter((room) => room.id !== roomId),
        })),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      // Firebase operations
      subscribeToRooms: (userId: string) => {
        const { unsubscribe: currentUnsub } = get();

        // Clean up existing subscription
        if (currentUnsub) {
          currentUnsub();
        }

        set({ isLoading: true, error: null });

        try {
          const roomsRef = collection(db, "rooms");
          const q = query(roomsRef, orderBy("timestamp", "desc"));

          const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
              const roomsData = snapshot.docs
                .map(
                  (doc) =>
                    ({
                      id: doc.id,
                      ...doc.data(),
                    } as Room)
                )
                .filter(
                  (room) =>
                    room.creatorId === userId ||
                    (room.members && room.members.includes(userId))
                );

              set({
                rooms: roomsData,
                isLoading: false,
                error: null,
              });
            },
            (error) => {
              console.error("Error fetching rooms:", error);
              set({
                error: error.message || "Failed to fetch rooms",
                isLoading: false,
              });
            }
          );

          set({ unsubscribe });
        } catch (error) {
          console.error("Error setting up rooms subscription:", error);
          set({
            error: error instanceof Error ? error.message : "Unknown error",
            isLoading: false,
          });
        }
      },

      unsubscribeFromRooms: () => {
        const { unsubscribe } = get();
        if (unsubscribe) {
          unsubscribe();
          set({ unsubscribe: null });
        }
      },

      createRoom: async (roomData) => {
        set({ isLoading: true, error: null });

        try {
          const avatar = roomData.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase();

          const newRoomData = {
            name: roomData.name,
            bio: roomData.bio,
            creatorId: roomData.creatorId,
            createdAt: serverTimestamp(),
            lastMessage: "",
            timestamp: serverTimestamp(),
            avatar,
            members: [roomData.creatorId],
          };

          const docRef = await addDoc(collection(db, "rooms"), newRoomData);

          // The room will be automatically added to the store via the subscription
          set({ isLoading: false });
          return docRef.id;
        } catch (error) {
          console.error("Error creating room:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Failed to create room";
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Utility functions
      getRoomById: (roomId: string) => {
        const { rooms } = get();
        return rooms.find((room) => room.id === roomId);
      },

      getUserRooms: (userId: string) => {
        const { rooms } = get();
        return rooms.filter(
          (room) =>
            room.creatorId === userId ||
            (room.members && room.members.includes(userId))
        );
      },

      clearRooms: () => {
        const { unsubscribeFromRooms } = get();
        unsubscribeFromRooms();
        set({
          rooms: [],
          isLoading: false,
          error: null,
          unsubscribe: null,
        });
      },
    }),
    {
      name: "room-storage",
      // Only persist rooms data, not loading states or subscriptions
      partialize: (state) => ({
        rooms: state.rooms,
      }),
    }
  )
);
