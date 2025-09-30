import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useNavigate, Outlet, useParams } from "react-router-dom";
import { FiPlus, FiX, FiCamera } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../store/authStore";
import { useRoomStore } from "../../store/roomStore";
import type { Room } from "../../types";
import emptyRoomImage from "/assets/images/empty-folder.png";
import bgImage from "/assets/images/shh.jpeg";

const EmptyRooms = () => (
  <div className="flex flex-col items-center justify-center h-full">
    <img
      src={emptyRoomImage}
      alt="No rooms found"
      className="w-40 h-40 mb-6 opacity-70"
    />
    <h3 className="text-xl font-medium mb-2">No Rooms Found</h3>
    <p className="text-sm text-center max-w-xs text-gray-300">
      Start by creating your first room to connect and chat with like-minded
      people.
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
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="flex items-center p-4 hover:bg-gray-800/50 cursor-pointer transition-colors duration-200 rounded-lg mx-2 my-1 shadow-sm hover:shadow-md"
    onClick={onClick}
  >
    {/* Avatar */}
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-xl mr-4 bg-cover bg-center shrink-0 ring-1 ring-gray-700"
      style={{ backgroundImage: `url(${bgImage})` }}
    ></div>

    {/* Room Info */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-white font-medium truncate text-xl">{room.name}</h3>
        <span className="text-gray-400 text-md ml-2 shrink-0">
          {room.timestamp && room.timestamp.toDate
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

function Rooms() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomBio, setRoomBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const { id } = useParams();

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

  // Handle window resize to toggle modal/drawer
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateRoom = async () => {
    if (!roomName || !roomBio || !user) return;

    let avatarUrl: string | undefined = undefined;

    // Assuming Firebase Storage integration
    // You need to import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
    // const storage = getStorage();
    // if (avatarFile) {
    //   const storageRef = ref(storage, `room_avatars/${user.uid}/${Date.now()}_${avatarFile.name}`);
    //   await uploadBytes(storageRef, avatarFile);
    //   avatarUrl = await getDownloadURL(storageRef);
    // }

    try {
      await createRoom({
        name: roomName,
        bio: roomBio,
        creatorId: user.uid,
        avatar: avatarUrl, // Pass avatar if uploaded
      });

      // Reset form and close modal
      setShowModal(false);
      setRoomName("");
      setRoomBio("");
      setAvatarPreview(null);
      setAvatarFile(null);
    } catch (error) {
      console.error("Error creating room:", error);
      // Error is already handled in the store
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setRoomName("");
    setRoomBio("");
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  return (
    <div className="h-screen text-white flex flex-col">
      {/* Fixed Header */}
      <div className="h-[4rem] bg-[#111111] flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 z-10">
        <div className="flex items-center">
          <h1 className="text-3xl font-semibold">Rooms</h1>
        </div>
        <button
          className="text-gray-400 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-gray-800"
          onClick={() => setShowModal(true)}
        >
          <FiPlus size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto h-full">
        {isLoading && rooms.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : hasRooms ? (
          <div className="flex w-full h-full">
            {/* Rooms list */}
            <div className="md:max-w-[20rem] w-full">
              {/* Error Display */}
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
                    onClick={() => navigate(`/rooms/${room.id}`)}
                  />
                ))}
              </div>
            </div>

            {/* Message Box */}
            <div
              className={`${
                id
                  ? "fixed md:static z-10 top-0 left-0"
                  : "hidden md:flex items-center justify-center"
              } w-full bg-[#111111] md:bg-white/5 h-full`}
            >
              {id ? <Outlet /> : <p>Select a conversation to start talking</p>}
            </div>
          </div>
        ) : (
          <EmptyRooms />
        )}
      </div>

      {/* Create Room Popup (Modal on Desktop/Tablet, Draggable Drawer on Mobile) */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className={`fixed inset-0 bg-black/40  z-[60] flex ${
              isMobile ? "items-end" : "items-center"
            } justify-center backdrop-blur-sm`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeModal}
          >
            <motion.div
              className={`bg-black/50 backdrop-blur-sm border border-white/10 hover:border-white/20 hover:bg-black/10 transition-all duration-500 overflow-hidden w-full max-w-lg ${
                isMobile ? "rounded-t-3xl h-[40rem]" : "rounded-2xl"
              } p-6 shadow-2xl ring-1 ring-gray-800/50 ${
                isMobile ? "touch-pan-y" : ""
              }`}
              initial={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
              animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
              exit={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              drag={isMobile ? "y" : false}
              dragConstraints={{ top: 50, bottom: 500 }}
              dragElastic={0.2}
              onDragEnd={(_event, info) => {
                if (isMobile && info.offset.y > 200) {
                  closeModal();
                }
              }}
            >
              {/* Background gradient */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 opacity-3 blur-xl -z-10`}
                animate={{
                  scale: [1, 1.02, 1],
                  opacity: [0.03, 0.05, 0.03],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
              />

              {isMobile && (
                <div className="w-16 h-1 bg-gray-600 rounded-full mx-auto mb-6 opacity-80"></div>
              )}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Create New Room
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800/50 transition-all duration-200 disabled:opacity-50"
                  disabled={isLoading}
                >
                  <FiX size={24} />
                </button>
              </div>
              {/* Avatar Upload */}
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <div
                    className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden ring-2 ring-gray-700 hover:ring-purple-500 transition-all duration-200 cursor-pointer group"
                    style={{
                      backgroundImage: `url(${avatarPreview || bgImage})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  ></div>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter a catchy name"
                  className="bg-white/5 rounded-xl border border-white/10 group-hover:bg-white/10 transition-colors p-3 w-full focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all duration-200 disabled:opacity-50 placeholder-gray-500"
                  disabled={isLoading}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Room Bio
                </label>
                <textarea
                  value={roomBio}
                  onChange={(e) => setRoomBio(e.target.value)}
                  placeholder="Describe your room's vibe"
                  className="bg-white/5 rounded-xl border border-white/10 group-hover:bg-white/10 transition-colors p-3 w-full h-32 resize-none border border-gray-700/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all duration-200 disabled:opacity-50 placeholder-gray-500"
                  disabled={isLoading}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleCreateRoom}
                  disabled={!roomName || !roomBio || isLoading}
                  className="w-full rounded-full bg-purple-600 text-white px-6 py-3 disabled:bg-purple-400 disabled:cursor-not-allowed hover:bg-purple-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
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

export default Rooms;
