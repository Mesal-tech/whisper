import { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useAnimation,
} from "framer-motion";
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
  const [isClosing, setIsClosing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const repliesContainerRef = useRef<HTMLDivElement>(null);

  // Animation controls
  const backdropControls = useAnimation();
  const modalControls = useAnimation();
  const bubbleControls = useAnimation();

  // Motion values for drag interaction
  const dragY = useMotionValue(0);
  const dragThreshold = 150; // Distance to trigger close

  // Backdrop blur and opacity transforms
  const backdropOpacity = useTransform(dragY, [0, dragThreshold], [1, 0]);

  const backdropBlur = useTransform(
    dragY,
    [0, dragThreshold * 0.6, dragThreshold],
    [20, 10, 0]
  );

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

  // Enhanced close animation
  const handleClose = async () => {
    if (isClosing) return;

    setIsClosing(true);

    // Animate all elements simultaneously
    await Promise.all([
      backdropControls.start({
        opacity: 0,
        transition: { duration: 0.3, ease: "easeOut" },
      }),
      modalControls.start({
        y: "100%",
        transition: { type: "spring", damping: 30, stiffness: 300 },
      }),
      bubbleControls.start({
        scale: 0,
        y: 80,
        opacity: 0,
        transition: { duration: 0.3, ease: "easeOut" },
      }),
    ]);

    // Reset states
    setIsClosing(false);
    dragY.set(0);
    onClose();
  };

  // Handle close button click with smooth animation
  const handleCloseButtonClick = () => {
    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed top-0 left-0 w-screen h-full md:py-10 z-[100] flex items-center justify-center">
          {/* Enhanced Backdrop with dynamic blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              opacity: backdropOpacity,
              backdropFilter: useTransform(
                backdropBlur,
                (blur) => `blur(${blur}px)`
              ),
              WebkitBackdropFilter: useTransform(
                backdropBlur,
                (blur) => `blur(${blur}px)`
              ),
            }}
            className="fixed inset-0 bg-black/30 z-50"
            onClick={handleClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{
              y: 0,
              transition: {
                type: "spring",
                damping: 30,
                stiffness: 300,
                mass: 0.8,
              },
            }}
            exit={{
              y: "100%",
              transition: {
                type: "spring",
                damping: 35,
                stiffness: 400,
                mass: 0.6,
              },
            }}
            className="overflow-hidden max-w-xl w-full space-y-4 text-center group z-50 relative bg-white/5 backdrop-blur-sm border border-white/10 md:rounded-2xl h-full hover:border-white/20 transition-all duration-500"
          >
            {/* Header*/}
            <div className="sticky top-0 p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0 cursor-grab active:cursor-grabbing">
              <h3 className="text-lg font-semibold text-white pointer-events-none">
                {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
              </h3>
              <motion.button
                onClick={handleCloseButtonClick}
                disabled={isClosing}
                className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors pointer-events-auto"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 1 }}
                animate={{ opacity: isClosing ? 0.5 : 1 }}
              >
                <HiX className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="h-full overflow-y-auto pb-[4rem] md:pb-[10rem]">
              {/* Thread Bubble*/}
              <MessageBubble
                message={thread}
                isCurrentUser={thread.userId === auth.currentUser?.uid}
                showTimestamp={true}
                isFirstInTimeGroup={true}
                isLastInTimeGroup={true}
              />

              {/* Replies Container */}
              <div
                ref={repliesContainerRef}
                className="p-4 space-y-2"
              >
                {replies.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center justify-center h-full text-center"
                  >
                    <div>
                      <motion.div
                        className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3"
                        animate={{
                          scale: [1, 1.05, 1],
                          rotate: [0, 5, -5, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatType: "loop",
                        }}
                      >
                        <span className="text-gray-400">💬</span>
                      </motion.div>
                      <p className="text-gray-400 text-sm">No replies yet</p>
                      <p className="text-gray-500 text-xs mt-1">
                        Be the first to reply to this thread
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  replies.map((reply, index) => (
                    <motion.div
                      key={reply.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <MessageBubble
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
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Enhanced Input Area */}
            <div className="absolute bottom-0 left-0 right-0 z-50 bg-[#1b1b1b] border-t border-gray-700 p-2">
              <motion.div
                className="flex items-end bg-[#2d2d2d] rounded-2xl p-2"
                transition={{ duration: 0.2 }}
              >
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Reply to thread..."
                  disabled={isSending || isClosing}
                  rows={1}
                  className="flex-1 bg-transparent text-white py-2 px-3 resize-none focus:outline-none placeholder-gray-400 min-h-[24px] max-h-[120px] overflow-y-auto"
                  maxLength={500}
                />
                <motion.button
                  onClick={handleSend}
                  disabled={!text.trim() || isSending || isClosing}
                  className={`p-2 rounded-full mr-2 flex items-center justify-center transition-all duration-200 ${text.trim() && !isSending && !isClosing
                    ? "text-purple-500 hover:text-purple-400"
                    : "text-gray-500 cursor-not-allowed"
                    }`}
                  whileHover={
                    text.trim() && !isSending && !isClosing
                      ? { scale: 1.05 }
                      : {}
                  }
                  whileTap={
                    text.trim() && !isSending && !isClosing
                      ? { scale: 0.95 }
                      : {}
                  }
                  animate={isSending ? { rotate: [0, 360] } : { rotate: 0 }}
                  transition={{
                    duration: 0.5,
                    repeat: isSending ? Infinity : 0,
                  }}
                >
                  <HiPaperAirplane
                    className={`w-5 h-5 ${isSending ? "animate-pulse" : ""}`}
                  />
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ThreadReplyModal;
