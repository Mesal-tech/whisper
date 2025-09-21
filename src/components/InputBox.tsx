import { useState, useRef, useEffect } from "react";
import { HiPaperAirplane, HiReply, HiX, HiExternalLink } from "react-icons/hi";
import { FaPaperclip } from "react-icons/fa";
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
    // Try to fetch the page
    const response = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    );
    const data = await response.json();
    const html = data.contents;

    // Parse HTML to extract metadata
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Extract Open Graph and meta tags
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

    // Try to get favicon
    let favicon = "";
    const faviconLink =
      doc.querySelector('link[rel="icon"]') ||
      doc.querySelector('link[rel="shortcut icon"]');
    if (faviconLink) {
      favicon = faviconLink.getAttribute("href") || "";
      if (favicon && !favicon.startsWith("http")) {
        const baseUrl = new URL(url);
        favicon = `${baseUrl.protocol}//${baseUrl.host}${
          favicon.startsWith("/") ? "" : "/"
        }${favicon}`;
      }
    } else {
      // Fallback to default favicon location
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

    // Fallback: create basic preview from URL
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
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-3">
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

      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white mb-1 line-clamp-2">
            {preview.title}
          </h4>
          {preview.description && (
            <p className="text-xs text-gray-300 line-clamp-2 mb-2">
              {preview.description}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-blue-400">
            <HiExternalLink className="w-3 h-3" />
            <span className="truncate">{new URL(preview.url).hostname}</span>
          </div>
        </div>

        {preview.image && !imageError && (
          <div className="flex-shrink-0">
            <img
              src={preview.image}
              alt=""
              className="w-16 h-16 object-cover rounded"
              onError={() => setImageError(true)}
            />
          </div>
        )}
      </div>
    </div>
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSend = () => {
    if (!text.trim() || disabled) return;

    let messageText = text.trim();
    let messageType: "message" | "thread" = "message";

    // Check for /thread command
    if (messageText.startsWith("/thread ")) {
      messageText = messageText.substring(8); // Remove "/thread " prefix
      messageType = "thread";
    }

    if (!messageText.trim()) return; // Don't send empty messages after removing command

    // Send message with preview if available
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
      window.innerWidth <= 768 || // Fallback for smaller screens
      "ontouchstart" in window
    ); // Touch support detection
  }

  // Replace the existing handleKeyPress function with this:
  const handleKeyPress = (e: React.KeyboardEvent) => {
    const isMobile = isMobileDevice();

    if (e.key === "Enter") {
      if (isMobile) {
        // On mobile: Enter creates line break, don't send
        return;
      } else {
        // On desktop: Enter sends (unless Shift is held)
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

    // Check if user is typing a thread command
    setIsThreadMode(value.startsWith("/thread "));

    // Debounce URL detection
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

    // Take only the first URL for preview (like WhatsApp)
    const firstUrl = urls[0];

    // Check if we already have this preview
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
      const maxHeight = 120; // Maximum height in pixels (approximately 5-6 lines)
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
    <div className="fixed bottom-0 left-0 right-0 bg-[#111111] z-50">
      <div className="max-w-screen-xl mx-auto p-4">
        {/* Enhanced Reply Preview */}
        {replyTo && (
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border border-gray-700 mb-3 rounded-lg shadow-lg">
            <div className="flex items-start justify-between p-3">
              <div className="flex-1">
                {/* Reply Header */}
                <div className="flex items-center gap-2 mb-2">
                  <HiReply className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-medium text-blue-400">
                    Replying to {replyTo.userName || "Anonymous"}
                  </span>
                  {replyTo.messageType === "thread" && (
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                      Thread
                    </span>
                  )}
                </div>

                {/* Message Preview */}
                <div className="bg-gray-800/50 border border-gray-700 rounded p-2">
                  <p className="text-sm text-gray-200 line-clamp-2">
                    {replyTo.text.length > 100
                      ? `${replyTo.text.substring(0, 100)}...`
                      : replyTo.text}
                  </p>
                </div>
              </div>

              {/* Close Button */}
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
        {urlPreviews.map((preview) => (
          <UrlPreviewCard
            key={preview.url}
            preview={preview}
            onRemove={() => removePreview(preview.url)}
          />
        ))}

        {/* Loading Preview */}
        {loadingPreviews.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-400">Loading preview...</span>
            </div>
          </div>
        )}

        {/* Thread mode indicator */}
        {isThreadMode && (
          <div className="flex items-center mb-2 text-sm">
            <div className="bg-purple-500/20 text-xs text-purple-300 px-3 py-1 rounded-full border border-purple-500/30 flex items-center gap-2">
              Thread
            </div>
            <span className="text-gray-400 ml-2">
              Your message will appear as a thread
            </span>
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

        <div
          className={`relative bg-[#1b1b1b] rounded-4xl focus-within:ring-1 transition-all duration-200 py-1 ${
            isThreadMode
              ? "border border-purple-500/50 focus-within:border-purple-500 focus-within:ring-purple-500"
              : replyTo
              ? "border border-blue-500/50 focus-within:border-blue-500 focus-within:ring-blue-500"
              : "focus-within:border-blue-500 focus-within:ring-blue-500"
          }`}
        >
          <div className="flex items-end">
            {/* Clip Button */}
            <button
              className="p-3 text-gray-400 hover:text-white transition-colors duration-200 flex-shrink-0 flex items-center justify-center"
              onClick={() => {
                /* Media Selection */
              }}
              disabled={disabled}
            >
              <FaPaperclip className="w-6 h-6" />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={isThreadMode ? "Thread content..." : placeholder}
              disabled={disabled}
              rows={1}
              className={`flex-1 bg-transparent text-white py-3 px-1 resize-none focus:outline-none placeholder-gray-400 min-h-[24px] max-h-[120px] overflow-y-auto ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              maxLength={500}
            />

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!text.trim() || disabled}
              className={`p-3 transition-all duration-200 flex-shrink-0 bg-[#373737] rounded-full mr-2 flex items-center justify-center ${
                text.trim() && !disabled
                  ? isThreadMode
                    ? "text-purple-500 hover:text-purple-400 transform hover:scale-105 active:scale-95"
                    : replyTo
                    ? "text-blue-500 hover:text-blue-400 transform hover:scale-105 active:scale-95"
                    : "text-blue-500 hover:text-blue-400 transform hover:scale-105 active:scale-95"
                  : "text-gray-500 cursor-not-allowed"
              }`}
            >
              <HiPaperAirplane
                className={`w-5 h-5 ${
                  isTyping ? "transform rotate-45" : ""
                } transition-transform duration-200`}
              />
            </button>
          </div>
        </div>

        {/* Command hint */}
        {text === "/thread" && (
          <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
            <span className="bg-gray-800 px-2 py-1 rounded">
              Type "/thread your message" to create a thread
            </span>
          </div>
        )}
      </div>

      {/* Custom scrollbar styles for webkit browsers */}
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
