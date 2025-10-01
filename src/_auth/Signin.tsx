import { useState, useRef } from "react";
import { auth, googleProvider, db } from "../lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";
import { useAuthStore } from "../store/authStore";
import { useUserStore } from "../store/userStore";
import { motion } from "framer-motion";
import type { User } from "../types";

// Function to generate a random username
const generateRandomUsername = () => {
  const adjectives = ["Cool", "Funny", "Brave", "Swift", "Clever", "Bold"];
  const nouns = ["Panda", "Tiger", "Eagle", "Fox", "Wolf", "Bear"];
  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 1000);
  return `${randomAdjective}${randomNoun}${randomNumber}`;
};

function Signin() {
  const [loading, setLoading] = useState(false);
  const [playbackDirection, setPlaybackDirection] = useState<"forward" | "reverse">("forward");
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const setAuthUser = useAuthStore((state) => state.setUser);
  const { setUser, subscribeToUser } = useUserStore();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Check if user document exists in Firestore
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      let userData: User;

      if (!userDoc.exists()) {
        // Create a new user document with all trial fields
        userData = {
          id: firebaseUser.uid,
          userName: generateRandomUsername(),
          email: firebaseUser.email || "",
          createdAt: Timestamp.now(),
          avatar: firebaseUser.photoURL || "",
          bio: "",
          points: "0", // Default points to "0"
          freeThreadsRemaining: 3, // Default free threads to 3
          hasSeenRefillPrompt: false, // Default to false
        };
        await setDoc(userDocRef, userData);
      } else {
        // Get existing user data
        userData = userDoc.data() as User;

        // Ensure all new fields exist for existing users
        let needsUpdate = false;

        if (!userData.points) {
          userData.points = "0";
          needsUpdate = true;
        }

        if (userData.freeThreadsRemaining === undefined) {
          userData.freeThreadsRemaining = 3;
          needsUpdate = true;
        }

        if (userData.hasSeenRefillPrompt === undefined) {
          userData.hasSeenRefillPrompt = false;
          needsUpdate = true;
        }

        // Update the document in Firestore if any fields were missing
        if (needsUpdate) {
          await setDoc(userDocRef, userData, { merge: true });
        }
      }

      // Set both auth and user data
      setAuthUser(firebaseUser);
      setUser(userData);

      // Start real-time subscription to user data
      subscribeToUser(firebaseUser.uid);

      navigate("/");
    } catch (error) {
      console.error("Error during Google login or user creation:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle video end to toggle playback direction
  const handleVideoEnd = () => {
    if (videoRef.current) {
      if (playbackDirection === "forward") {
        // Switch to reverse: set playbackRate to -1 and start from the end
        videoRef.current.playbackRate = -1;
        videoRef.current.currentTime = videoRef.current.duration;
        setPlaybackDirection("reverse");
        videoRef.current.play().catch((error) => console.error("Error playing video in reverse:", error));
      } else {
        // Switch to forward: set playbackRate to 1 and start from the beginning
        videoRef.current.playbackRate = 1;
        videoRef.current.currentTime = 0;
        setPlaybackDirection("forward");
        videoRef.current.play().catch((error) => console.error("Error playing video forward:", error));
      }
    }
  };

  return (
    <div className="h-dvh relative flex items-end p-4 overflow-x-hidden">
      {/* Background Video for Mobile */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover md:hidden"
        src="/assets/auth-bg.mp4"
        autoPlay
        muted
        playsInline
        aria-hidden="true"
        onEnded={handleVideoEnd}
        poster="/assets/images/auth-bg.jpeg"
      />
      {/* Static Background Image for Desktop */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat hidden md:block"
        style={{ backgroundImage: "url('/assets/images/auth-bg.jpeg')" }}
      />
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/5 backdrop-blur-sm z-0" />

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-grow justify-between">
        {/* Login Button */}
        <div className="mb-8">
          <motion.button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-black/20 border border-gray-500 backdrop-blur-sm hover:bg-black/30 transition-colors font-semibold py-3 rounded-2xl duration-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.95 }}
          >
            <div className="flex items-center justify-center space-x-3">
              {loading ? (
                <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin text-purple-400" />
              ) : (
                <FcGoogle className="w-6 h-6" />
              )}
              <span className="text-lg text-white">
                {loading ? "Signing in..." : "Continue with Google"}
              </span>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default Signin;