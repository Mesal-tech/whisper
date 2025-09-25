// src/_root/RootLayout.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Tabs from "../components/Tabs";
import Sidebar from "../components/Sidebar"
import { useAuthStore } from "../store/authStore";

export default function RootLayout() {
  const location = useLocation();

  const routesWithoutTabs = ["/rooms/"];
  const hideTabs = routesWithoutTabs.some((route) =>
    location.pathname.startsWith(route)
  );
  const { user } = useAuthStore();

  // If user is not authenticated, redirect to signin page
  if (!user) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#111111]">
      {/* SIdebar */}
      <Sidebar />

      {/* Main content area (fills available space between header + tabs) */}
      <div className="mx-auto w-full">
        <Outlet />
      </div>

      {/* Bottom tabs, hidden for specified routes */}
      {!hideTabs && <Tabs />}
    </div>
  );
}
