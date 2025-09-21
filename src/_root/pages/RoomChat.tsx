import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../../lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import type { Room, Message } from "../../types";
import InputBox from "../../components/InputBox";
import MessageBubble from "../../components/MessageBubble";
import ThreadReplyModal from "../../components/ThreadReplyModal";
import { useUserStore, useUsername } from "../../store/userStore"; // Import userStore
import { IoIosArrowBack } from "react-icons/io";
import { FaEllipsisV } from "react-icons/fa";
import { FaChevronDown } from "react-icons/fa";

// Message grouping utility functions
interface GroupedMessage extends Message {
  isFirstInTimeGroup: boolean;
  isLastInTimeGroup: boolean;
}

function groupMessagesByTime(messages: Message[]): GroupedMessage[] {
  if (!messages.length) return [];

  const groupedMessages: GroupedMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const currentMessage = messages[i];
    const previousMessage = messages[i - 1];
    const nextMessage = messages[i + 1];

    const isFirstInTimeGroup =
      !previousMessage ||
      !areMessagesInSameTimeGroup(previousMessage, currentMessage);

    const isLastInTimeGroup =
      !nextMessage || !areMessagesInSameTimeGroup(currentMessage, nextMessage);

    groupedMessages.push({
      ...currentMessage,
      isFirstInTimeGroup,
      isLastInTimeGroup,
    });
  }

  return groupedMessages;
}

function areMessagesInSameTimeGroup(
  message1: Message,
  message2: Message
): boolean {
  if (!message1.timestamp || !message2.timestamp) return false;
  if (message1.userId !== message2.userId) return false;
  if (message1.messageType !== message2.messageType) return false;
  if (message1.messageType === "thread" || message2.messageType === "thread") {
    return false;
  }

  const date1 = message1.timestamp.toDate();
  const date2 = message2.timestamp.toDate();

  const timeDifference = Math.abs(date2.getTime() - date1.getTime());
  const oneMinute = 60 * 1000;

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate() &&
    date1.getHours() === date2.getHours() &&
    date1.getMinutes() === date2.getMinutes() &&
    timeDifference < oneMinute
  );
}

function RoomChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const username = useUsername(); // Get username from store
  const { fetchUser, subscribeToUser } = useUserStore(); // Get userStore actions
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [threadModalOpen, setThreadModalOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showJoinScreen, setShowJoinScreen] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement }>({});

  const groupedMessages = useMemo(() => {
    return groupMessagesByTime(messages);
  }, [messages]);

  // Initialize user data when component mounts
  useEffect(() => {
    const user = auth.currentUser;
    if (user && !username) {
      // If we have auth user but no username, fetch user data
      fetchUser(user.uid);
    }

    if (user) {
      // Subscribe to real-time user updates
      const unsubscribe = subscribeToUser(user.uid);
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [username, fetchUser, subscribeToUser]);

  useEffect(() => {
    if (!id) return;

    const roomUnsub = onSnapshot(doc(db, "rooms", id), (docSnap) => {
      if (docSnap.exists()) {
        const roomData = { id: docSnap.id, ...docSnap.data() } as Room;
        setRoom(roomData);
        const userId = auth.currentUser?.uid;
        if (userId && roomData.members && !roomData.members.includes(userId)) {
          setShowJoinScreen(true);
        }
      } else {
        navigate("/rooms");
      }
    });

    const messagesQuery = query(
      collection(db, `rooms/${id}/messages`),
      orderBy("timestamp", "asc")
    );
    const messagesUnsub = onSnapshot(messagesQuery, (snap) => {
      const newMessages = snap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Message)
      );
      setMessages(newMessages);
    });

    return () => {
      roomUnsub();
      messagesUnsub();
    };
  }, [id, navigate]);

  useEffect(() => {
    if (isAtBottom && messagesContainerRef.current) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setIsAtBottom(isNearBottom);
    }
  };

  const sendMessage = async (
    text: string,
    messageType: "message" | "thread" = "message"
  ) => {
    if (!text || !id) return;
    const user = auth.currentUser;
    if (!user) {
      navigate("/auth/signin");
      return;
    }

    setIsSending(true);
    try {
      await addDoc(collection(db, `rooms/${id}/messages`), {
        text,
        userId: user.uid,
        timestamp: serverTimestamp(),
        messageType,
        replyTo: replyTo ? replyTo.id : null,
      });

      // Use actual username or fallback to "~anon" if not loaded yet
      const displayUsername = username || "~anon";

      const lastMessageText =
        messageType === "thread"
          ? `${displayUsername} started a thread: ${text.slice(0, 20)}${
              text.length > 20 ? "..." : ""
            }`
          : replyTo
          ? `${displayUsername} replied: ${text.slice(0, 20)}${
              text.length > 20 ? "..." : ""
            }`
          : `${displayUsername}: ${text.slice(0, 20)}${
              text.length > 20 ? "..." : ""
            }`;

      await updateDoc(doc(db, "rooms", id), {
        lastMessage: lastMessageText,
        timestamp: serverTimestamp(),
      });

      setReplyTo(null);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
  };

  const handleThreadReply = (message: Message) => {
    setSelectedThread(message);
    setThreadModalOpen(true);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, `rooms/${id}/messages`, messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const scrollToMessage = (messageId: string) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement && messagesContainerRef.current) {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3000);
    }
  };

  const handleDeleteGroup = async () => {
    if (!id || !room || !auth.currentUser) return;
    if (room.creatorId !== auth.currentUser.uid) return;

    try {
      await deleteDoc(doc(db, "rooms", id));
      navigate("/rooms", { replace: true });
    } catch (error) {
      console.error("Error deleting group:", error);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteGroupClick = () => {
    setBottomSheetOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleShareGroupLink = () => {
    const currentUrl = window.location.href;

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(currentUrl)
        .then(() => {
          alert(`Group link copied to clipboard!\n\n${currentUrl}`);
        })
        .catch(() => {
          alert(`Group link:\n\n${currentUrl}`);
        });
    } else {
      alert(`Group link:\n\n${currentUrl}`);
    }
  };

  const handleJoinGroup = async () => {
    if (!id || !room || !auth.currentUser) return;
    const userId = auth.currentUser.uid;

    try {
      const newMembers = [...(room.members || []), userId];
      await updateDoc(doc(db, "rooms", id), {
        members: newMembers,
        timestamp: serverTimestamp(),
      });
      setShowJoinScreen(false); // Hide join screen
      // No immediate navigation here; let useEffect handle the route
    } catch (error) {
      console.error("Error joining group:", error);
    }
  };

  const handleCancelJoin = () => {
    navigate("/", { replace: true });
  };

  if (!room) {
    return (
      <div className="bg-[#111111] min-h-screen text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  const threadCount = messages.filter(
    (msg) => msg.messageType === "thread"
  ).length;
  const memberCount = room.members?.length || 0;

  // Use actual username or fallback for placeholder
  const displayUsername = username || "~anon";

  return (
    <div className="bg-[#111111] h-screen text-white flex flex-col overflow-hidden relative">
      {/* JOIN GROUP SCREEN */}
      {showJoinScreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-[#111111] z-50 flex flex-col items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="bg-[#1c1c1c] rounded-2xl border border-gray-700 p-6 w-full max-w-md text-center"
          >
            <div
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-cover bg-center flex items-center justify-center text-white font-semibold text-2xl"
              style={{
                backgroundImage: room.avatar.startsWith("http")
                  ? `url(${room.avatar})`
                  : "none",
              }}
            >
              {!room.avatar.startsWith("http") && room.avatar}
            </div>
            <h2 className="text-2xl font-semibold mb-2">{room.name}</h2>
            <p className="text-gray-400 mb-6">{room.bio}</p>
            <div className="flex gap-3">
              <motion.button
                onClick={handleCancelJoin}
                className="flex-1 py-3 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleJoinGroup}
                className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Join
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* LOCKED HEADER - Fixed Position */}
      {!showJoinScreen && (
        <div className="fixed top-0 left-0 right-0 flex items-center p-4 border-b border-gray-800 z-50 backdrop-blur-md bg-[#111111]/95">
          <button
            onClick={() => navigate("/rooms")}
            className="text-gray-400 hover:text-white mr-4 transition-colors duration-200 px-2 bg-[#373737] py-2 rounded-full"
          >
            <IoIosArrowBack className="text-lg" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{room.name}</h1>
            <p className="text-sm text-gray-400">
              {memberCount} {memberCount === 1 ? "member" : "members"}
              {threadCount > 0 && (
                <>
                  {" • "}
                  <span className="text-purple-400">
                    {threadCount} {threadCount === 1 ? "thread" : "threads"}
                  </span>
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => setBottomSheetOpen(true)}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <FaEllipsisV className="text-xl" />
          </button>
        </div>
      )}

      {/* MESSAGES CONTAINER - Adjusted for fixed header */}
      {!showJoinScreen && (
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden messages-container pt-20"
          style={{
            paddingTop: "5rem", // Space for fixed header (80px)
            paddingBottom: "6rem", // Space for fixed input box (96px)
          }}
        >
          <div className="p-4 min-h-full">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>No messages yet. Start the conversation!</p>
                <p className="text-xs mt-2 text-gray-500">
                  Tip: Use "/thread your message" to create a thread
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {groupedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    ref={(el) => {
                      if (el) messageRefs.current[msg.id] = el;
                    }}
                  >
                    <MessageBubble
                      message={msg}
                      isCurrentUser={msg.userId === auth.currentUser?.uid}
                      onReply={
                        msg.messageType === "message" ? handleReply : undefined
                      }
                      onThreadReply={
                        msg.messageType === "thread"
                          ? handleThreadReply
                          : undefined
                      }
                      onDelete={handleDeleteMessage}
                      showTimestamp={true}
                      isFirstInTimeGroup={msg.isFirstInTimeGroup}
                      isLastInTimeGroup={msg.isLastInTimeGroup}
                      allMessages={messages}
                      onScrollToMessage={scrollToMessage}
                      isHighlighted={highlightedMessageId === msg.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SCROLL TO BOTTOM BUTTON - Adjusted position */}
          {!isAtBottom && messages.length > 0 && (
            <button
              onClick={scrollToBottom}
              className="fixed bottom-32 right-6 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg border border-gray-600 transition-all duration-200 z-40"
            >
              <FaChevronDown className="text-lg" />
            </button>
          )}
        </div>
      )}

      {/* INPUT BOX - Already fixed at bottom */}
      {!showJoinScreen && (
        <InputBox
          onSend={sendMessage}
          placeholder={
            replyTo
              ? `Reply to ${displayUsername}${
                  replyTo.messageType === "thread" ? " (Thread)" : ""
                }...`
              : "Say Something..."
          }
          disabled={isSending}
          replyTo={replyTo}
          onCancelReply={cancelReply}
        />
      )}

      {/* THREAD MODAL */}
      {!showJoinScreen && selectedThread && (
        <ThreadReplyModal
          isOpen={threadModalOpen}
          onClose={() => {
            setThreadModalOpen(false);
            setSelectedThread(null);
          }}
          thread={selectedThread}
          roomId={id!}
        />
      )}

      {/* ANIMATED BOTTOM SHEET */}
      {!showJoinScreen && (
        <AnimatePresence>
          {bottomSheetOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
              onClick={() => setBottomSheetOpen(false)}
            >
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{
                  type: "spring",
                  damping: 25,
                  stiffness: 200,
                  duration: 0.4,
                }}
                className="bg-[#121212] w-full rounded-t-4xl border-t-2 border-gray-800 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <h2 className="text-2xl font-semibold mb-4 text-center border-b border-gray-700 pb-2">
                    {room.name}
                  </h2>

                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    onClick={handleShareGroupLink}
                    className="w-full text-left text-white py-3 px-3 hover:bg-[#151515] rounded-xl transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Share Group Link
                  </motion.button>

                  {room.creatorId === auth.currentUser?.uid && (
                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                      onClick={handleDeleteGroupClick}
                      className="w-full text-left text-red-400 py-3 px-3 hover:bg-[#151515] rounded-xl transition-colors mt-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Delete Group
                    </motion.button>
                  )}

                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                    onClick={() => setBottomSheetOpen(false)}
                    className="w-full text-gray-300 py-3 hover:bg-[#151515] rounded transition-colors mt-4"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {!showJoinScreen && (
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{
                  type: "spring",
                  damping: 25,
                  stiffness: 200,
                  duration: 0.4,
                }}
                className="bg-[#1c1c1c] rounded-2xl border border-gray-700 p-6 max-w-sm w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="text-center"
                >
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Delete Group
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Are you sure you want to delete "{room.name}"? This action
                    cannot be undone.
                  </p>

                  <div className="flex gap-3">
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15, duration: 0.3 }}
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-3 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>

                    <motion.button
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                      onClick={handleDeleteGroup}
                      className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Delete
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* CUSTOM SCROLLBAR STYLES */}
      <style>{`
        .messages-container::-webkit-scrollbar {
          width: 6px;
        }
        .messages-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .messages-container::-webkit-scrollbar-thumb {
          background-color: #374151;
          border-radius: 3px;
        }
        .messages-container::-webkit-scrollbar-thumb:hover {
          background-color: #4b5563;
        }
      `}</style>
    </div>
  );
}

export default RoomChat;
