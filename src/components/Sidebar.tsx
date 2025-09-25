import { NavLink } from "react-router-dom";
import { TbHomeFilled } from "react-icons/tb";
import { RiMessage3Fill } from "react-icons/ri";
import { BsPeopleFill } from "react-icons/bs";
import { useAuthStore } from "../store/authStore";

const tabs = [
  { name: "Home", path: "/", icon: TbHomeFilled },
  { name: "Rooms", path: "/rooms", icon: BsPeopleFill },
  { name: "Messages", path: "/messages", icon: RiMessage3Fill },
];

export default function Sidebar() {
  const user = useAuthStore((state) => state.user);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex sticky left-0 top-0 h-screen w-60 flex-col items-center lg:items-start py-6 px-4">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center lg:justify-start w-full">
          <img src="/whispers.svg" alt="Whispers" className="h-10 w-auto" />
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
        <div className="mt-auto w-full p-3 bg-gray-800/50 rounded-xl flex items-center gap-3 hover:bg-gray-800 transition">
          <img
            src={user?.photoURL || "https://via.placeholder.com/60"}
            alt="User"
            className="w-12 h-12 rounded-full border-2 border-gray-200"
          />
          <div className="flex flex-col overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">
              {user?.displayName || "Anonymous"}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {user?.email || "no-email@example.com"}
            </p>
            {user?.points !== undefined && (
              <p className="text-xs text-yellow-400 font-medium">
                ⭐ {user.points} Points
              </p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
