import { useState, useRef, useEffect } from "react";
import { HiPaperAirplane, HiReply, HiX } from "react-icons/hi";
import { FaPaperclip } from "react-icons/fa";
import type { Message } from "../types";

interface InputBoxProps {
  onSend: (message: string, messageType?: "message" | "thread") => void;
  placeholder?: string;
  disabled?: boolean;
  replyTo?: Message | null;
  onCancelReply?: () => void;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    onSend(messageText.trim(), messageType);
    setText("");
    setIsTyping(false);
    setIsThreadMode(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    setIsTyping(value.length > 0);

    // Check if user is typing a thread command
    setIsThreadMode(value.startsWith("/thread "));
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
                    Replying to ~anon
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
