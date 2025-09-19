import { Timestamp } from "firebase/firestore";

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
  timestamp: Timestamp;
}
