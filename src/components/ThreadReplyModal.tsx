import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const repliesContainerRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom of replies when new messages arrive
  useEffect(() => {
    if (repliesContainerRef.current) {
      repliesContainerRef.current.scrollTop =
        repliesContainerRef.current.scrollHeight;
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-lg z-40"
            onClick={onClose}
          />

          {/* Thread Bubble - Rendered above the modal (clean, no wrapper) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.1 }}
            className="fixed top-30 left-4 right-4 z-50"
          >
            <MessageBubble
              message={thread}
              isCurrentUser={thread.userId === auth.currentUser?.uid}
              showTimestamp={true}
              isFirstInTimeGroup={true}
              isLastInTimeGroup={true}
            />
          </motion.div>

          {/* Reply Modal - Fixed height at bottom */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-[#1b1b1b] rounded-t-2xl z-50 border-t border-gray-700"
            style={{ height: "60vh", minHeight: "400px" }} // Fixed height
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-1 bg-gray-500 rounded-full" />
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Replies Container - Scrollable with calculated max height */}
            <div
              ref={repliesContainerRef}
              className="overflow-y-auto p-4 space-y-2"
              style={{
                maxHeight: "calc(60vh - 80px - 80px)", // Adjust for header (80px) and input (80px) heights
                minHeight: "200px", // Minimum height to ensure scrollable area
              }}
            >
              {replies.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-gray-400">💬</span>
                    </div>
                    <p className="text-gray-400 text-sm">No replies yet</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Be the first to reply to this thread
                    </p>
                  </div>
                </div>
              ) : (
                replies.map((reply) => (
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
                ))
              )}
            </div>

            {/* Input Area - Fixed at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-[#1b1b1b] border-t border-gray-700 p-4">
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
                  className={`p-2 rounded-full mr-2 flex items-center justify-center transition-all duration-200 ${
                    text.trim() && !isSending
                      ? "text-blue-500 hover:text-blue-400 transform hover:scale-105 active:scale-95"
                      : "text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <HiPaperAirplane
                    className={`w-5 h-5 ${isSending ? "animate-pulse" : ""}`}
                  />
                </button>
              </div>
            </div>
          </motion.div>

          <style>{`
            .backdrop-blur-lg {
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}

export default ThreadReplyModal;
