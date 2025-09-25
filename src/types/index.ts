import { Timestamp } from "firebase/firestore";

export interface User {
  id: string;
  userName: string;
  email: string;
  createdAt: Timestamp;
  avatar?: string;
  bio?: string;
  points: string;
  freeThreadsRemaining: number;
  hasSeenRefillPrompt: boolean;
}

export interface AnonymousMessage {
  id: string;
  text: string;
  timestamp: Timestamp;
  anonymous: boolean;
}

export interface Room {
  id: string;
  name: string;
  bio: string;
  creatorId: string;
  createdAt: Timestamp;
  lastMessage: string;
  timestamp: Timestamp;
  avatar: string;
  unreadCount?: number;
  members: string[];
}

export interface Message {
  id: string;
  text: string;
  userId: string;
  userName?: string; // Optional username field for display
  timestamp: Timestamp;
  messageType: "message" | "thread";
  replyTo?: string | null;
}

export interface ThreadReply {
  id: string;
  text: string;
  userId: string;
  timestamp: Timestamp;
  threadId: string; // Reference to the parent thread message
}
