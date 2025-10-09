'use client'

import Header from "@/components/Header"; 
import {
  useUserStore,
  useUsername,
} from "@/store/userStore"; // Adjust path as needed
import { useEffect } from "react";
import { IoCopy } from "react-icons/io5";
import { motion } from "framer-motion";

function Home() {
  const userName = useUsername();
  const userId = useUserStore((state) => state.user?.id);
  const fetchUser = useUserStore((state) => state.fetchUser);

  useEffect(() => {
    if (userId) {
      fetchUser(userId);
    }
  }, [fetchUser, userId]);

  const profileUrl = `${window.location.origin}/anon/${userId || ""}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(profileUrl).catch((err) => {
      console.error("Failed to copy URL: ", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = profileUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: "Anonymous Profile",
      text: `Check out ${userName || "Anonymous"}'s profile!`,
      url: profileUrl,
    };

    try {
      // Check if native sharing is supported
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying to clipboard if native share isn't available
        const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        alert("Share link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing: ", err);
      // If sharing was cancelled or failed, don't show an error to the user
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center h-full">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Profile card */}
        <div className="text-center group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 h-full hover:border-white/20 hover:bg-white/10 transition-all duration-500 overflow-hidden">
          {/* Background gradient */}
          <motion.div
            className={`absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 transform-gpu will-change-transform transition opacity-3 blur-xl -z-10`}
            animate={{
              scale: [1, 1.02, 1],
              opacity: [0.03, 0.05, 0.03],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
            }}
          />

          <div className="flex justify-center mb-4">
            <div className="relative">
              {/* Gradient background behind image - perfectly sized */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg scale-96"></div>

              <div className="w-30 h-30 rounded-full overflow-hidden shadow-2xl relative z-10">
                <img
                  src="/assets/images/shh.jpeg"
                  alt={`${userName || "Anonymous"}'s Avatar`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {userName || "Anonymous"}
          </h2>

          {/* URL with copy button */}
          <div className="flex items-center text-center p-2 my-2 bg-white/5 rounded-xl border border-white/10 group-hover:bg-white/10 transition-colors">
            <p className="text-gray-300 text-sm flex-1 mr-2 truncate">
              {profileUrl}
            </p>
            <button
              onClick={handleCopyUrl}
              className="text-white p-2 rounded transition-all duration-200 flex-shrink-0"
              title="Copy URL"
            >
              <IoCopy size={20} />
            </button>
          </div>

          <button
            onClick={handleShare}
            className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-10 rounded-full transition-all duration-200 mb-4 text-lg"
          >
            Share My Profile!
          </button>

          <p className="text-md text-gray-200">
            <span className="text-2xl"> Unleash the fun!</span> 🎉 <br /> Share
            your profile link and catch the wave of responses from your pals! 🚀
          </p>
        </div>
      </main>
    </div>
  );
}

export default Home;