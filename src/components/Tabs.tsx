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

export default function ResponsiveNavigation() {
  const user = useAuthStore((state) => state.user);
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-20 lg:w-20 bg-[#121212] flex-col items-center lg:items-start py-6 px-4 ">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center lg:justify-start w-10">
          <img src="/whispers.svg" alt="Whispers" className="h-10 w-auto" />
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col space-y-2 w-full">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center p-3 rounded-xl transition-all duration-200 group hover:bg-gray-800 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`
              }
            >
              <tab.icon className="h-6 w-6 flex-shrink-0" />
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto w-full">
          <img
            src={user?.photoURL || "https://via.placeholder.com/60"}
            alt="User"
            className="w-12 h-12 rounded-full border-2 border-gray-200"
          />
        </div>
      </aside>

      {/* Mobile Bottom Tabs - Pill Shape */}
      <nav className="md:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#121212] border-2 border-gray-500 rounded-full shadow-lg flex justify-center items-center h-16 px-6 z-50">
        <div className="flex items-center space-x-8">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center text-sm transition-colors ${
                  isActive ? "text-white" : "text-gray-500"
                }`
              }
            >
              <tab.icon className="h-8 w-8" />
              {/* <span className="text-xs mt-1">{tab.name}</span> */}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main content wrapper - add padding for sidebar on desktop */}
      <div className="md:ml-20 lg:ml-64 pb-24 md:pb-0">
        {/* Your main content goes here */}
      </div>
    </>
  );
}
