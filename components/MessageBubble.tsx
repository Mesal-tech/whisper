import { useState, useRef, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { HiReply, HiTrash, HiClipboardCopy } from "react-icons/hi";
import { FiX } from "react-icons/fi";
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
  onReply?: () => void;
  showDelete: boolean;
  showReply: boolean;
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
  onReply,
  showDelete,
  showReply,
}: BottomSheetProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`fixed inset-0 bg-black/50 bg-opacity-60 z-[60] flex ${
            isMobile ? "items-end" : "items-center"
          } justify-center backdrop-blur-sm`}
          onClick={onClose}
        >
          <motion.div
            className={`bg-black/90 backdrop-blur-sm w-full max-w-lg ${
              isMobile ? "rounded-t-3xl" : "rounded-2xl"
            } p-6 shadow-2xl ring-1 ring-white/10 ${
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
                onClose();
              }
            }}
          >
            {isMobile && (
              <div className="w-16 h-1 bg-white/40 rounded-full mx-auto mb-6 opacity-80"></div>
            )}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Message Options</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800/50 transition-all duration-200"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="space-y-3">
              {showReply && onReply && (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  onClick={() => {
                    onReply();
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full p-3 text-left text-white hover:bg-white/10 rounded-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <HiReply className="w-5 h-5 text-blue-400" />
                  <span>Reply to message</span>
                </motion.button>
              )}

              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: showReply ? 0.2 : 0.1, duration: 0.3 }}
                onClick={() => {
                  onCopy();
                  onClose();
                }}
                className="flex items-center gap-3 w-full p-3 text-left text-white hover:bg-white/10 rounded-lg transition-colors"
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
                  transition={{ delay: showReply ? 0.3 : 0.2, duration: 0.3 }}
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showDesktopActions, setShowDesktopActions] = useState(false);
  const dragX = useMotionValue(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isDragging = useRef(false);

  const replyIconOpacity = useTransform(dragX, [0, 40, 80], [0, 0.7, 1]);

  const repliedToMessage = message.replyTo
    ? allMessages.find((msg) => msg.id === message.replyTo)
    : null;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    if (message.messageType === "thread" || !isMobile) return;
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
    if (message.messageType === "thread" || !isMobile) return;
    const threshold = 80;
    const dragValue = info.offset.x;

    if (dragValue > 0) {
      dragX.set(Math.min(dragValue, threshold));
    } else {
      dragX.set(0);
    }
  };

  const handleDragEnd = (
    //@ts-ignore
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (message.messageType === "thread" || !isMobile) return;
    const threshold = 60;
    const velocity = info.velocity.x;
    const dragValue = info.offset.x;

    const shouldReply = dragValue > threshold || velocity > 500;

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

  // Desktop click handler
  const handleDesktopClick = () => {
    if (isMobile) return;
    setShowBottomSheet(true);
  };

  // Desktop reply handler
  const handleDesktopReply = () => {
    if (onReply) {
      onReply(message);
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
          <div
            className={`w-full mx-auto max-w-[30rem] p-4 shadow-sm transition-all duration-200 ${getBorderRadius()} bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:border-white/20 hover:bg-white/10 transition-all duration-500 overflow-hidden cursor-pointer`}
            style={{ transform: "translate3d(0, 0, 0)" }}
            onPointerDown={isMobile ? handleLongPressStart : undefined}
            onPointerUp={isMobile ? handleLongPressEnd : undefined}
            onPointerLeave={isMobile ? handleLongPressEnd : undefined}
            onClick={!isMobile ? handleDesktopClick : undefined}
          >
            <motion.div
              className={`absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 transform-gpu will-change-transform transition opacity-3 blur-xl -z-10`}
              animate={{
                scale: [1, 1.02, 1],
                opacity: [0.03, 0.05, 0.03],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
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

              {onThreadReply && (
                <div className="flex justify-end mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onThreadReply?.(message);
                    }}
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
          onReply={onReply ? () => onReply(message) : undefined}
          showDelete={isCurrentUser && !!onDelete}
          showReply={!!onReply}
        />
      </div>
    );
  }

  return (
    <div
      className={`group relative select-none ${getMarginTop()}`}
      onMouseEnter={() => !isMobile && setShowDesktopActions(true)}
      onMouseLeave={() => !isMobile && setShowDesktopActions(false)}
    >
      {/* Mobile swipe reply indicator */}
      {isMobile && (
        <div className="absolute inset-0 flex items-center px-4 pointer-events-none z-0">
          <motion.div
            style={{ opacity: replyIconOpacity }}
            className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center"
          >
            <HiReply className="w-4 h-4 text-white" />
          </motion.div>
        </div>
      )}

      <div
        className={`relative z-10 flex ${
          isCurrentUser ? "justify-end" : "justify-start"
        } items-center gap-2`}
      >
        {/* Desktop hover actions - left side for current user */}
        {!isMobile && showDesktopActions && isCurrentUser && (
          <div className="flex gap-1">
            <AnimatePresence>
              {onReply && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleDesktopReply}
                  className="w-8 h-8 bg-[#121212] hover:bg-gray-800 rounded-full flex items-center justify-center transition-colors shadow-lg"
                  title="Reply to message"
                >
                  <HiReply className="w-4 h-4 text-white" />
                </motion.button>
              )}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleDesktopClick}
                className="w-8 h-8 bg-[#121212] hover:bg-gray-800 rounded-full flex items-center justify-center transition-colors shadow-lg"
                title="More options"
              >
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </motion.button>
            </AnimatePresence>
          </div>
        )}

        <div className="flex flex-col max-w-[40vh] lg:max-w-md relative">
          <motion.div
            style={isMobile ? { x: dragX } : {}}
            drag={isMobile ? "x" : false}
            dragConstraints={isMobile ? { left: 0, right: 80 } : {}}
            dragElastic={isMobile ? 0.1 : 0}
            dragMomentum={false}
            onDragStart={isMobile ? handleDragStart : undefined}
            onDrag={isMobile ? handleDrag : undefined}
            onDragEnd={isMobile ? handleDragEnd : undefined}
            onPointerDown={isMobile ? handleLongPressStart : undefined}
            onPointerUp={isMobile ? handleLongPressEnd : undefined}
            onPointerLeave={isMobile ? handleLongPressEnd : undefined}
            onClick={!isMobile ? handleDesktopClick : undefined}
            className={!isMobile ? "cursor-pointer" : ""}
          >
            <div
              className={`rounded-[25px] p-3 select-none shadow-sm transition-all duration-200 hover:shadow-md ${getBorderRadius()} ${
                isCurrentUser
                  ? isHighlighted
                    ? "bg-purple-500/90 border border-white/10 group-hover:bg-purple-500/10 transition-colors text-white shadow-lg shadow-white-500/20"
                    : "bg-gradient-to-br from-purple-600 via-purple-500 to-purple-400 text-white"
                  : isHighlighted
                  ? "bg-gray-700 text-white shadow-lg shadow-gray-500/20"
                  : "bg-white/10 text-white hover:bg-white/20"
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
                    className={`mb-2 p-2 rounded border-l-2 cursor-pointer transition-all duration-200 ${
                      isCurrentUser
                        ? "bg-gray-600/30 border-white hover:bg-gray-600/40"
                        : "bg-gray-700/50 border-gray-400 hover:bg-gray-700/70"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReplyClick();
                    }}
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
              className={`mt-1 text-xs text-gray-400 ${
                isCurrentUser ? "text-right" : "text-left"
              }`}
            >
              {isSending ? (
                <div className="flex items-center gap-1 justify-end">
                  <span>Sending</span>
                  <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                </div>
              ) : showTimestamp && message.timestamp ? (
                <div
                  className={`flex items-center gap-1 ${
                    isCurrentUser ? "justify-end" : "justify-start"
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

        {/* Desktop hover actions - right side for other users */}
        {!isMobile && showDesktopActions && !isCurrentUser && (
          <div className="flex gap-1">
            <AnimatePresence>
              {onReply && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleDesktopReply}
                  className="w-8 h-8 bg-[#121212] hover:bg-gray-800 rounded-full flex items-center justify-center transition-colors shadow-lg"
                  title="Reply to message"
                >
                  <HiReply className="w-4 h-4 text-white" />
                </motion.button>
              )}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleDesktopClick}
                className="w-8 h-8 bg-[#121212] hover:bg-gray-800 rounded-full flex items-center justify-center transition-colors shadow-lg"
                title="More options"
              >
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </motion.button>
            </AnimatePresence>
          </div>
        )}
      </div>

      <BottomSheet
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        onCopy={copyToClipboard}
        onDelete={onDelete ? () => onDelete(message.id) : undefined}
        onReply={onReply ? () => onReply(message) : undefined}
        showDelete={isCurrentUser && !!onDelete}
        showReply={!!onReply}
      />
    </div>
  );
}

export default MessageBubble;
