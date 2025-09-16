import { useState, useEffect } from "react";
import { auth, googleProvider } from "./lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { MdLogout } from "react-icons/md";
import { FcGoogle } from "react-icons/fc";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Listen to authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // No need to setUser here - onAuthStateChanged will handle it
    } catch (error) {
      console.error("Error during Google login:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // No need to setUser here - onAuthStateChanged will handle it
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // Show loading spinner while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex flex-col items-center space-y-4">
            <AiOutlineLoading3Quarters className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    // Main app content after login
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header/Navigation */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">Whispers</h1>

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

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Main App</h2>
            <p className="text-gray-600">This is where stuff will go</p>
          </div>
        </main>
      </div>
    );
  }

  // Login screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-end p-4">
      <div className="mb-8">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <div className="flex items-center justify-center space-x-3">
            {loading ? (
              <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin text-blue-500" />
            ) : (
              <FcGoogle className="w-5 h-5" />
            )}
            <span className="text-lg">
              {loading ? "Signing in..." : "Continue with Google"}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

export default App;
