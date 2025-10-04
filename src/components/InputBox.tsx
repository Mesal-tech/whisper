import { useState, useRef, useEffect } from "react";
import { HiPaperAirplane, HiReply, HiX, HiExternalLink } from "react-icons/hi";
import { GiWool } from "react-icons/gi";
import { motion, AnimatePresence } from "framer-motion";
import type { Message } from "../types";

interface UrlPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

interface InputBoxProps {
  onSend: (
    message: string,
    messageType?: "message" | "thread",
    preview?: UrlPreview
  ) => void;
  placeholder?: string;
  disabled?: boolean;
  replyTo?: Message | null;
  onCancelReply?: () => void;
}

// URL detection regex
const urlRegex = /(https?:\/\/[^\s]+)/g;

// Extract URLs from text
function extractUrls(text: string): string[] {
  const matches = text.match(urlRegex);
  return matches || [];
}

// Fetch URL metadata
async function fetchUrlPreview(url: string): Promise<UrlPreview | null> {
  try {
    const response = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    );
    const data = await response.json();
    const html = data.contents;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const getMetaContent = (property: string) => {
      const meta =
        doc.querySelector(`meta[property="${property}"]`) ||
        doc.querySelector(`meta[name="${property}"]`);
      return meta?.getAttribute("content") || "";
    };

    const title =
      getMetaContent("og:title") ||
      doc.querySelector("title")?.textContent ||
      url;

    const description =
      getMetaContent("og:description") || getMetaContent("description") || "";

    const image = getMetaContent("og:image") || "";
    const siteName = getMetaContent("og:site_name") || new URL(url).hostname;

    let favicon = "";
    const faviconLink =
      doc.querySelector('link[rel="icon"]') ||
      doc.querySelector('link[rel="shortcut icon"]');
    if (faviconLink) {
      favicon = faviconLink.getAttribute("href") || "";
      if (favicon && !favicon.startsWith("http")) {
        const baseUrl = new URL(url);
        favicon = `${baseUrl.protocol}//${baseUrl.host}${favicon.startsWith("/") ? "" : "/"}${favicon}`;
      }
    } else {
      const baseUrl = new URL(url);
      favicon = `${baseUrl.protocol}//${baseUrl.host}/favicon.ico`;
    }

    return {
      url,
      title: title.slice(0, 100),
      description: description.slice(0, 200),
      image,
      favicon,
      siteName,
    };
  } catch (error) {
    console.error("Error fetching URL preview:", error);
    try {
      const urlObj = new URL(url);
      return {
        url,
        title: urlObj.hostname,
        description: url,
        siteName: urlObj.hostname,
        favicon: `${urlObj.protocol}//${urlObj.host}/favicon.ico`,
      };
    } catch {
      return null;
    }
  }
}

function UrlPreviewCard({
  preview,
  onRemove,
}: {
  preview: UrlPreview;
  onRemove: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {preview.favicon && !faviconError && (
            <img
              src={preview.favicon}
              alt=""
              className="w-4 h-4 rounded flex-shrink-0"
              onError={() => setFaviconError(true)}
            />
          )}
          <span className="text-xs text-gray-400 truncate">
            {preview.siteName || new URL(preview.url).hostname}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-white ml-2 p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <HiX className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-col-reverse md:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white mb-1 line-clamp-2">
            {preview.title}
          </h4>
          {preview.description && (
            <p className="text-xs text-gray-300 line-clamp-2 mb-2">
              {preview.description}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-purple-400">
            <HiExternalLink className="w-3 h-3" />
            <span className="truncate">{new URL(preview.url).hostname}</span>
          </div>
        </div>

        {preview.image && !imageError && (
          <div className="flex-shrink-0">
            <img
              src={preview.image}
              alt=""
              className="w-full md:w-18 md:h-18 object-cover rounded"
              onError={() => setImageError(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function RefillPromptModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-[#1c1c1c] rounded-xl shadow-xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-transparent rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-6xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Ready for More Threads?
              </h3>
              <p className="text-gray-400 mb-4">
                You've used all your free threads! Earn points by participating
                in conversations to create more threads and keep the discussion
                going.
              </p>
              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-lg font-medium text-white bg-purple-500 rounded-lg"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InsufficientPointsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-[#1c1c1c] rounded-xl shadow-xl max-w-sm w-full border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🪙</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Insufficient Points
              </h3>
              <p className="text-gray-400 mb-6">
                You need at least{" "}
                <span className="text-purple-400 font-medium">1 point</span> to
                create a thread. Earn more points by participating in
                conversations!
              </p>
              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InputBox({
  onSend,
  placeholder = "Say Something...",
  disabled = false,
  replyTo = null,
  onCancelReply,
}: InputBoxProps) {
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isThreadMode, setIsThreadMode] = useState(false);
  const [urlPreviews, setUrlPreviews] = useState<UrlPreview[]>([]);
  const [loadingPreviews, setLoadingPreviews] = useState<string[]>([]);
  const [showRefillPrompt, setShowRefillPrompt] = useState(false);
  const [showInsufficientPointsModal, setShowInsufficientPointsModal] =
    useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSend = async () => {
    if (!text.trim() || disabled) return;

    let messageText = text.trim();
    let messageType: "message" | "thread" = isThreadMode ? "thread" : "message";

    if (!messageText.trim()) return;

    const preview = urlPreviews.length > 0 ? urlPreviews[0] : undefined;
    onSend(messageText.trim(), messageType, preview);

    setText("");
    setIsTyping(false);
    setIsThreadMode(false);
    setUrlPreviews([]);
    setLoadingPreviews([]);
  };

  function isMobileDevice(): boolean {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      window.innerWidth <= 768 ||
      "ontouchstart" in window
    );
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    const isMobile = isMobileDevice();

    if (e.key === "Enter") {
      if (isMobile) {
        return;
      } else {
        if (!e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    setIsTyping(value.length > 0);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      detectUrls(value);
    }, 1000);
  };

  const detectUrls = async (text: string) => {
    const urls = extractUrls(text);

    if (urls.length === 0) {
      setUrlPreviews([]);
      setLoadingPreviews([]);
      return;
    }

    const firstUrl = urls[0];

    if (
      urlPreviews.some((p) => p.url === firstUrl) ||
      loadingPreviews.includes(firstUrl)
    ) {
      return;
    }

    setLoadingPreviews([firstUrl]);

    try {
      const preview = await fetchUrlPreview(firstUrl);
      if (preview) {
        setUrlPreviews([preview]);
      }
    } catch (error) {
      console.error("Failed to fetch preview:", error);
    } finally {
      setLoadingPreviews([]);
    }
  };

  const removePreview = (url: string) => {
    setUrlPreviews((prev) => prev.filter((p) => p.url !== url));
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 120;
      const newHeight = Math.min(scrollHeight, maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [text]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed md:absolute bottom-0 left-0 right-0 bg-[#111111] z-50">
      <div className="max-w-screen-xl mx-auto p-2">
        {/* Enhanced Reply Preview */}
        {replyTo && (
          <div className="rounded-lg shadow-lg">
            <div className="flex items-start justify-between p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <HiReply className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-medium text-purple-400">
                    Replying to {replyTo.userName || "Anonymous"}
                  </span>
                  {replyTo.messageType === "thread" && (
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                      Thread
                    </span>
                  )}
                </div>
                <div className="bg-white/5 border border-white/10 rounded p-2">
                  <p
                    className="text-sm text-gray-200 line-clamp-2 break-all"
                    style={{ overflowWrap: "break-word" }}
                  >
                    {replyTo.text.length > 100
                      ? `${replyTo.text.substring(0, 100)}...`
                      : replyTo.text}
                  </p>
                </div>
              </div>
              <button
                onClick={onCancelReply}
                className="text-gray-400 hover:text-white ml-3 p-1 hover:bg-gray-700 rounded transition-all duration-200"
              >
                <HiX className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* URL Previews */}
        {loadingPreviews.length <= 0 &&
          urlPreviews.map((preview) => (
            <UrlPreviewCard
              key={preview.url}
              preview={preview}
              onRemove={() => removePreview(preview.url)}
            />
          ))}

        {/* Loading Preview */}
        {loadingPreviews.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-400">Loading preview...</span>
            </div>
          </div>
        )}

        {/* Thread mode indicator with dynamic cost */}
        {isThreadMode && (
          <div className="flex items-center mb-2 text-sm">
            <div className="text-xs px-3 py-1 rounded-full border flex items-center gap-2 bg-purple-500/20 text-purple-300 border-purple-500/30">
              {/* ##### Thread • {getThreadCostText()} ##### */}
              Message would send as Thread
            </div>
          </div>
        )}

        {/* Character count for long messages */}
        {text.length > 400 && (
          <div className="flex justify-end mb-2">
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
              {text.length}/500
            </span>
          </div>
        )}

        <div className="relative bg-white/5 border border-white/10 rounded-4xl focus-within:ring-0 transition-all duration-200 py-1">
          <div className="flex items-end">
            <button
              className={`p-3 transition-colors duration-200 flex-shrink-0 flex items-center justify-center ${isThreadMode
                  ? "text-purple-500 hover:text-purple-400"
                  : "text-gray-400 hover:text-white"
                }`}
              onClick={() => setIsThreadMode(!isThreadMode)}
              disabled={disabled}
            >
              <GiWool className="w-6 h-6" />
            </button>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={isThreadMode ? "Thread content..." : placeholder}
              disabled={disabled}
              rows={1}
              className={`flex-1 bg-transparent text-white py-3 px-1 resize-none focus:outline-none placeholder-gray-400 min-h-[24px] max-h-[120px] overflow-y-auto ${disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              maxLength={500}
            />

            <button
              onClick={handleSend}
              disabled={!text.trim() || disabled}
              className={`p-3 transition-all duration-200 flex-shrink-0 bg-[#373737] rounded-full mr-2 flex items-center justify-center ${text.trim() && !disabled
                  ? isThreadMode
                    ? "text-purple-500 hover:text-purple-400 transform hover:scale-105 active:scale-95"
                    : replyTo
                      ? "text-purple-500 hover:text-purple-400 transform hover:scale-105 active:scale-95"
                      : "text-purple-500 hover:text-purple-400 transform hover:scale-105 active:scale-95"
                  : "text-gray-500 cursor-not-allowed"
                }`}
            >
              <HiPaperAirplane
                className={`w-5 h-5 ${isTyping ? "transform rotate-45" : ""
                  } transition-transform duration-200`}
              />
            </button>
          </div>
        </div>

        {/* First-time Refill Prompt Modal */}
        <RefillPromptModal
          isOpen={showRefillPrompt}
          onClose={() => setShowRefillPrompt(false)}
        />

        {/* Standard Insufficient Points Modal */}
        <InsufficientPointsModal
          isOpen={showInsufficientPointsModal}
          onClose={() => setShowInsufficientPointsModal(false)}
        />
      </div>

      <style>{`
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
        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
      `}</style>
    </div>
  );
}

export default InputBox;