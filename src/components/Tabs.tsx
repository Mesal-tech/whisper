import { NavLink } from "react-router-dom";
import { TbHomeFilled } from "react-icons/tb";
import { RiMessage3Fill } from "react-icons/ri";
import { HiUsers } from "react-icons/hi2";

const tabs = [
  { name: "Home", path: "/", icon: TbHomeFilled },
  { name: "Messages", path: "/messages", icon: RiMessage3Fill },
  { name: "Rooms", path: "/rooms", icon: HiUsers },
];

export default function BottomTabs() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t shadow-md flex justify-around items-center h-16 rounded-tl-2xl rounded-tr-2xl">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center text-sm ${
              isActive ? "text-white" : "text-gray-500"
            }`
          }
        >
          <tab.icon className="h-7 w-7" />
          <span>{tab.name}</span>
        </NavLink>
      ))}
    </nav>
  );
}
