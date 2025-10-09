"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  auth,
  googleProvider,
  db
} from "@/lib/firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  fetchSignInMethodsForEmail,
  User
} from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";
import { RiKey2Fill } from "react-icons/ri";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import generateRandomUsername from "@/lib/utils/generateUsername";
import { FirebaseError } from "firebase/app"; // <-- import the FirebaseError type

// If you want to narrow message type return explicitly
async function processErrorMessage(error: unknown, email?: string): Promise<string> {
  // Prefer handling FirebaseError explicitly
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return "The email address is not valid. Please check and try again.";
      case "auth/user-not-found":
        return "No account found with this email. Please sign up or try another email.";
      case "auth/wrong-password":
      case "auth/invalid-credential":
        if (email) {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods.includes("google.com"))
              return "This email is registered with Google. Please use Google Sign-In.";
            return "Invalid email or password. Please check your credentials and try again.";
          } catch {
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
        return error.message || "An error occurred. Please try again.";
    }
  }

  // If it's a regular Error, return the message.
  if (error instanceof Error) {
    return error.message || "An error occurred. Please try again.";
  }

  // Unknown error shape — return a safe generic message.
  return "An unexpected error occurred. Please try again.";
}

export default function Signin() {
  const router = useRouter();
  const [loadingStates, setLoadingStates] = useState({
    email: false,
    google: false,
    passkey: false,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const setAuthUser = useAuthStore((state) => state.setUser);
  const { setUser, subscribeToUser } = useUserStore();

  // Note: make firebaseUser typed as User (non-null) — callers already ensure user exists
  const handleUserSetup = async (firebaseUser: User) => {
    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userRef);
      let userData: any;

      if (!userDoc.exists()) {
        userData = {
          id: firebaseUser.uid,
          userName: await generateRandomUsername(),
          email: firebaseUser.email || "",
          createdAt: Timestamp.now(),
          avatar: firebaseUser.photoURL || "",
          bio: "",
          points: "0",
          freeThreadsRemaining: 3,
          hasSeenRefillPrompt: false,
        };
        await setDoc(userRef, userData);
      } else {
        userData = userDoc.data();
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
        if (needsUpdate) await setDoc(userRef, userData, { merge: true });
      }

      setAuthUser(firebaseUser);
      setUser(userData);
      subscribeToUser(firebaseUser.uid);

      router.push("/");
    } catch (err) {
      console.error("Error during user setup:", err);
      const message = await processErrorMessage(err);
      toast.error(message);
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingStates((p) => ({ ...p, google: true }));
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // result.user is typed by firebase as User
      await handleUserSetup(result.user as User);
    } catch (err) {
      console.error("Google login error:", err);
      toast.error(await processErrorMessage(err));
    } finally {
      setLoadingStates((p) => ({ ...p, google: false }));
    }
  };

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingStates((p) => ({ ...p, email: true }));
    try {
      let result;
      if (isSignUp)
        result = await createUserWithEmailAndPassword(auth, email, password);
      else result = await signInWithEmailAndPassword(auth, email, password);

      // result.user is a User
      await handleUserSetup(result.user as User);
    } catch (err) {
      console.error("Email login error:", err);
      toast.error(await processErrorMessage(err, email));
    } finally {
      setLoadingStates((p) => ({ ...p, email: false }));
    }
  };

  const handlePasskeyLogin = async () => {
    setLoadingStates((p) => ({ ...p, passkey: true }));
    try {
      if (typeof window === "undefined" || !window.PublicKeyCredential)
        throw new Error("Passkeys not supported by this browser");

      let firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        const anonResult = await signInAnonymously(auth);
        firebaseUser = anonResult.user;
        if (!firebaseUser) throw new Error("Failed to create anonymous user");
        await handleUserSetup(firebaseUser as User);
      } else {
        await handleUserSetup(firebaseUser as User);
      }
    } catch (err) {
      console.error("Passkey login error:", err);
      toast.error(await processErrorMessage(err));
    } finally {
      setLoadingStates((p) => ({ ...p, passkey: false }));
    }
  };

  return (
    <div className="h-[100dvh] bg-black relative flex items-center justify-center p-2 md:p-4 overflow-x-hidden">
      <div className="text-center group relative md:bg-white/5 backdrop-blur-sm md:border border-white/10 rounded-2xl p-2 md:p-8 h-fit transition-all duration-500 space-y-6 overflow-hidden">
        <div className="max-w-[15rem] mx-auto mb-8">
          <img src="/assets/images/logow.svg" alt="Logo" className="w-full h-full object-cover" />
        </div>

        {/* Email/Password */}
        <form onSubmit={handleEmailLogin} className="mb-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-black/20 border border-gray-500 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            disabled={loadingStates.email}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-lg bg-black/20 border border-gray-500 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            disabled={loadingStates.email}
            required
          />

          <motion.button
            type="submit"
            disabled={loadingStates.email}
            whileHover={{ scale: loadingStates.email ? 1 : 1.05 }}
            whileTap={{ scale: loadingStates.email ? 1 : 0.95 }}
            className="w-full bg-black/20 border border-gray-500 backdrop-blur-sm hover:bg-black/30 transition-colors font-semibold p-3 rounded-2xl duration-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center space-x-3">
              {loadingStates.email && (
                <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin text-purple-400" />
              )}
              <span className="text-lg text-white">
                {loadingStates.email
                  ? "Processing..."
                  : isSignUp
                    ? "Sign Up with Email"
                    : "Sign In with Email"}
              </span>
            </div>
          </motion.button>

          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={loadingStates.email}
            className="text-sm text-purple-400 hover:underline"
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
            whileHover={{ scale: loadingStates.google ? 1 : 1.05 }}
            whileTap={{ scale: loadingStates.google ? 1 : 0.95 }}
            className="w-full bg-black/20 border border-gray-500 backdrop-blur-sm hover:bg-black/30 transition-colors font-semibold p-3 rounded-2xl duration-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Passkey */}
          <motion.button
            onClick={handlePasskeyLogin}
            disabled={
              loadingStates.passkey ||
              (typeof window !== "undefined" && !window.PublicKeyCredential)
            }
            whileHover={{ scale: loadingStates.passkey ? 1 : 1.05 }}
            whileTap={{ scale: loadingStates.passkey ? 1 : 0.95 }}
            className="w-full bg-black/20 border border-gray-500 backdrop-blur-sm hover:bg-black/30 transition-colors font-semibold p-3 rounded-2xl duration-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
