import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../store/authStore";
import { useRoomStore } from "../../store/roomStore";
import type { Room } from "../../types";
import emptyRoomImage from "/assets/images/empty-folder.png";
import bgImage from "/assets/images/shh.jpeg";

const EmptyRooms = () => (
  <div className="flex flex-col items-center justify-center h-full mt-20">
    <img
      src={emptyRoomImage}
      alt="No rooms found"
      className="w-50 h-50 mb-6 opacity-70"
    />
    <h3 className="text-xl font-medium mb-2">No rooms Found</h3>
    <p className="text-sm text-center max-w-xs">
      Create your first room to start chatting with others
    </p>
  </div>
);

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

const RoomItem = ({ room, onClick }: { room: Room; onClick: () => void }) => (
  <div
    className="flex items-center p-4 hover:bg-gray-800 cursor-pointer transition-colors duration-150"
    onClick={onClick}
  >
    {/* Avatar */}
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-xl mr-3 bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* {room.avatar} */}
    </div>

    {/* Room Info */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-white font-medium truncate text-xl">{room.name}</h3>
        <span className="text-gray-400 text-md">
          {room.timestamp && room.timestamp.toDate
            ? timeAgo(room.timestamp.toDate())
            : "Just now"}
        </span>
      </div>
      <p className="text-gray-400 text-sm truncate">
        {room.lastMessage || "No messages yet"}
      </p>
    </div>
  </div>
);

function Rooms() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomBio, setRoomBio] = useState("");

  // Store hooks
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

  const hasRooms = rooms.length > 0;

  useEffect(() => {
    if (!user) {
      navigate("/auth/signin");
      return;
    }

    // Subscribe to rooms when component mounts and user is available
    subscribeToRooms(user.uid);

    // Cleanup subscription when component unmounts or user changes
    return () => {
      unsubscribeFromRooms();
    };
  }, [user, navigate, subscribeToRooms, unsubscribeFromRooms]);

  // Clear rooms when user logs out
  useEffect(() => {
    if (!user) {
      clearRooms();
    }
  }, [user, clearRooms]);

  const handleCreateRoom = async () => {
    if (!roomName || !roomBio || !user) return;

    try {
      await createRoom({
        name: roomName,
        bio: roomBio,
        creatorId: user.uid,
      });

      // Reset form and close modal
      setShowModal(false);
      setRoomName("");
      setRoomBio("");
    } catch (error) {
      console.error("Error creating room:", error);
      // Error is already handled in the store
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setRoomName("");
    setRoomBio("");
  };

  return (
    <div className="bg-[#111111] min-h-screen text-white">
      {/* Header */}
      <div className="bg-[#111111] flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center">
          <h1 className="text-3xl font-semibold">Rooms</h1>
        </div>
        <button
          className="text-gray-400 hover:text-white transition-colors"
          onClick={() => setShowModal(true)}
        >
          <FiPlus size={24} />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-300 p-3 m-4 rounded">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1">
        {isLoading && rooms.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : hasRooms ? (
          <div className="divide-y divide-gray-800">
            {rooms.map((room) => (
              <RoomItem
                key={room.id}
                room={room}
                onClick={() => navigate(`/rooms/${room.id}`)}
              />
            ))}
          </div>
        ) : (
          <EmptyRooms />
        )}
      </div>

      {/* Create Room Bottom Popup */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeModal}
          >
            <motion.div
              className="bg-[#121212] w-full max-w-md rounded-t-4xl p-6"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4">Create New Room</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Choose a name that embodies your community's spirit!
                </p>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Room name"
                  className="bg-gray-900 text-white p-2 rounded w-full"
                  disabled={isLoading}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Bio
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Share the magic of your community! Describe its purpose and
                  what makes it a welcoming, engaging space for its members.
                </p>
                <textarea
                  value={roomBio}
                  onChange={(e) => setRoomBio(e.target.value)}
                  placeholder="Room bio"
                  className="bg-gray-900 text-white p-2 rounded w-full h-24 resize-none"
                  disabled={isLoading}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white mr-4"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={!roomName || !roomBio || isLoading}
                  className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating..." : "Create"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Rooms;
