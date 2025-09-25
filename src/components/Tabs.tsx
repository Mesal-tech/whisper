import { NavLink } from "react-router-dom";
import { TbHomeFilled } from "react-icons/tb";
import { RiMessage3Fill } from "react-icons/ri";
import { BsPeopleFill } from "react-icons/bs";

const tabs = [
  { name: "Home", path: "/", icon: TbHomeFilled },
  { name: "Rooms", path: "/rooms", icon: BsPeopleFill },
  { name: "Messages", path: "/messages", icon: RiMessage3Fill },
];

export default function ResponsiveNavigation() {
  return (
    <>
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
    </>
  );
}