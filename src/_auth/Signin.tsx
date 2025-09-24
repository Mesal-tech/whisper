import { useState } from "react";
import { auth, googleProvider, db } from "../lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";
import { useAuthStore } from "../store/authStore";
import { useUserStore } from "../store/userStore";
import { motion, AnimatePresence } from "framer-motion";
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
  const navigate = useNavigate();
  const setAuthUser = useAuthStore((state) => state.setUser);
  const { setUser, subscribeToUser } = useUserStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [animationDirection, setAnimationDirection] = useState(0);

  const slides = [
    {
      image:
        "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300&h=400&fit=crop&crop=entropy&auto=format",
      text: "Welcome to our amazing app",
    },
    {
      image:
        "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=300&h=400&fit=crop&crop=entropy&auto=format",
      text: "Connect with friends worldwide",
    },
    {
      image:
        "https://images.unsplash.com/photo-1758078911728-f697564fb116?w=300&h=400&fit=crop&crop=entropy&auto=format",
      text: "Share your moments",
    },
  ];

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

  // Function to calculate the proper direction for circular carousel
  const calculateDirection = (
    from: number,
    to: number,
    totalSlides: number
  ) => {
    const diff = to - from;
    const absDiff = Math.abs(diff);

    if (absDiff <= totalSlides / 2) {
      return diff > 0 ? 1 : -1;
    } else {
      return diff > 0 ? -1 : 1;
    }
  };
  //@ts-ignore
  const handleDragEnd = (event: any, info: any) => {
    const { offset, velocity } = info;
    const swipeThreshold = 50;
    const velocityThreshold = 500;

    if (
      Math.abs(offset.x) > swipeThreshold ||
      Math.abs(velocity.x) > velocityThreshold
    ) {
      const currentIndex = currentSlide;
      let newIndex;

      if (offset.x > 0 || velocity.x > velocityThreshold) {
        // Swiped right - go to previous slide
        newIndex = (currentIndex - 1 + slides.length) % slides.length;
      } else if (offset.x < 0 || velocity.x < -velocityThreshold) {
        // Swiped left - go to next slide
        newIndex = (currentIndex + 1) % slides.length;
      }

      if (newIndex !== undefined) {
        const direction = calculateDirection(
          currentIndex,
          newIndex,
          slides.length
        );
        setAnimationDirection(direction);
        setCurrentSlide(newIndex);
      }
    }
  };

  const handleProgressClick = (index: number) => {
    if (index !== currentSlide) {
      const direction = calculateDirection(currentSlide, index, slides.length);
      setAnimationDirection(direction);
      setCurrentSlide(index);
    }
  };

  const slideVariants = {
    initial: (direction: number) => ({
      opacity: 0,
      x: direction * 300,
    }),
    animate: {
      opacity: 1,
      x: 0,
    },
    exit: (direction: number) => ({
      opacity: 0,
      x: direction * -300,
    }),
  };

  return (
    <div className="h-dvh bg-black flex flex-col p-4 overflow-x-hidden">
      {/* Carousel Section */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait" custom={animationDirection}>
          <motion.div
            key={currentSlide}
            custom={animationDirection}
            className="flex flex-col items-center text-white text-center select-none cursor-grab active:cursor-grabbing"
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeOut" }}
            drag="x"
            dragElastic={0.1}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 0.98 }}
            style={{ touchAction: "pan-y pinch-zoom" }}
          >
            <img
              src={slides[currentSlide].image}
              alt={`Slide ${currentSlide + 1}`}
              className="w-full max-w-xs h-auto mb-4 rounded-lg pointer-events-none select-none"
              draggable={false}
            />
            <p className="text-lg pointer-events-none select-none">
              {slides[currentSlide].text}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-center space-x-2 mb-4">
        {slides.map((_, index) => (
          <div
            key={index}
            className={`h-1 w-8 rounded-full cursor-pointer transition-colors duration-300 ${
              index === currentSlide
                ? "bg-yellow-400"
                : "bg-gray-500 hover:bg-gray-400"
            }`}
            onClick={() => handleProgressClick(index)}
          />
        ))}
      </div>

      {/* Login Button */}
      <div className="mb-8">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-black/20 border border-gray-500 backdrop-blur-sm hover:bg-black/30 transition-colors font-semibold py-3 rounded-2xl duration-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <div className="flex items-center justify-center space-x-3">
            {loading ? (
              <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin text-blue-500" />
            ) : (
              <FcGoogle className="w-6 h-6" />
            )}
            <span className="text-lg text-white">
              {loading ? "Signing in..." : "Continue with Google"}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

export default Signin;
