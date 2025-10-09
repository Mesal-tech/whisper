"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { MdLogout, MdClose } from "react-icons/md";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useUserStore, useUsername, useUserPoints } from "@/store/userStore";
import { motion, AnimatePresence } from "framer-motion";

export default function Header() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setAuthUser = useAuthStore((state) => state.setUser);
  const username = useUsername();
  const userPoints = useUserPoints();
  const { clearUser, fetchUser, subscribeToUser } = useUserStore();
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ✅ Fetch user data when mounted
  useEffect(() => {
    if (user && !username) {
      fetchUser(user.uid);
    }

    if (user) {
      const unsubscribe = subscribeToUser(user.uid);
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user, username, fetchUser, subscribeToUser]);

  // ✅ Redirect to sign-in if user is missing
  useEffect(() => {
    if (!user) {
      router.push("/auth/signin");
    }
  }, [user, router]);

  // ✅ Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (
        showProfilePopup &&
        !event.target.closest(".profile-popup") &&
        !event.target.closest(".profile-image")
      ) {
        setShowProfilePopup(false);
      }
    };

    if (showProfilePopup) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showProfilePopup]);

  if (!user) return null; // Prevent UI flash before redirect

  const handleLogoutClick = () => {
    setShowProfilePopup(false);
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      await signOut(auth);
      setAuthUser(null);
      clearUser();
      router.push("/auth/signin");
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setShowLogoutConfirm(false);
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-[#111111] md:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 select-none">
            <img
              src="/assets/images/logo2.svg"
              alt="Whispers"
              className="h-10 w-auto cursor-pointer"
              onClick={() => router.push("/")}
            />

            <div className="flex items-center space-x-3">
              {/* Points Display */}
              <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                {userPoints} pts
              </div>

              {/* Profile Picture */}
              <div className="relative">
                <div
                  className="profile-image w-10 h-10 rounded-full border-2 border-white/10 cursor-pointer hover:border-white/20 transition-colors overflow-hidden"
                  onClick={() => setShowProfilePopup(!showProfilePopup)}
                >
                  <img
                    src="/assets/images/shh.jpeg"
                    alt={user.displayName || "User"}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Profile Popup */}
                <AnimatePresence>
                  {showProfilePopup && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="profile-popup absolute right-0 top-12 bg-black/5 backdrop-blur-sm rounded-xl shadow-lg border border-white/10 w-70 z-50"
                    >
                      {/* Profile Header */}
                      <div className="p-4 border-b border-white/10">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10">
                            <img
                              src="/assets/images/shh.jpeg"
                              alt="User"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-lg font-medium text-white">
                              {username || "Loading..."}
                            </p>
                            <p className="text-sm text-purple-400 font-medium">
                              {userPoints} points
                            </p>
                          </div>
                          <button
                            onClick={() => setShowProfilePopup(false)}
                            className="p-1 bg-white/10 rounded-full"
                          >
                            <MdClose className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>

                      {/* Logout Button */}
                      <div className="p-2">
                        <button
                          onClick={handleLogoutClick}
                          className="w-full flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-300 cursor-pointer transition-colors"
                        >
                          <MdLogout className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 bg-opacity-50 z-[100] flex items-center justify-center p-4"
              onClick={handleCancelLogout}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 h-fit hover:border-white/20 transition-all duration-500 overflow-hidden shadow-xl max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 pb-4">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h3 className="text-lg font-medium text-white">
                        Sign out of Whispers?
                      </h3>
                      <p className="text-sm text-gray-200">
                        You'll need to sign in again to access your account.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 flex space-x-3">
                  <button
                    onClick={handleCancelLogout}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmLogout}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-full cursor-pointer transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}