import Header from "../../components/Header";
import { useState, useEffect, useRef } from "react";
import { useUserStore, useMessages } from "../../store/userStore"; // Adjust path as needed
import {
  HiOutlineMail,
  HiOutlineRefresh,
  HiOutlineShare,
  HiDownload,
} from "react-icons/hi";

function Messages() {
  const userId = useUserStore((state) => state.user?.id);
  const messages = useMessages();
  const fetchMessages = useUserStore((state) => state.fetchMessages);
  const subscribeToMessages = useUserStore(
    (state) => state.subscribeToMessages
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false); // Ref to track if fetch has occurred (I got lazy at this point, ignore it)

  useEffect(() => {
    if (!userId) {
      setError("User not found");
      setLoading(false);
      return;
    }

    // Only fetch if messages are not already loaded
    if (!messages && !hasFetchedRef.current) {
      const fetchAndSubscribe = async () => {
        try {
          await fetchMessages(userId);
          hasFetchedRef.current = true; // Mark as fetched
        } catch (err) {
          console.error("Error fetching messages:", err);
          setError("Failed to load messages");
        } finally {
          setLoading(false);
        }
      };
      fetchAndSubscribe();
    } else {
      setLoading(false); // No need to show loading if data exists
    }

    let unsubscribeMessages: (() => void) | null = null;
    // Set up subscription only if not already subscribed
    if (!unsubscribeMessages) {
      unsubscribeMessages = subscribeToMessages(userId);
    }

    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
    };
  }, [userId, fetchMessages, subscribeToMessages, messages]);

  const handleRefresh = () => {
    if (userId) {
      setLoading(true);
      fetchMessages(userId).finally(() => setLoading(false));
    }
  };

  const handleShare = () => {
    const baseUrl = window.location.origin;
    const shareText = `${
      useUserStore.getState().user?.userName || "Anonymous"
    }'s Profile\n${baseUrl}/anon/${userId || ""}`;
    navigator.clipboard
      .writeText(shareText)
      .then(() => {
        alert("Link copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  if (loading && !messages) {
    return (
      <div className="h-screen bg-[#111111]">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-[#111111]">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex items-center justify-center">
          <div className="bg-[#2D2D30] border border-gray-700 rounded-lg shadow p-4 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">
              Your Messages
            </h2>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#111111]">
      <Header />
      <main className="max-w-7xl mx-auto px-4 mt-10 sm:px-6 lg:px-8 py-16">
        <div className="bg-[#2D2D30] border border-gray-700 rounded-lg shadow p-4 mb-4">
          <div className="flex items-center mb-2">
            <HiOutlineMail className="w-10 h-10 text-purple-500 mr-2" />
            <h2 className="text-2xl font-semibold text-white">Your Messages</h2>
          </div>
          <p className="text-gray-400 text-md mb-4">
            Connect and respond to your incoming messages
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className="bg-gray-800 text-white text-md py-1 px-3 rounded-full hover:bg-gray-700 transition-colors duration-200 flex items-center"
            >
              <HiOutlineRefresh className="w-6 h-6 mr-1" />
              Refresh
            </button>
            <button
              onClick={handleShare}
              className="bg-purple-500 text-white text-md py-1 px-3 rounded-full hover:bg-purple-600 transition-colors duration-200 flex items-center"
            >
              <HiOutlineShare className="w-6 h-6 mr-1" />
              Share Profile
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {messages?.length === 0 ? (
            <div className="bg-[#2D2D30] border border-gray-700 rounded-lg shadow p-4 text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <HiOutlineMail className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                No messages yet
              </h3>
              <p className="text-gray-500 text-sm">
                Share your profile link to start receiving anonymous messages
                from your friends! 🌟
              </p>
            </div>
          ) : (
            messages?.map((message) => (
              <div
                key={message.id}
                className="bg-[#2D2D30] border border-gray-700 rounded-lg shadow p-4 flex items-start justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-row space-x-2">
                    <div className="bg-purple-500 h-6 w-1 rounded-full" />
                    <div className="flex items-center text-purple-500 text-md mb-1">
                      <span>{message.id}</span>
                    </div>
                  </div>
                  <p className="text-gray-200 text-lg leading-relaxed break-words mb-2">
                    {message.text}
                  </p>
                  <p className="text-gray-500 text-sm">
                    by - Anonymous •{" "}
                    {message.timestamp?.toDate().toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                      hour12: true,
                    }) || "Just now"}
                  </p>
                </div>
                <button className="text-gray-500 hover:text-gray-400 ml-2">
                  <HiDownload className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default Messages;
