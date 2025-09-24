import Header from "../../components/Header";
import { useState, useEffect, useRef } from "react";
import { useUserStore, useMessages } from "../../store/userStore"; // Adjust path as needed
import {
  HiOutlineMail,
  HiOutlineRefresh,
  HiOutlineShare,
} from "react-icons/hi";
import { FaCamera } from "react-icons/fa";

function Messages() {
  const userId = useUserStore((state) => state.user?.id);
  const messages = useMessages();
  const fetchMessages = useUserStore((state) => state.fetchMessages);
  const subscribeToMessages = useUserStore(
    (state) => state.subscribeToMessages
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState<string | null>(
    null
  );
  const hasFetchedRef = useRef(false); // Ref to track if fetch has occurred (I got lazy at this point, if it works, it works)

  // Helper function to safely format timestamp
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return "Just now";

    try {
      let date: Date;

      // Check if it's a Firestore Timestamp
      if (timestamp && typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
      }
      // Check if it's already a Date object
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // Check if it's a timestamp number (milliseconds)
      else if (typeof timestamp === "number") {
        date = new Date(timestamp);
      }
      // Check if it's a string that can be parsed
      else if (typeof timestamp === "string") {
        date = new Date(timestamp);
      }
      // If it has seconds and nanoseconds (Firestore Timestamp-like object)
      else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        return "Just now";
      }

      // Validate the date
      if (isNaN(date.getTime())) {
        return "Just now";
      }

      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Just now";
    }
  };

  // Function to wrap text for canvas rendering
  const wrapText = (
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      const metrics = context.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  // Function to capture message as screenshot
  const captureMessageScreenshot = async (message: any) => {
    setScreenshotLoading(message.id);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not create canvas context");
      }

      // Set canvas dimensions
      const padding = 40;
      const maxWidth = 600;
      canvas.width = maxWidth + padding * 2;

      // Set up fonts and colors
      const backgroundColor = "#2D2D30";
      const borderColor = "#374151";
      const textColor = "#E5E7EB";
      const accentColor = "#A855F7";
      const metaColor = "#9CA3AF";

      // Set initial font for measurements
      ctx.font = "18px system-ui, -apple-system, sans-serif";

      // Wrap the message text
      const wrappedText = wrapText(ctx, message.text, maxWidth - padding * 2);
      const textLineHeight = 28;
      const headerHeight = 60;
      const footerHeight = 40;
      //@ts-ignore
      const borderRadius = 12;

      // Calculate canvas height based on content
      const contentHeight =
        headerHeight +
        wrappedText.length * textLineHeight +
        footerHeight +
        padding * 2;
      canvas.height = contentHeight;

      // Fill background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw border (rounded rectangle effect)
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

      // Draw accent bar
      ctx.fillStyle = accentColor;
      ctx.fillRect(padding, padding + 10, 4, 24);

      // Draw message ID
      ctx.fillStyle = accentColor;
      ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
      ctx.fillText(`#${message.id}`, padding + 16, padding + 28);

      // Draw message text
      ctx.fillStyle = textColor;
      ctx.font = "18px system-ui, -apple-system, sans-serif";
      wrappedText.forEach((line, index) => {
        ctx.fillText(
          line,
          padding,
          padding + headerHeight + index * textLineHeight
        );
      });

      // Draw timestamp and author
      const timestampText = `by Anonymous • ${formatTimestamp(
        message.timestamp
      )}`;
      ctx.fillStyle = metaColor;
      ctx.font = "14px system-ui, -apple-system, sans-serif";
      ctx.fillText(
        timestampText,
        padding,
        padding + headerHeight + wrappedText.length * textLineHeight + 25
      );

      // Add watermark
      const userName = useUserStore.getState().user?.userName || "Anonymous";
      const watermarkText = `${userName}'s Messages`;
      ctx.fillStyle = "#6B7280";
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      const watermarkMetrics = ctx.measureText(watermarkText);
      ctx.fillText(
        watermarkText,
        canvas.width - watermarkMetrics.width - padding,
        canvas.height - 15
      );

      // Convert canvas to blob and create download
      canvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `message-${message.id}-${Date.now()}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, "image/png");

      // Also try to share via Web Share API if available
      if (navigator.share && navigator.canShare) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;

          const file = new File([blob], `message-${message.id}.png`, {
            type: "image/png",
          });

          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: "Anonymous Message",
                text: "Check out this message!",
                files: [file],
              });
            } catch (err) {
              console.log("Share cancelled or failed");
            }
          }
        }, "image/png");
      }
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      alert("Failed to capture screenshot. Please try again.");
    } finally {
      setScreenshotLoading(null);
    }
  };

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
        <div className="max-h-96 overflow-y-auto space-y-4">
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
                    by - Anonymous • {formatTimestamp(message.timestamp)}
                  </p>
                </div>
                <button
                  onClick={() => captureMessageScreenshot(message)}
                  disabled={screenshotLoading === message.id}
                  className="text-gray-500 hover:text-gray-400 ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save as image"
                >
                  {screenshotLoading === message.id ? (
                    <div className="animate-spin w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full" />
                  ) : (
                    <FaCamera className="w-5 h-5" />
                  )}
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
