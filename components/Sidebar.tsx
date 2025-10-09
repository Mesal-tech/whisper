"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TbHomeFilled } from "react-icons/tb";
import { RiMessage3Fill } from "react-icons/ri";
import { BsPeopleFill } from "react-icons/bs";
import { MdLogout } from "react-icons/md";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useUserStore, useUsername, useUserPoints } from "@/store/userStore";

const tabs = [
  { name: "Home", path: "/", icon: TbHomeFilled },
  { name: "Rooms", path: "/rooms", icon: BsPeopleFill },
  { name: "Messages", path: "/messages", icon: RiMessage3Fill },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const setAuthUser = useAuthStore((state) => state.setUser);
  const username = useUsername();
  const userPoints = useUserPoints();
  const { clearUser, fetchUser, subscribeToUser } = useUserStore();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Fetch and subscribe to user data when logged in
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

  // Handle logout confirmation modal
  const handleLogoutClick = () => {
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

  const handleCancelLogout = () => setShowLogoutConfirm(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex sticky left-0 top-0 h-screen w-60 flex-col items-center lg:items-start py-6 px-4">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center lg:justify-start w-full">
          <img src="/assets/images/logo2.svg" alt="Whispers" className="h-10 w-auto" />
        </div>

        {/* Navigation */}
        <nav className="flex flex-col space-y-2 w-full">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path;
            const Icon = tab.icon;
            return (
              <button
                key={tab.path}
                onClick={() => router.push(tab.path)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 group w-full text-left ${
                  isActive
                    ? "bg-white/10 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <p>{tab.name}</p>
              </button>
            );
          })}
        </nav>

        {/* Bottom Section - User Info & Logout */}
        <div className="mt-auto w-full space-y-3">
          {/* User Info */}
          <div className="p-3 bg-white/5 rounded-xl flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10">
              <img
                src="/assets/images/shh.jpeg"
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">
                {username || "Loading..."}
              </p>
              <p className="text-xs text-purple-400 font-medium">
                {userPoints} points
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 rounded-xl transition-all duration-200 cursor-pointer hover:bg-gray-800"
          >
            <MdLogout className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
            onClick={handleCancelLogout}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-xl hover:border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 pb-4">
                <h3 className="text-lg font-medium text-white">Sign out of Whispers?</h3>
                <p className="text-sm text-gray-200">
                  You'll need to sign in again to access your account.
                </p>
              </div>
              <div className="px-6 pb-6 flex space-x-3">
                <button
                  onClick={handleCancelLogout}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLogout}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-full transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
