"use client";

import { useState, useEffect, useRef } from "react";
import { HiOutlineMail, HiOutlineRefresh, HiOutlineShare } from "react-icons/hi";
import { FaCamera } from "react-icons/fa";
import { useUserStore, useMessages } from "@/store/userStore"; // alias path
import Header from "@/components/Header";
import Head from "next/head"; // Next.js replacement for react-helmet

export default function Messages() {
  const userId = useUserStore((state) => state.user?.id);
  const userName = useUserStore((state) => state.user?.userName || "Anonymous");
  const messages = useMessages();
  const fetchMessages = useUserStore((state) => state.fetchMessages);
  const subscribeToMessages = useUserStore((state) => state.subscribeToMessages);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  // 🕒 Timestamp formatter
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return "Just now";

    try {
      let date: Date;

      if (timestamp?.toDate) date = timestamp.toDate();
      else if (timestamp instanceof Date) date = timestamp;
      else if (typeof timestamp === "number") date = new Date(timestamp);
      else if (typeof timestamp === "string") date = new Date(timestamp);
      else if (timestamp?.seconds) date = new Date(timestamp.seconds * 1000);
      else return "Just now";

      if (isNaN(date.getTime())) return "Just now";

      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });
    } catch {
      return "Just now";
    }
  };

  // 🧠 Text wrapping for canvas
  const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      if (context.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else currentLine = testLine;
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // 📸 Screenshot capture
  const captureMessageScreenshot = async (message: any) => {
    setScreenshotLoading(message.id);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      const padding = 40;
      const maxWidth = 600;
      canvas.width = maxWidth + padding * 2;

      const bg = "#2D2D30";
      const border = "#374151";
      const text = "#E5E7EB";
      const accent = "#A855F7";
      const meta = "#9CA3AF";

      ctx.font = "18px system-ui, -apple-system, sans-serif";
      const wrapped = wrapText(ctx, message.text, maxWidth - padding * 2);
      const lineHeight = 28;
      const header = 60;
      const footer = 40;
      const height = header + wrapped.length * lineHeight + footer + padding * 2;
      canvas.height = height;

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

      ctx.fillStyle = accent;
      ctx.fillRect(padding, padding + 10, 4, 24);

      ctx.fillStyle = accent;
      ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
      ctx.fillText(`#${message.id}`, padding + 16, padding + 28);

      ctx.fillStyle = text;
      ctx.font = "18px system-ui, -apple-system, sans-serif";
      wrapped.forEach((line, i) => ctx.fillText(line, padding, padding + header + i * lineHeight));

      const timestamp = `by Anonymous • ${formatTimestamp(message.timestamp)}`;
      ctx.fillStyle = meta;
      ctx.font = "14px system-ui, -apple-system, sans-serif";
      ctx.fillText(timestamp, padding, padding + header + wrapped.length * lineHeight + 25);

      const watermark = `${userName}'s Messages`;
      ctx.fillStyle = "#6B7280";
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      const w = ctx.measureText(watermark).width;
      ctx.fillText(watermark, canvas.width - w - padding, canvas.height - 15);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.download = `message-${message.id}-${Date.now()}.png`;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
      });
    } catch (e) {
      console.error("Screenshot failed:", e);
      alert("Failed to capture screenshot.");
    } finally {
      setScreenshotLoading(null);
    }
  };

  // 🧭 Fetch + subscribe
  useEffect(() => {
    if (!userId) {
      setError("User not found");
      setLoading(false);
      return;
    }

    if (!messages && !hasFetchedRef.current) {
      (async () => {
        try {
          await fetchMessages(userId);
          hasFetchedRef.current = true;
        } catch {
          setError("Failed to load messages");
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }

    const unsub = subscribeToMessages(userId);

    // ✅ Always return a void function for cleanup
    return () => {
      if (typeof unsub === "function") {
        unsub();
      }
    };
  }, [userId, fetchMessages, subscribeToMessages, messages]);


  // 🔄 Manual refresh
  const handleRefresh = () => {
    if (userId) {
      setLoading(true);
      fetchMessages(userId).finally(() => setLoading(false));
    }
  };

  // 📎 Share profile link
  const handleShare = () => {
    const baseUrl = window.location.origin;
    const text = `${userName}'s Profile\n${baseUrl}/anon/${userId || ""}`;
    navigator.clipboard.writeText(text).then(() => alert("Link copied!"));
  };

  const profileUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/anon/${userId || ""}`;

  if (loading && !messages)
    return (
      <div className="h-screen bg-[#111111]">
        <Head>
          <title>{`${userName}'s Messages`}</title>
          <meta name="description" content={`${userName}'s anonymous messages`} />
        </Head>
        <Header />
        <main className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </main>
      </div>
    );

  if (error)
    return (
      <div className="h-screen bg-[#111111] text-center flex items-center justify-center">
        <Header />
        <p className="text-red-400">{error}</p>
      </div>
    );

  return (
    <div className="h-screen bg-[#111111]">
      <Head>
        <title>{`${userName}'s Messages`}</title>
        <meta name="description" content={`${userName}'s anonymous messages`} />
        <meta property="og:title" content={`${userName}'s Messages`} />
        <meta property="og:url" content={profileUrl} />
      </Head>

      <Header />

      <main className="overflow-y-auto h-full max-w-7xl mx-auto px-4 mt-10 md:mt-0 sm:px-6 lg:px-8 py-8 pb-[9rem] md:py-6">
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#111111] pb-2">
          <div className="flex items-center">
            <HiOutlineMail className="w-10 h-10 text-purple-500 mr-2" />
            <h2 className="text-2xl font-semibold text-white">Your Messages</h2>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className="bg-white/5 w-8 h-8 text-md rounded-full hover:bg-white/10 border border-white/10 flex items-center justify-center"
            >
              <HiOutlineRefresh className="w-4 h-4 text-gray-300" />
            </button>
            <button
              onClick={handleShare}
              className="bg-white/5 w-8 h-8 text-md rounded-full hover:bg-white/10 border border-white/10 flex items-center justify-center"
            >
              <HiOutlineShare className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {messages?.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-lg shadow p-4 text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <HiOutlineMail className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No messages yet</h3>
              <p className="text-gray-500 text-sm">
                Share your profile link to start receiving anonymous messages!
              </p>
            </div>
          ) : (
            messages?.map((message) => (
              <div
                key={message.id}
                className="bg-white/5 border border-white/10 rounded-lg shadow p-4 flex items-start justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-row space-x-2">
                    <div className="bg-purple-500 h-6 w-1 rounded-full" />
                    <div className="flex items-center text-purple-500 text-md mb-1">
                      <span>{message.id}</span>
                    </div>
                  </div>
                  <p className="text-gray-200 text-lg leading-relaxed break-words mb-2">{message.text}</p>
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
