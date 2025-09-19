import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../../lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import type { Room, Message } from "../../types";

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

function RoomChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!id) return;

    // Fetch room details
    const roomUnsub = onSnapshot(doc(db, "rooms", id), (docSnap) => {
      if (docSnap.exists()) {
        setRoom({ id: docSnap.id, ...docSnap.data() } as Room);
      } else {
        // Handle non-existent room
        navigate("/rooms");
      }
    });

    // Fetch messages
    const messagesQuery = query(
      collection(db, `rooms/${id}/messages`),
      orderBy("timestamp", "asc")
    );
    const messagesUnsub = onSnapshot(messagesQuery, (snap) => {
      setMessages(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Message))
      );
    });

    return () => {
      roomUnsub();
      messagesUnsub();
    };
  }, [id, navigate]);

  const sendMessage = async () => {
    if (!text || !id) return;
    const user = auth.currentUser;
    if (!user) {
      navigate("/auth/signin");
      return;
    }
    try {
      // Add message to subcollection
      await addDoc(collection(db, `rooms/${id}/messages`), {
        text,
        userId: user.uid,
        timestamp: serverTimestamp(),
      });

      // Update room's lastMessage and timestamp
      await updateDoc(doc(db, "rooms", id), {
        lastMessage: `~anon: ${text.slice(0, 20)}${
          text.length > 20 ? "..." : ""
        }`,
        timestamp: serverTimestamp(),
      });

      setText("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (!room) {
    return (
      <div className="bg-black min-h-screen text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white flex flex-col">
      {/* Header */}
      <div className="bg-black flex items-center p-4 border-b border-gray-800">
        <button
          onClick={() => navigate("/rooms")}
          className="text-gray-400 hover:text-white mr-4"
        >
          Back
        </button>
        <h1 className="text-2xl font-semibold">{room.name}</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.userId === auth.currentUser?.uid
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs p-3 rounded-lg ${
                msg.userId === auth.currentUser?.uid
                  ? "bg-blue-500"
                  : "bg-gray-800"
              }`}
            >
              <p className="text-sm">~anon: {msg.text}</p>
              <span className="text-xs text-gray-400">
                {msg.timestamp ? timeAgo(msg.timestamp.toDate()) : ""}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="bg-black p-4 border-t border-gray-800 flex items-center">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 bg-gray-900 text-white p-3 rounded-l-lg focus:outline-none"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-3 rounded-r-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default RoomChat;
