import { useState } from "react";
import { auth, googleProvider, db } from "../lib/firebase";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  fetchSignInMethodsForEmail
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";
import { RiKey2Fill } from "react-icons/ri";
import { useAuthStore } from "../store/authStore";
import { useUserStore } from "../store/userStore";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import type { User } from "../types";
import generateRandomUsername from "./generateUsername.ts";

// Function to process Firebase error messages into human-readable format
const processErrorMessage = async (error: unknown, email?: string): Promise<string> => {
  if (error instanceof Error) {
    const firebaseError = error as { code?: string; message: string };
    switch (firebaseError.code) {
      case "auth/invalid-email":
        return "The email address is not valid. Please check and try again.";
      case "auth/user-not-found":
        return "No account found with this email. Please sign up or try another email.";
      case "auth/wrong-password":
      case "auth/invalid-credential":
        if (email) {
          try {
            const signInMethods = await fetchSignInMethodsForEmail(auth, email);
            if (signInMethods.includes("google.com")) {
              return "This email is registered with Google. Please use Google Sign-In.";
            }
            return "Invalid email or password. Please check your credentials and try again.";
          } catch (fetchError) {
            console.error("Error fetching sign-in methods:", fetchError);
            return "Invalid email or password. Please check your credentials and try again.";
          }
        }
        return "Invalid email or password. Please check your credentials and try again.";
      case "auth/email-already-in-use":
        return "This email is already registered. Please sign in or use another email.";
      case "auth/weak-password":
        return "Your password is too weak. Please use at least 6 characters.";
      case "auth/admin-restricted-operation":
        return "Anonymous sign-in is disabled. Please use Google or Email to sign in.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      case "auth/popup-closed-by-user":
        return "The sign-in popup was closed. Please try again.";
      default:
        return firebaseError.message || "An error occurred. Please try again.";
    }
  }
  return "An unexpected error occurred. Please try again.";
};

function Signin() {
  const [loadingStates, setLoadingStates] = useState({
    email: false,
    google: false,
    passkey: false,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const setAuthUser = useAuthStore((state) => state.setUser);
  const { setUser, subscribeToUser } = useUserStore();

  // Handle user creation or update in Firestore
  const handleUserSetup = async (firebaseUser: any): Promise<void> => {
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      let userData: User;

      if (!userDoc.exists()) {
        // Create a new user document with all trial fields
        userData = {
          id: firebaseUser.uid,
          userName: await generateRandomUsername(), // Use the new async function
          email: firebaseUser.email || "",
          createdAt: Timestamp.now(),
          avatar: firebaseUser.photoURL || "",
          bio: "",
          points: "0",
          freeThreadsRemaining: 3,
          hasSeenRefillPrompt: false,
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
    } catch (err) {
      console.error("Error during user setup:", err);
      toast.error(await processErrorMessage(err));
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    setLoadingStates((prev) => ({ ...prev, google: true }));
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleUserSetup(result.user);
    } catch (err) {
      console.error("Error during Google login:", err);
      toast.error(await processErrorMessage(err));
    } finally {
      setLoadingStates((prev) => ({ ...prev, google: false }));
    }
  };

  // Handle Email/Password login or signup
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingStates((prev) => ({ ...prev, email: true }));
    try {
      let result;
      if (isSignUp) {
        result = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }
      await handleUserSetup(result.user);
    } catch (err) {
      console.error("Error during email login/signup:", err);
      toast.error(await processErrorMessage(err, email));
    } finally {
      setLoadingStates((prev) => ({ ...prev, email: false }));
    }
  };

  // Handle Passkey login (WebAuthn)
  const handlePasskeyLogin = async () => {
    setLoadingStates((prev) => ({ ...prev, passkey: true }));
    try {
      if (!window.PublicKeyCredential) {
        throw new Error("Passkeys are not supported by this browser");
      }

      let firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        try {
          // Attempt to create an anonymous user account for the passkey
          const anonymousResult = await signInAnonymously(auth);
          firebaseUser = anonymousResult.user;

          // Note: In a production environment, you should:
          // 1. Send the passkey credential to your server for verification
          // 2. Link the verified passkey to the user account using linkWithCredential
          await handleUserSetup(firebaseUser);
        } catch (anonError) {
          console.error("Anonymous sign-in failed:", anonError);
          throw new Error(
            "Anonymous sign-in is disabled. Please use Google or Email to sign in."
          );
        }
      } else {
        // Existing user found, proceed with setup
        await handleUserSetup(firebaseUser);
      }
    } catch (err) {
      console.error("Error during passkey login:", err);
      toast.error(await processErrorMessage(err));
    } finally {
      setLoadingStates((prev) => ({ ...prev, passkey: false }));
    }
  };

  return (
    <div className="h-[100dvh] bg-black relative flex items-center justify-center p-2 md:p-4 overflow-x-hidden">
      {/* Content */}
      <div className="text-center group relative md:bg-white/5 backdrop-blur-sm md:border border-white/10 rounded-2xl p-2 md:p-8 h-fit transition-all duration-500 space-y-6 overflow-hidden">
        <div className="max-w-[15rem] mx-auto mb-8">
          <img
            src="/assets/images/logow.svg"
            alt="Logo"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailLogin} className="mb-6 space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full p-3 rounded-lg bg-black/20 border border-gray-500 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              disabled={loadingStates.email}
              required
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-3 rounded-lg bg-black/20 border border-gray-500 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              disabled={loadingStates.email}
              required
            />
          </div>
          <motion.button
            type="submit"
            disabled={loadingStates.email}
            className="w-full bg-black/20 border border-gray-500 backdrop-blur-sm hover:bg-black/30 transition-colors font-semibold p-3 rounded-2xl duration-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: loadingStates.email ? 1 : 1.05 }}
            whileTap={{ scale: loadingStates.email ? 1 : 0.95 }}
          >
            <div className="flex items-center justify-center space-x-3">
              {loadingStates.email ? (
                <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin text-purple-400" />
              ) : null}
              <span className="text-lg text-white">
                {loadingStates.email ? "Processing..." : (isSignUp ? "Sign Up with Email" : "Sign In with Email")}
              </span>
            </div>
          </motion.button>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-purple-400 hover:underline"
            disabled={loadingStates.email}
          >
            {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
          </button>
        </form>

        {/* Other Login Buttons */}
        <div className="space-y-4">
          {/* Google Login */}
          <motion.button
            onClick={handleGoogleLogin}
            disabled={loadingStates.google}
            className="w-full bg-black/20 border border-gray-500 backdrop-blur-sm hover:bg-black/30 transition-colors font-semibold p-3 rounded-2xl duration-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: loadingStates.google ? 1 : 1.05 }}
            whileTap={{ scale: loadingStates.google ? 1 : 0.95 }}
          >
            <div className="flex items-center justify-center space-x-3">
              {loadingStates.google ? (
                <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin text-purple-400" />
              ) : (
                <FcGoogle className="w-6 h-6" />
              )}
              <span className="text-lg text-white">
                {loadingStates.google ? "Signing in..." : "Continue with Google"}
              </span>
            </div>
          </motion.button>

          {/* Passkey Login */}
          <motion.button
            onClick={handlePasskeyLogin}
            disabled={loadingStates.passkey || !window.PublicKeyCredential}
            className="w-full bg-black/20 border border-gray-500 backdrop-blur-sm hover:bg-black/30 transition-colors font-semibold p-3 rounded-2xl duration-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: loadingStates.passkey ? 1 : 1.05 }}
            whileTap={{ scale: loadingStates.passkey ? 1 : 0.95 }}
          >
            <div className="flex items-center justify-center space-x-3">
              {loadingStates.passkey ? (
                <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin text-purple-400" />
              ) : (
                <RiKey2Fill className="w-6 h-6 text-white" />
              )}
              <span className="text-lg text-white">
                {loadingStates.passkey ? "Signing in..." : "Continue with Passkey"}
              </span>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default Signin;