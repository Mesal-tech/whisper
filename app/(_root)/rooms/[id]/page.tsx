"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase";
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
  getDoc,
} from "firebase/firestore";
import type { Room, Message } from "@/types";
import InputBox from "@/components/InputBox";
import MessageBubble from "@/components/MessageBubble";
import ThreadReplyModal from "@/components/ThreadReplyModal";
import { useUserStore, useUsername } from "@/store/userStore";
import { IoIosArrowBack } from "react-icons/io";
import { FiX } from "react-icons/fi";
import { FaEllipsisV, FaChevronDown } from "react-icons/fa";

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

function RoomChatPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const username = useUsername();
  const { fetchUser, subscribeToUser } = useUserStore();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [threadModalOpen, setThreadModalOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showJoinScreen, setShowJoinScreen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement }>({});

  const groupedMessages = useMemo(() => {
    return groupMessagesByTime(messages);
  }, [messages]);

  // Handle window resize to toggle modal/drawer
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (user && !username) {
      fetchUser(user.uid);
    }

    if (user) {
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
        router.push("/rooms");
      }
    });

    const messagesQuery = query(
      collection(db, `rooms/${id}/messages`),
      orderBy("timestamp", "asc")
    );
    const messagesUnsub = onSnapshot(messagesQuery, (snap) => {
      const newMessages = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          userName: userNames[data.userId] || "Anonymous",
        } as Message;
      });
      setMessages(newMessages);
    });

    return () => {
      roomUnsub();
      messagesUnsub();
    };
  }, [id, router, userNames]);

  useEffect(() => {
    if (!room) return;

    const fetchUserNames = async () => {
      const names: Record<string, string> = {};
      for (const userId of room.members || []) {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data() as { userName: string };
          names[userId] = userData.userName;
        }
      }
      setUserNames(names);
    };

    fetchUserNames();
  }, [room]);

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
      router.push("/auth/signin");
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

      const displayUsername = username || "Anonymous";

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
      router.push("/rooms");
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
          console.log(`Group link copied to clipboard!\n\n${currentUrl}`);
        })
        .catch(() => {
          console.log(`Group link:\n\n${currentUrl}`);
        });
    } else {
      console.log(`Group link:\n\n${currentUrl}`);
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
      setShowJoinScreen(false);
    } catch (error) {
      console.error("Error joining group:", error);
    }
  };

  const handleCancelJoin = () => {
    router.push("/");
  };

  const roomUrl = window.location.href;

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

  return (
    <div className="h-screen text-white flex flex-col overflow-hidden relative bg-[#0a0a0a]">
      {/* JOIN GROUP SCREEN */}
      <AnimatePresence>
        {showJoinScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-white/5 z-50 flex flex-col items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-[#1a1a1a] rounded-2xl border border-gray-700/50 shadow-2xl p-8 w-full max-w-md text-center ring-1 ring-gray-800/30"
            >
              <div className="relative mx-auto mb-6">
                <div
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden ring-2 ring-gray-600/50 shadow-lg mx-auto"
                  style={{
                    backgroundImage:
                      room.avatar && room.avatar.startsWith("http")
                        ? `url(${room.avatar})`
                        : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {!room.avatar ||
                    (!room.avatar.startsWith("http") && (
                      <span className="text-2xl font-bold text-gray-400">
                        {room.name.charAt(0).toUpperCase()}
                      </span>
                    ))}
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-3 text-white">
                {room.name}
              </h2>
              <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                {room.bio}
              </p>
              <div className="flex gap-4">
                <motion.button
                  onClick={handleCancelJoin}
                  className="flex-1 py-4 px-6 bg-gray-800/50 text-white rounded-xl hover:bg-gray-700/50 transition-all duration-200 border border-gray-600/50 backdrop-blur-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleJoinGroup}
                  className="flex-1 py-4 px-6 bg-purple-600/80 text-white rounded-xl hover:bg-purple-700/80 transition-all duration-200 shadow-lg hover:shadow-purple-500/20 border border-purple-500/30 backdrop-blur-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Join Room
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOCKED HEADER */}
      {!showJoinScreen && (
        <>
          <div className="h-16 sticky top-0 left-0 right-0 flex items-center px-4 border-b border-gray-800/50 z-50 backdrop-blur-md bg-[#111111]/90 shadow-sm">
            <motion.button
              onClick={() => router.push("/rooms")}
              className="p-2 rounded-full hover:bg-gray-800/50 transition-all duration-200 mr-3"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <IoIosArrowBack className="text-xl text-gray-300" />
            </motion.button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate text-white">
                {room.name}
              </h1>
              <p className="text-xs text-gray-400 flex items-center">
                <span>
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </span>
                {threadCount > 0 && (
                  <>
                    {" • "}
                    <span className="text-purple-400 ml-1">
                      {threadCount} {threadCount === 1 ? "thread" : "threads"}
                    </span>
                  </>
                )}
              </p>
            </div>
            <motion.button
              onClick={() => setBottomSheetOpen(true)}
              className="p-2 rounded-full hover:bg-gray-800/50 transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaEllipsisV className="text-xl text-gray-300" />
            </motion.button>
          </div>
        </>
      )}

      {/* MESSAGES CONTAINER */}
      {!showJoinScreen && (
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="messages-container flex-1 overflow-y-auto overflow-x-hidden pb-24 bg-[#0a0a0a]"
        >
          <div className="p-4 min-h-full">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12">
                <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">💬</span>
                </div>
                <p className="text-lg mb-2">No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
                <p className="text-xs mt-4 text-gray-500 bg-gray-800/30 px-3 py-1 rounded-full">
                  Tip: Use "/thread your message" to create a thread
                </p>
              </div>
            ) : (
              <div className="space-y-2">
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

          {/* SCROLL TO BOTTOM BUTTON */}
          {!isAtBottom && messages.length > 0 && (
            <motion.button
              onClick={scrollToBottom}
              className="fixed bottom-28 right-6 bg-black/50 hover:bg-gray-700/90 text-white p-4 rounded-full shadow-xl border border-gray-600/50 backdrop-blur-md transition-all duration-200 z-40"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaChevronDown className="text-xl" />
            </motion.button>
          )}
        </div>
      )}

      {/* INPUT BOX */}
      {!showJoinScreen && (
        <div className="absolute bottom-0 left-0 right-0 z-40">
          <InputBox
            onSend={sendMessage}
            placeholder={
              replyTo
                ? `Reply to ${replyTo.userName || "Anonymous"}${
                    replyTo.messageType === "thread" ? " (Thread)" : ""
                  }...`
                : "Say Something..."
            }
            disabled={isSending}
            replyTo={replyTo}
            onCancelReply={cancelReply}
          />
        </div>
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

      {/* ANIMATED BOTTOM SHEET (Modal on Desktop/Tablet, Drawer on Mobile) */}
      <AnimatePresence>
        {bottomSheetOpen && !showJoinScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`fixed inset-0 bg-black bg-opacity-60 z-[60] flex ${
              isMobile ? "items-end" : "items-center"
            } justify-center backdrop-blur-sm`}
            onClick={() => setBottomSheetOpen(false)}
          >
            <motion.div
              className={`bg-[#0f0f0f] w-full max-w-lg ${
                isMobile ? "rounded-t-3xl" : "rounded-2xl"
              } p-6 shadow-2xl ring-1 ring-gray-800/50 ${
                isMobile ? "touch-pan-y" : ""
              }`}
              initial={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
              animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
              exit={isMobile ? { y: "100%" } : { scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              drag={isMobile ? "y" : false}
              dragConstraints={{ top: 0, bottom: 500 }}
              dragElastic={0.2}
              onDragEnd={(_event, info) => {
                if (isMobile && info.offset.y > 200) {
                  setBottomSheetOpen(false);
                }
              }}
            >
              {isMobile && (
                <div className="w-16 h-1 bg-gray-600 rounded-full mx-auto mb-6 opacity-80"></div>
              )}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Room Options</h2>
                <button
                  onClick={() => setBottomSheetOpen(false)}
                  className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800/50 transition-all duration-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              <div className="mb-6">
                <motion.button
                  onClick={handleShareGroupLink}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="w-full text-left text-white py-4 px-4 hover:bg-gray-900/50 rounded-2xl transition-all duration-200 flex items-center"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="mr-3 text-purple-400">🔗</span>
                  Share Room Link
                </motion.button>
              </div>
              {room.creatorId === auth.currentUser?.uid && (
                <div className="mb-6">
                  <motion.button
                    onClick={handleDeleteGroupClick}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="w-full text-left text-red-400 py-4 px-4 hover:bg-red-900/20 rounded-2xl transition-all duration-200 flex items-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="mr-3">🗑️</span>
                    Delete Room
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteConfirm && !showJoinScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 200,
                duration: 0.4,
              }}
              className="bg-[#1a1a1a] rounded-2xl border border-gray-700/50 shadow-2xl p-6 max-w-sm w-full ring-1 ring-gray-800/30"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="text-center"
              >
                <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Delete Room
                </h3>
                <p className="text-gray-400 mb-6 text-sm">
                  Are you sure you want to delete "{room.name}"? This action
                  cannot be undone.
                </p>

                <div className="flex gap-3">
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 px-4 bg-gray-800/50 text-white rounded-xl hover:bg-gray-700/50 transition-all duration-200 border border-gray-600/50"
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
                    className="flex-1 py-3 px-4 bg-red-600/80 text-white rounded-xl hover:bg-red-700/80 transition-all duration-200 shadow-lg hover:shadow-red-500/20 border border-red-500/30"
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
    </div>
  );
}

export default RoomChatPage;