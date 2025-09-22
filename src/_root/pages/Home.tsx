import Header from "../../components/Header";
import {
  useUserStore,
  useUsername,
  useUserAvatar,
} from "../../store/userStore"; // Adjust path as needed
import { useEffect } from "react";
import { IoCopy } from "react-icons/io5";

function Home() {
  const userName = useUsername();
  const userId = useUserStore((state) => state.user?.id);
  const avatar = useUserAvatar();
  const fetchUser = useUserStore((state) => state.fetchUser);

  useEffect(() => {
    if (userId) {
      fetchUser(userId);
    }
  }, [fetchUser, userId]);

  const profileUrl = `${window.location.origin}/anon/${userId || ""}`;

  const handleCopyUrl = () => {
    navigator.clipboard
      .writeText(profileUrl)
      .then(() => {
        alert("URL copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy URL: ", err);
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = profileUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("URL copied to clipboard!");
      });
  };

  const handleShare = async () => {
    const shareData = {
      title: `${userName || "Anonymous"}'s Profile`,
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
    <div className="h-screen bg-[#111111]">
      <Header />
      <main className="max-w-7xl mx-auto px-4 mt-20 sm:px-6 lg:px-8 py-8 flex items-center justify-center w-full">
        <div className="bg-[#1F1F22] rounded-2xl shadow p-6 w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              {/* Gradient background behind image - perfectly sized */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg scale-96"></div>
              <img
                src={avatar || "/assets/icons/profile-placeholder.svg"}
                alt={`${userName || "Anonymous"}'s Avatar`}
                className="w-30 h-30 rounded-full  shadow-2xl relative z-10"
              />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {userName || "Anonymous"}
          </h2>

          {/* URL with copy button */}
          <div className="bg-[#2A2A2D] rounded-xl p-3 mb-4 flex items-center justify-between">
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
