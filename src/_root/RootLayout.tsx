// src/_root/RootLayout.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Tabs from "../components/Tabs";
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
    <div className="h-screen overflow-hidden">
      {/* Main content area (fills available space between header + tabs) */}
      <Outlet />

      {/* Bottom tabs, hidden for specified routes */}
      {!hideTabs && <Tabs />}
    </div>
  );
}
