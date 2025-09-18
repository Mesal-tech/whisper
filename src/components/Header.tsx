import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { MdLogout, MdClose } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { motion, AnimatePresence } from "framer-motion";

export default function Header() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth/signin");
    }
  }, [user, navigate]);

  // Close popup when clicking outside
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

  if (!user) {
    return null; // Should redirect via useEffect, this is a fallback
  }

  const handleLogoutClick = () => {
    setShowProfilePopup(false);
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      await signOut(auth);
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
      <header className="fixed top-0 w-full z-50 bg-black shadow-sm border-b md:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 select-none">
            <img
              src="/assets/images/logo2.svg"
              alt="Whispers"
              className="h-10 w-auto"
            />

            <div className="relative">
              <img
                src={user.photoURL || "https://via.placeholder.com/40"}
                alt={user.displayName || "User"}
                className="profile-image w-10 h-10 rounded-full border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors"
                onClick={() => setShowProfilePopup(!showProfilePopup)}
              />

              {/* Profile Popup */}
              <AnimatePresence>
                {showProfilePopup && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="profile-popup absolute right-0 top-12 bg-black rounded-xl shadow-lg border border-white w-70 z-50"
                  >
                    {/* Profile Header */}
                    <div className="p-4 border-b">
                      <div className="flex items-center space-x-3">
                        <img
                          src={
                            user.photoURL || "https://via.placeholder.com/60"
                          }
                          alt="User"
                          className="w-12 h-12 rounded-full border-2 border-gray-200"
                        />
                        <div className="flex-1">
                          <p className="text-lg font-medium text-white">Anon</p>
                          <p className="text-[12px] text-gray-300 break-all">
                            {user.email}
                          </p>
                        </div>
                        <button
                          onClick={() => setShowProfilePopup(false)}
                          className="p-1 bg-gray-100 rounded-full"
                        >
                          <MdClose className="w-4 h-4 text-black" />
                        </button>
                      </div>
                    </div>

                    {/* Logout Button */}
                    <div className="p-4">
                      <button
                        onClick={handleLogoutClick}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
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
      </header>

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
