import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, collection, addDoc, getDoc } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { Timestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

const AnonMessage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch user data to verify user exists
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", id!));
        if (!userDoc.exists()) {
          setError("User not found");
        }
        setLoading(false);
      } catch (err) {
        setError("Failed to load user data");
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

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

  // Show sign-up prompt after successful message send if not signed in
  useEffect(() => {
    if (success && !auth.currentUser) {
      setShowSignUpPrompt(true);
    }
  }, [success]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Message cannot be empty");
      return;
    }

    try {
      setSending(true);
      setError(null);
      setSuccess(false);
      await addDoc(collection(db, `users/${id}/messages`), {
        id: new Date().getTime().toString(), // Simple ID generation; consider UUID
        text: text.trim(),
        timestamp: Timestamp.now(),
        anonymous: true,
      });
      setSuccess(true);
      setText("");
    } catch (err) {
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Sign-up modal component
  function SignUpPromptModal({
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
            className="fixed inset-0 bg-black/50 z-[100] flex items-end md:items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-[#1c1c1c] rounded-xl shadow-xl w-full max-w-sm border border-gray-700 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-1 bg-gray-600 rounded-full mx-auto mb-6 md:hidden" />
              <div className="text-center">
                <div className="w-16 h-16 bg-transparent rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-6xl">✨</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Join the Conversation!
                </h3>
                <p className="text-gray-400 mb-4 text-sm">
                  Your message was sent! Sign up now to unlock a world of
                  possibilities: track your messages, see replies, create your own
                  threads, and connect with our vibrant community. Don’t miss out
                  on a personalized experience that makes every interaction
                  count!
                </p>
                <div className="flex flex-col gap-3">
                  <motion.button
                    onClick={() => navigate("/auth/signin")}
                    className="w-full px-4 py-2 text-lg font-medium text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-lg transition-all duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sign Up Now
                  </motion.button>
                  <motion.button
                    onClick={onClose}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Continue as Guest
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3"
        >
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-200 text-sm">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-[#121212] border border-white/10 rounded-xl shadow-xl p-6 w-full max-w-md backdrop-blur-sm"
      >
        <h2 className="text-xl text-center font-semibold text-white mb-4">
          Send Anonymous Message
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Character count for long messages */}
          {text.length > 400 && (
            <div className="flex justify-end mb-2">
              <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                {text.length}/500
              </span>
            </div>
          )}
          <div className="relative bg-white/5 border border-white/10 rounded-xl p-3 mb-3 focus-within:ring-2 focus-within:ring-purple-400 transition-all duration-200">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your message..."
              className="w-full bg-transparent text-white text-sm resize-none focus:outline-none placeholder-gray-400 h-32 overflow-y-auto"
              maxLength={500}
              aria-label="Anonymous message input"
            />
          </div>
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-red-400 text-sm mt-2"
              >
                {error}
              </motion.p>
            )}
            {success && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-green-400 text-sm mt-2"
              >
                Message sent!
              </motion.p>
            )}
          </AnimatePresence>
          <motion.button
            type="submit"
            disabled={sending}
            className={`mt-4 w-full font-medium py-3 rounded-4xl flex items-center justify-center transition-all cursor-pointer duration-200 ${
              sending
                ? "bg-purple-400 cursor-not-allowed text-white"
                : "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white hover:scale-105 active:scale-95"
            }`}
            whileHover={{ scale: sending ? 1 : 1.05 }}
            whileTap={{ scale: sending ? 1 : 0.95 }}
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Sending...
              </>
            ) : (
              "Send Message"
            )}
          </motion.button>
        </form>
      </motion.div>
      <SignUpPromptModal
        isOpen={showSignUpPrompt}
        onClose={() => setShowSignUpPrompt(false)}
      />
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
      `}</style>
    </div>
  );
};

export default AnonMessage;