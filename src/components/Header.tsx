import { useEffect } from "react";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { MdLogout } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Header() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) {
      navigate("/auth/signin");
    }
  }, [user, navigate]);

  if (!user) {
    return null; // Should redirect via useEffect, this is a fallback
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/auth/signin");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };
  return (
    <header className="bg-black shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <h1 className="text-2xl font-bold text-white">Whispers</h1>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <img
                src={user.photoURL || "https://via.placeholder.com/40"}
                alt={user.displayName || "User"}
                className="w-10 h-10 rounded-full border-2 border-gray-200"
              />
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user.displayName || "User"}
                </p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <MdLogout className="w-4 h-4" />
              <span className="hidden sm:block">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
