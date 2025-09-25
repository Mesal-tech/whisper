import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, collection, addDoc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Timestamp } from "firebase/firestore";

const AnonMessage = () => {
  const { id } = useParams<{ id: string }>();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <p className="text-gray-200">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-gray-700 rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-200 mb-4">
          Send Message to Anonymous
        </h2>
        <form onSubmit={handleSubmit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your message..."
            className="w-full bg-gray-800/50 border border-gray-700 rounded p-3 text-gray-200 text-sm resize-none h-32 focus:outline-none focus:ring-2 focus:ring-blue-400"
            maxLength={500} // Reasonable limit for text-only messages
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          {success && (
            <p className="text-green-400 text-sm mt-2">Message sent!</p>
          )}
          <button
            type="submit"
            disabled={sending}
            className={`mt-4 w-full font-medium py-2 rounded transition-all duration-200 flex items-center justify-center ${
              sending
                ? "bg-blue-400 cursor-not-allowed text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              "Send Message"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AnonMessage;
