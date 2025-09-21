import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { HiX, HiPaperAirplane } from "react-icons/hi";
import { auth, db } from "../lib/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import type { Message, ThreadReply } from "../types";
import MessageBubble from "./MessageBubble";

interface ThreadReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: Message;
  roomId: string;
}

function ThreadReplyModal({
  isOpen,
  onClose,
  thread,
  roomId,
}: ThreadReplyModalProps) {
  const [text, setText] = useState("");
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Fetch thread replies
  useEffect(() => {
    if (!isOpen || !thread.id) return;

    const repliesQuery = query(
      collection(db, `rooms/${roomId}/threads/${thread.id}/replies`),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(repliesQuery, (snap) => {
      const newReplies = snap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as ThreadReply)
      );
      setReplies(newReplies);
    });

    return () => unsubscribe();
  }, [isOpen, thread.id, roomId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [replies]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 120;
      textareaRef.current.style.height = `${Math.min(
        scrollHeight,
        maxHeight
      )}px`;
    }
  }, [text]);

  const handleSend = async () => {
    if (!text.trim() || isSending || !auth.currentUser) return;

    setIsSending(true);
    try {
      await addDoc(
        collection(db, `rooms/${roomId}/threads/${thread.id}/replies`),
        {
          text: text.trim(),
          userId: auth.currentUser.uid,
          timestamp: serverTimestamp(),
          threadId: thread.id,
        }
      );
      setText("");
    } catch (error) {
      console.error("Error sending thread reply:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-lg z-50"
          onClick={onClose}
        />
      )}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: isOpen ? "10%" : "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-[#1b1b1b] rounded-t-2xl z-50 max-h-[90vh] flex flex-col"
      >
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Thread</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
            >
              <HiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0"
        >
          <MessageBubble
            message={thread}
            isCurrentUser={thread.userId === auth.currentUser?.uid}
            showTimestamp={true}
            isFirstInTimeGroup={true}
            isLastInTimeGroup={true}
          />
          {replies.map((reply) => (
            <MessageBubble
              key={reply.id}
              message={{
                ...reply,
                messageType: "message",
                replyTo: thread.id,
              }}
              isCurrentUser={reply.userId === auth.currentUser?.uid}
              showTimestamp={true}
              isFirstInTimeGroup={true}
              isLastInTimeGroup={true}
            />
          ))}
          <div className="h-24 flex-shrink-0" />
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-[#1b1b1b] border-t border-gray-700 p-4 z-50 mb-16">
          <div className="max-w-screen-xl mx-auto">
            <div className="flex items-end bg-[#2d2d2d] rounded-2xl p-2">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Reply to thread..."
                disabled={isSending}
                rows={1}
                className="flex-1 bg-transparent text-white py-2 px-3 resize-none focus:outline-none placeholder-gray-400 min-h-[24px] max-h-[120px] overflow-y-auto"
                maxLength={500}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || isSending}
                className={`p-2 rounded-full mr-2 flex items-center justify-center ${
                  text.trim() && !isSending
                    ? "text-blue-500 hover:text-blue-400 transform hover:scale-105 active:scale-95"
                    : "text-gray-500 cursor-not-allowed"
                }`}
              >
                <HiPaperAirplane className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <style>{`
          .backdrop-blur-lg {
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }
          textarea::-webkit-scrollbar {
            width: 4px;
          }
          textarea::-webkit-scrollbar-track {
            background: transparent;
          }
          textarea::-webkit-scrollbar-thumb {
            background-color: #374151;
            border-radius: 2px;
          }
          textarea::-webkit-scrollbar-thumb:hover {
            background-color: #4b5563;
          }
        `}</style>
      </motion.div>
    </>
  );
}

export default ThreadReplyModal;
