import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { TbHomeFilled } from "react-icons/tb";
import { RiMessage3Fill } from "react-icons/ri";
import { BsPeopleFill } from "react-icons/bs";
import { MdLogout } from "react-icons/md";
import { useAuthStore } from "../store/authStore";
import { useUserStore, useUsername, useUserPoints } from "../store/userStore";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";

const tabs = [
  { name: "Home", path: "/", icon: TbHomeFilled },
  { name: "Rooms", path: "/rooms", icon: BsPeopleFill },
  { name: "Messages", path: "/messages", icon: RiMessage3Fill },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const username = useUsername(); // Get username from userStore
  const userPoints = useUserPoints(); // Get user points from userStore
  const { clearUser, fetchUser, subscribeToUser } = useUserStore(); // Get userStore actions
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Initialize user data when component mounts
  useEffect(() => {
    if (user && !username) {
      // If we have auth user but no username, fetch user data
      fetchUser(user.uid);
    }

    if (user) {
      // Subscribe to real-time user updates
      const unsubscribe = subscribeToUser(user.uid);
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user, username, fetchUser, subscribeToUser]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      await signOut(auth);
      clearUser(); // Clear user data from store on logout
      navigate("/auth/signin");
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
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex sticky left-0 top-0 h-screen w-60 flex-col items-center lg:items-start py-6 px-4">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center lg:justify-start w-full">
          <img
            src="/assets/images/logo2.svg"
            alt="Whispers"
            className="h-10 w-auto"
          />
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col space-y-2 w-full">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 group hover:bg-gray-800 ${
                  isActive
                    ? "bg-white/10 text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`
              }
            >
              <tab.icon className="h-5 w-5 flex-shrink-0" />
              <p>{tab.name}</p>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section - User Profile */}
        <div className="mt-auto w-full space-y-3">
          {/* User Info */}
          <div className="p-3 bg-gray-800/50 rounded-xl flex items-center gap-3">
            <img
              src={user?.photoURL || "https://via.placeholder.com/60"}
              alt="User"
              className="w-12 h-12 rounded-full border-2 border-gray-200"
            />
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
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-400 bg-red-900/20 hover:bg-red-900/30 rounded-xl transition-all duration-200 border border-red-900/30 hover:border-red-900/50"
          >
            <MdLogout className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4"
              onClick={handleCancelLogout}
            >
              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-black rounded-lg shadow-xl max-w-md w-full border border-white"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
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

                {/* Modal Actions */}
                <div className="px-6 pb-6 flex space-x-3">
                  <button
                    onClick={handleCancelLogout}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmLogout}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
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
