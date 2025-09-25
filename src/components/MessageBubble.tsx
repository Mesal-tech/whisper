import { useState, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { HiReply, HiTrash, HiClipboardCopy } from "react-icons/hi";
import type { PanInfo } from "framer-motion";
import type { Message } from "../types";

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  onReply?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  showTimestamp?: boolean;
  isLastInTimeGroup?: boolean;
  isFirstInTimeGroup?: boolean;
  allMessages?: Message[];
  onScrollToMessage?: (messageId: string) => void;
  isHighlighted?: boolean;
  onThreadReply?: (message: Message) => void;
}

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCopy: () => void;
  onDelete?: () => void;
  showDelete: boolean;
}

// URL detection regex
const urlRegex = /(https?:\/\/[^\s]+)/g;

// Component to render text with clickable URLs
function TextWithLinks({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const renderTextWithLinks = (text: string) => {
    const parts = text.split(" ");

    return parts.map((word, index) => {
      if (urlRegex.test(word)) {
        urlRegex.lastIndex = 0;
        return (
          <span key={index}>
            <a
              href={word}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline hover:text-blue-200 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {word}
            </a>
            {index < parts.length - 1 ? " " : ""}
          </span>
        );
      }
      return word + (index < parts.length - 1 ? " " : "");
    });
  };

  return <span className={className}>{renderTextWithLinks(text)}</span>;
}

function BottomSheet({
  isOpen,
  onClose,
  onCopy,
  onDelete,
  showDelete,
}: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed inset-0 bg-black/50 z-[60]"
          onClick={onClose}
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
            className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-gray-700 rounded-t-4xl p-6 z-60"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />

              <div className="space-y-3">
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                  onClick={() => {
                    onCopy();
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full p-3 text-left text-white hover:bg-gray-800 rounded-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <HiClipboardCopy className="w-5 h-5 text-gray-400" />
                  <span>Copy message</span>
                </motion.button>

                {showDelete && onDelete && (
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    onClick={() => {
                      onDelete();
                      onClose();
                    }}
                    className="flex items-center gap-3 w-full p-3 text-left text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <HiTrash className="w-5 h-5" />
                    <span>Delete message</span>
                  </motion.button>
                )}
              </div>

              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                onClick={onClose}
                className="w-full mt-4 p-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
  );
}

function MessageBubble({
  message,
  isCurrentUser,
  onReply,
  onDelete,
  showTimestamp = true,
  isLastInTimeGroup = true,
  isFirstInTimeGroup = true,
  allMessages = [],
  onScrollToMessage,
  isHighlighted = false,
  onThreadReply,
}: MessageBubbleProps) {
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const dragX = useMotionValue(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isDragging = useRef(false);

  // Transform drag value to opacity for reply icon - only for regular messages
  const replyIconOpacity = useTransform(dragX, [-80, -40, 0], [1, 0.7, 0]);

  // Find the message being replied to
  const repliedToMessage = message.replyTo
    ? allMessages.find((msg) => msg.id === message.replyTo)
    : null;

  const handleReplyClick = () => {
    if (repliedToMessage && onScrollToMessage) {
      onScrollToMessage(repliedToMessage.id);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  const handleDragStart = () => {
    if (message.messageType === "thread") return;
    isDragging.current = true;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleDrag = (
    //@ts-ignore
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (message.messageType === "thread") return;
    const threshold = 80;
    const dragValue = info.offset.x;

    if (dragValue < 0) {
      dragX.set(Math.max(dragValue, -threshold));
    } else {
      dragX.set(0);
    }
  };

  const handleDragEnd = (
    //@ts-ignore
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (message.messageType === "thread") return;
    const threshold = 60;
    const velocity = info.velocity.x;
    const dragValue = info.offset.x;

    const shouldReply = dragValue < -threshold || velocity < -500;

    if (shouldReply && onReply) {
      onReply(message);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }

    dragX.set(0);
    isDragging.current = false;
  };

  const handleLongPressStart = () => {
    if (isDragging.current) return;

    longPressTimer.current = setTimeout(() => {
      setShowBottomSheet(true);
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();
  };

  const isSending = !message.timestamp;
  const isThread = message.messageType === "thread";

  const getMarginTop = () => {
    if (isFirstInTimeGroup) return "mt-4";
    return "mt-1";
  };

  const getBorderRadius = () => {
    if (isThread) {
      return "rounded-2xl";
    }

    if (isCurrentUser) {
      if (isFirstInTimeGroup && isLastInTimeGroup) {
        return "rounded-2xl rounded-br-md";
      } else if (isFirstInTimeGroup) {
        return "rounded-2xl rounded-br-lg";
      } else if (isLastInTimeGroup) {
        return "rounded-2xl rounded-br-md";
      } else {
        return "rounded-2xl rounded-br-lg";
      }
    } else {
      if (isFirstInTimeGroup && isLastInTimeGroup) {
        return "rounded-2xl rounded-bl-md";
      } else if (isFirstInTimeGroup) {
        return "rounded-2xl rounded-bl-lg";
      } else if (isLastInTimeGroup) {
        return "rounded-2xl rounded-bl-md";
      } else {
        return "rounded-2xl rounded-bl-lg";
      }
    }
  };

  if (isThread) {
    return (
      <div className={`flex group relative select-none ${getMarginTop()}`}>
        <div className="w-full relative">
          {/* Main Thread Bubble */}
          <div
            className={`w-full mx-auto max-w-[30rem] p-4 shadow-sm transition-all duration-200 ${getBorderRadius()} bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:border-white/20 hover:bg-white/10 transition-all duration-500 overflow-hidden`}
            onPointerDown={handleLongPressStart}
            onPointerUp={handleLongPressEnd}
            onPointerLeave={handleLongPressEnd}
          >
            {/* Background gradient */}
            <motion.div
              className={`absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 transform-gpu will-change-transform transition opacity-3 blur-xl -z-10`}
              animate={{
                scale: [1, 1.02, 1],
                opacity: [0.03, 0.05, 0.03]
              }}
              transition={{
                duration: 3,
                repeat: Infinity
              }}
            />

            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-lg font-medium text-white">
                What do you think?
              </span>
              {isSending && (
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-sm text-white/80">Sending</span>
                  <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                </div>
              )}
            </div>

            {/* Nested Message */}
            <div className="bg-white/5 text-center rounded-xl border border-white/10 group-hover:bg-white/10 transition-colors p-3">
              {repliedToMessage && (
                <div
                  className="mb-3 p-2 bg-gray-700/50 border border-gray-600/30 rounded cursor-pointer hover:bg-gray-700/70 transition-colors"
                  onClick={handleReplyClick}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <HiReply className="w-3 h-3 text-white" />
                    <span className="text-xs text-white">
                      Replying to {repliedToMessage.userName || "Anonymous"}
                      {repliedToMessage.messageType === "thread" && " (Thread)"}
                    </span>
                  </div>
                  <p className="text-xs text-white/90 truncate">
                    {repliedToMessage.text.length > 60
                      ? `${repliedToMessage.text.substring(0, 60)}...`
                      : repliedToMessage.text}
                  </p>
                </div>
              )}

              <TextWithLinks
                text={message.text}
                className="text-sm leading-relaxed break-words whitespace-pre-wrap text-white"
              />
            </div>

            <div className="flex items-center justify-between">
              {showTimestamp && message.timestamp && (
                <div className="flex items-center mt-3 text-xs text-white/80">
                  <span>{formatTime(message.timestamp)}</span>
                  <span className="mx-2">•</span>
                  <span>Thread</span>
                </div>
              )}

              {/* Reply Button - Outside and Bottom Right */}
              {onThreadReply && (
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => onThreadReply?.(message)}
                    className="text-xs bg-purple-500 text-white px-4 py-2 rounded-full hover:bg-purple-600 transition-colors shadow-sm"
                  >
                    Join Discussion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <BottomSheet
          isOpen={showBottomSheet}
          onClose={() => setShowBottomSheet(false)}
          onCopy={copyToClipboard}
          onDelete={onDelete ? () => onDelete(message.id) : undefined}
          showDelete={isCurrentUser && !!onDelete}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex group relative select-none ${getMarginTop()} ${isCurrentUser ? "justify-end" : "justify-start"
        }`}
    >
      <div
        className={`max-w-[40vh] lg:max-w-md relative ${isCurrentUser ? "ml-auto" : "mr-auto"
          }`}
      >
        <motion.div
          drag="x"
          dragConstraints={{ left: -100, right: 0 }}
          dragElastic={0.1}
          dragMomentum={false}
          style={{ x: dragX }}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          onPointerDown={handleLongPressStart}
          onPointerUp={handleLongPressEnd}
          onPointerLeave={handleLongPressEnd}
          className="relative"
        >
          <motion.div
            style={{ opacity: replyIconOpacity }}
            className="absolute top-1/2 -translate-y-1/2 -left-12 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center"
          >
            <HiReply className="w-4 h-4 text-white" />
          </motion.div>

          <div
            className={`rounded-[25px] p-3 select-none shadow-sm transition-all duration-200 hover:shadow-md ${getBorderRadius()} ${isCurrentUser
                ? isHighlighted
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-gradient-to-br from-purple-600 via-purple-500 to-purple-400 text-white"
                : isHighlighted
                  ? "bg-gray-700 text-white shadow-lg shadow-gray-500/20"
                  : "bg-white/10 text-white"
              }`}
          >
            <div className="flex flex-col">
              {isFirstInTimeGroup && !isCurrentUser && (
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs opacity-70 font-medium">
                    {message.userName || "Anonymous"}
                  </span>
                </div>
              )}

              {repliedToMessage && (
                <div
                  className={`mb-2 p-2 rounded border-l-2 cursor-pointer transition-all duration-200 ${isCurrentUser
                    ? "bg-blue-600/30 border-blue-300 hover:bg-blue-600/40"
                    : "bg-gray-700/50 border-gray-400 hover:bg-gray-700/70"
                    }`}
                  onClick={handleReplyClick}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <HiReply className="w-3 h-3 opacity-60" />
                    <span className="text-xs opacity-70">
                      Replying to {repliedToMessage.userName || "Anonymous"}
                      {repliedToMessage.messageType === "thread" && (
                        <span className="text-purple-300 ml-1">(Thread)</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs opacity-80 truncate">
                    {repliedToMessage.text.length > 50
                      ? `${repliedToMessage.text.substring(0, 50)}...`
                      : repliedToMessage.text}
                  </p>
                </div>
              )}

              <TextWithLinks
                text={message.text}
                className="text-lg leading-relaxed break-words whitespace-pre-wrap"
              />
            </div>
          </div>
        </motion.div>

        {isLastInTimeGroup && (
          <div
            className={`mt-1 text-xs text-gray-400 ${isCurrentUser ? "text-right" : "text-left"
              }`}
          >
            {isSending ? (
              <div className="flex items-center gap-1 justify-end">
                <span>Sending</span>
                <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
              </div>
            ) : showTimestamp && message.timestamp ? (
              <div
                className={`flex items-center gap-1 ${isCurrentUser ? "justify-end" : "justify-start"
                  }`}
              >
                <span className="text-[12px]">
                  {formatTime(message.timestamp)}
                </span>
                {isCurrentUser && (
                  <>
                    <span> • </span>
                    <span className="text-[12px]"> Sent</span>
                  </>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <BottomSheet
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        onCopy={copyToClipboard}
        onDelete={onDelete ? () => onDelete(message.id) : undefined}
        showDelete={isCurrentUser && !!onDelete}
      />
    </div>
  );
}

export default MessageBubble;
