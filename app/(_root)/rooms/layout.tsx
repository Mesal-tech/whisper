"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { FiPlus, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useRoomStore } from "@/store/roomStore";
import type { Room } from "@/types";
import Image from "next/image";
import { Metadata } from "next";
import emptyRoomImage from "@/public/assets/images/empty-folder.png";
import bgImage from "@/public/assets/images/shh.jpeg";

// ✅ SEO (App Router)
const metadata: Metadata = {
  title: "Rooms | Connect & Chat",
  description:
    "Discover or create rooms to chat with like-minded people on Tovira. Real-time conversations, clean design, and endless connections.",
  openGraph: {
    title: "Rooms | Tovira",
    description: "Create or join rooms to chat in real time.",
    images: ["/assets/images/shh.jpeg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rooms | Tovira",
    description: "Create or join rooms to chat in real time.",
    images: ["/assets/images/shh.jpeg"],
  },
};

const EmptyRooms = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4">
    <Image
      src={emptyRoomImage}
      alt="No rooms found"
      width={160}
      height={160}
      className="opacity-70 mb-6"
      priority={false}
    />
    <h3 className="text-xl font-medium mb-2">No Rooms Found</h3>
    <p className="text-sm text-gray-400 max-w-xs">
      Start by creating your first room to connect and chat with like-minded
      people.
    </p>
  </div>
);

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

const RoomItem = ({ room, onClick }: { room: Room; onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className="flex items-center p-4 hover:bg-gray-800/50 cursor-pointer transition-colors duration-200 rounded-lg mx-2 my-1 shadow-sm hover:shadow-md"
    onClick={onClick}
    role="button"
    aria-label={`Open ${room.name}`}
  >
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center mr-4 bg-cover bg-center shrink-0 ring-1 ring-gray-700"
      style={{ backgroundImage: `url(${bgImage.src})` }}
    ></div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-white font-medium truncate text-xl">
          {room.name}
        </h3>
        <span className="text-gray-400 text-sm ml-2 shrink-0">
          {room.timestamp?.toDate
            ? timeAgo(room.timestamp.toDate())
            : "Just now"}
        </span>
      </div>
      <p className="text-gray-400 text-sm truncate">
        {room.lastMessage || "No messages yet"}
      </p>
    </div>
  </motion.div>
);

export default function RoomsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;

  const [showModal, setShowModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomBio, setRoomBio] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const { user } = useAuthStore();
  const {
    rooms,
    isLoading,
    error,
    subscribeToRooms,
    unsubscribeFromRooms,
    createRoom,
    clearRooms,
  } = useRoomStore();

  const hasRooms = useMemo(() => rooms.length > 0, [rooms]);

  // ✅ Handle screen resize efficiently
  useEffect(() => {
    const updateScreen = () => setIsMobile(window.innerWidth < 768);
    updateScreen();
    window.addEventListener("resize", updateScreen);
    return () => window.removeEventListener("resize", updateScreen);
  }, []);

  // ✅ Auth & room subscription
  useEffect(() => {
    if (!user) {
      router.push("/auth/signin");
      return;
    }
    subscribeToRooms(user.uid);
    return () => unsubscribeFromRooms();
  }, [user, router, subscribeToRooms, unsubscribeFromRooms]);

  useEffect(() => {
    if (!user) clearRooms();
  }, [user, clearRooms]);

  // ✅ Room creation logic (memoized)
  const handleCreateRoom = useCallback(async () => {
    if (!roomName.trim() || !roomBio.trim() || !user) return;
    try {
      await createRoom({
        name: roomName.trim(),
        bio: roomBio.trim(),
        creatorId: user.uid,
      });
      setShowModal(false);
      setRoomName("");
      setRoomBio("");
    } catch (err) {
      console.error("Error creating room:", err);
    }
  }, [roomName, roomBio, user, createRoom]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setRoomName("");
    setRoomBio("");
  }, []);

  return (
    <div className="h-screen text-white flex flex-col">
      <div className="flex-1 h-full">
        {isLoading && rooms.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : hasRooms ? (
          <div className="flex w-full h-full">
            {/* Rooms List */}
            <div className="md:max-w-[20rem] w-full h-full pb-[7rem] md:pb-[4rem] overflow-y-auto">
              <div className="h-[4rem] bg-[#111111] flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 z-10">
                <h1 className="text-3xl font-semibold">Rooms</h1>
                <button
                  className="text-gray-400 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-gray-800"
                  onClick={() => setShowModal(true)}
                  aria-label="Create new room"
                >
                  <FiPlus size={24} />
                </button>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-500/30 text-red-300 p-3 m-4 rounded-lg shadow-sm">
                  {error}
                </div>
              )}

              <div className="divide-y divide-gray-800">
                {rooms.map((room) => (
                  <RoomItem
                    key={room.id}
                    room={room}
                    onClick={() => router.push(`/rooms/${room.id}`)}
                  />
                ))}
              </div>
            </div>

            {/* Chat Section */}
            <div
              className={`${id
                ? "fixed md:sticky z-10 top-0 left-0"
                : "hidden md:flex items-center justify-center"
                } w-full bg-[#111111] md:bg-white/5 h-full`}
            >
              {id ? (
                <>{children}</>
              ) : (
                <p className="text-gray-400">Select a conversation to start talking</p>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full relative">
            <div className="h-[4rem] bg-[#111111] flex items-center justify-between p-4 border-b border-gray-800 w-full absolute top-0 z-10">
              <h1 className="text-3xl font-semibold">Rooms</h1>
              <button
                className="text-gray-400 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-gray-800"
                onClick={() => setShowModal(true)}
                aria-label="Create new room"
              >
                <FiPlus size={24} />
              </button>
            </div>
            <EmptyRooms />
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className={`fixed inset-0 bg-black/40 z-[60] flex ${isMobile ? "items-end" : "items-center"
              } justify-center backdrop-blur-sm`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeModal}
          >
            <motion.div
              className={`bg-black/50 backdrop-blur-sm border border-white/10 w-full max-w-lg ${isMobile ? "rounded-t-3xl h-[40rem]" : "rounded-2xl"
                } p-6 shadow-2xl ring-1 ring-gray-800/50`}
              initial={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
              animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
              exit={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Create New Room</h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800/50 transition-all duration-200"
                  aria-label="Close modal"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="mb-6 flex justify-center">
                <div
                  className="w-24 h-24 rounded-full bg-gray-800 ring-2 ring-gray-700 hover:ring-purple-500 transition-all duration-200 cursor-pointer"
                  style={{
                    backgroundImage: `url(${bgImage.src})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  aria-label="Room image"
                />
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Enter a catchy name"
                    className="bg-white/5 rounded-xl border border-white/10 p-3 w-full focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Room Bio
                  </label>
                  <textarea
                    value={roomBio}
                    onChange={(e) => setRoomBio(e.target.value)}
                    placeholder="Describe your room's vibe"
                    className="bg-white/5 rounded-xl border border-white/10 p-3 w-full h-32 resize-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none placeholder-gray-500"
                  />
                </div>

                <button
                  onClick={handleCreateRoom}
                  disabled={!roomName || !roomBio || isLoading}
                  className="w-full rounded-full bg-purple-600 text-white px-6 py-3 disabled:bg-purple-400 hover:bg-purple-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                >
                  {isLoading ? "Creating..." : "Create Room"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
