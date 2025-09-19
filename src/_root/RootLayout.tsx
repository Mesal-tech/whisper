// src/_root/RootLayout.tsx
import { Outlet, useLocation } from "react-router-dom";
import Tabs from "../components/Tabs";

export default function RootLayout() {
  const location = useLocation();

  const routesWithoutTabs = ["/rooms/"];
  const hideTabs = routesWithoutTabs.some((route) =>
    location.pathname.startsWith(route)
  );

  return (
    <div className="h-screen overflow-hidden">
      {/* Main content area (fills available space between header + tabs) */}
      <Outlet />

      {/* Bottom tabs, hidden for specified routes */}
      {!hideTabs && <Tabs />}
    </div>
  );
}
