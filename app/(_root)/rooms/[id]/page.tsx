"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
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
import Head from "next/head";

// ---------------------------
// Message grouping utilities
// ---------------------------
interface GroupedMessage extends Message {
  isFirstInTimeGroup: boolean;
  isLastInTimeGroup: boolean;
}

function groupMessagesByTime(messages: Message[]): GroupedMessage[] {
  if (!messages.length) return [];
  const groupedMessages: GroupedMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const current = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];

    const isFirstInTimeGroup =
      !prev || !areMessagesInSameTimeGroup(prev, current);
    const isLastInTimeGroup =
      !next || !areMessagesInSameTimeGroup(current, next);

    groupedMessages.push({
      ...current,
      isFirstInTimeGroup,
      isLastInTimeGroup,
    });
  }

  return groupedMessages;
}

function areMessagesInSameTimeGroup(m1: Message, m2: Message) {
  if (!m1.timestamp || !m2.timestamp) return false;
  if (m1.userId !== m2.userId) return false;
  if (m1.messageType !== m2.messageType) return false;
  if (m1.messageType === "thread" || m2.messageType === "thread") return false;

  const d1 = m1.timestamp.toDate();
  const d2 = m2.timestamp.toDate();
  const diff = Math.abs(d2.getTime() - d1.getTime());
  const oneMinute = 60 * 1000;

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate() &&
    d1.getHours() === d2.getHours() &&
    d1.getMinutes() === d2.getMinutes() &&
    diff < oneMinute
  );
}

export default function RoomChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

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
  const [isMobile, setIsMobile] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement }>({});

  const groupedMessages = useMemo(
    () => groupMessagesByTime(messages),
    [messages]
  );

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch user if logged in
  useEffect(() => {
    const user = auth.currentUser;
    if (user && !username) fetchUser(user.uid);
    if (user) {
      const unsub = subscribeToUser(user.uid);
      return () => unsub?.();
    }
  }, [username, fetchUser, subscribeToUser]);

  // Subscribe to room + messages
  useEffect(() => {
    if (!id) return;
    const roomUnsub = onSnapshot(doc(db, "rooms", id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Room;
        setRoom(data);
        const userId = auth.currentUser?.uid;
        if (userId && data.members && !data.members.includes(userId)) {
          setShowJoinScreen(true);
        }
      } else router.push("/rooms");
    });

    const messagesQuery = query(
      collection(db, `rooms/${id}/messages`),
      orderBy("timestamp", "asc")
    );

    const msgUnsub = onSnapshot(messagesQuery, (snap) => {
      const newMessages = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          userName: userNames[data.userId] || "Anonymous",
        } as Message;
      });
      setMessages(newMessages);
    });

    return () => {
      roomUnsub();
      msgUnsub();
    };
  }, [id, router, userNames]);

  // Fetch user names
  useEffect(() => {
    if (!room) return;
    (async () => {
      const names: Record<string, string> = {};
      for (const uid of room.members || []) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) names[uid] = (userDoc.data() as any).userName;
      }
      setUserNames(names);
    })();
  }, [room]);

  // Scroll control
  const scrollToBottom = () => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  };
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    setIsAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 100);
  };
  useEffect(() => {
    if (isAtBottom) scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string, messageType: "message" | "thread" = "message") => {
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
        replyTo: replyTo?.id || null,
      });

      const displayName = username || "Anonymous";
      const preview = text.slice(0, 20) + (text.length > 20 ? "..." : "");
      const lastMsg =
        messageType === "thread"
          ? `${displayName} started a thread: ${preview}`
          : replyTo
            ? `${displayName} replied: ${preview}`
            : `${displayName}: ${preview}`;

      await updateDoc(doc(db, "rooms", id), {
        lastMessage: lastMsg,
        timestamp: serverTimestamp(),
      });
      setReplyTo(null);
      setTimeout(scrollToBottom, 100);
    } catch (e) {
      console.error("Error sending:", e);
    } finally {
      setIsSending(false);
    }
  };

  if (!room) {
    return (
      <div className="bg-[#111111] min-h-screen text-white flex items-center justify-center">
        <Head>
          <title>Loading Chat Room</title>
          <meta name="description" content="Loading chat room..." />
        </Head>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  const memberCount = room.members?.length || 0;
  const threadCount = messages.filter((m) => m.messageType === "thread").length;

  return (
    <div className="h-screen text-white flex flex-col overflow-hidden relative bg-[#0a0a0a]">
      <Head>
        <title>{room.name} Chat Room</title>
        <meta name="description" content={room.bio || "Join the chat"} />
      </Head>

      {/* HEADER */}
      <div className="h-16 sticky top-0 left-0 right-0 flex items-center px-4 border-b border-gray-800/50 bg-[#111111]/90 backdrop-blur-md">
        <motion.button
          onClick={() => router.push("/rooms")}
          className="p-2 rounded-full hover:bg-gray-800/50 transition mr-3"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <IoIosArrowBack className="text-xl text-gray-300" />
        </motion.button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate text-white">{room.name}</h1>
          <p className="text-xs text-gray-400">
            {memberCount} members •{" "}
            <span className="text-purple-400">{threadCount} threads</span>
          </p>
        </div>
        <motion.button
          onClick={() => setBottomSheetOpen(true)}
          className="p-2 rounded-full hover:bg-gray-800/50 transition"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaEllipsisV className="text-xl text-gray-300" />
        </motion.button>
      </div>

      {/* MESSAGES */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pb-24 bg-[#0a0a0a]"
      >
        <div className="p-4 space-y-2">
          {groupedMessages.map((msg) => (
            <div
              key={msg.id}
              ref={(el) => {
                if (el) {
                  messageRefs.current[msg.id] = el;
                }
              }}
            >
              <MessageBubble
                message={msg}
                isCurrentUser={msg.userId === auth.currentUser?.uid}
                onReply={(message) => sendMessage(message.text, "thread")}
              />
            </div>
          ))}
        </div>

      </div>

      {/* INPUT */}
      <div className="absolute bottom-0 left-0 right-0 z-40">
        <InputBox
          onSend={sendMessage}
          placeholder="Say something..."
          disabled={isSending}
        />
      </div>
    </div>
  );
}