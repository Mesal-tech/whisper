import { Outlet } from "react-router-dom";
import Tabs from "../components/Tabs";

export default function RootLayout() {
  return (
    <div className="h-screen overflow-hidden">
      {/* Main content area (fills available space between header + tabs) */}
      <Outlet />

      {/* Bottom tabs */}
      <Tabs />
    </div>
  );
}
