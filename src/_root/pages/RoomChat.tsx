import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { IoIosArrowBack } from "react-icons/io";
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
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [threadModalOpen, setThreadModalOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement }>({});

  const groupedMessages = useMemo(() => {
    return groupMessagesByTime(messages);
  }, [messages]);

  useEffect(() => {
    if (!id) return;

    const roomUnsub = onSnapshot(doc(db, "rooms", id), (docSnap) => {
      if (docSnap.exists()) {
        setRoom({ id: docSnap.id, ...docSnap.data() } as Room);
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

      const lastMessageText =
        messageType === "thread"
          ? `~anon started a thread: ${text.slice(0, 20)}${
              text.length > 20 ? "..." : ""
            }`
          : replyTo
          ? `~anon replied: ${text.slice(0, 20)}${
              text.length > 20 ? "..." : ""
            }`
          : `~anon: ${text.slice(0, 20)}${text.length > 20 ? "..." : ""}`;

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

  if (!room) {
    return (
      <div className="bg-black min-h-screen text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  const threadCount = messages.filter(
    (msg) => msg.messageType === "thread"
  ).length;
  const memberCount = room.members?.length || 0;

  return (
    <div className="bg-[#111111] h-screen text-white flex flex-col overflow-hidden relative">
      {/* LOCKED HEADER - Fixed Position */}
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
      </div>

      {/* MESSAGES CONTAINER - Adjusted for fixed header */}
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

      {/* INPUT BOX - Already fixed at bottom */}
      <InputBox
        onSend={sendMessage}
        placeholder={
          replyTo
            ? `Reply to ~anon${
                replyTo.messageType === "thread" ? " (Thread)" : ""
              }...`
            : "Say Something..."
        }
        disabled={isSending}
        replyTo={replyTo}
        onCancelReply={cancelReply}
      />

      {/* THREAD MODAL */}
      {selectedThread && (
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
