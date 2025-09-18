// RootLayout.tsx
import { Outlet } from "react-router-dom";
import Tabs from "../components/Tabs";

export default function RootLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Main content area */}
      <div className="flex-1">
        <Outlet />
      </div>

      {/* Bottom tabs */}
      <Tabs />
    </div>
  );
}
