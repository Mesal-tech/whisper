"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import Tabs from "@/components/Tabs";
import { useAuthStore } from "@/store/authStore";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();

  const routesWithoutTabs = useMemo(() => ["/rooms/"], []);
  const hideTabs = useMemo(
    () => routesWithoutTabs.some((route) => pathname.startsWith(route)),
    [pathname, routesWithoutTabs]
  );

  useEffect(() => {
    if (hasHydrated && !user) {
      router.replace(`/auth/signin?from=${encodeURIComponent(pathname)}`);
    }
  }, [user, pathname, router, hasHydrated]);

  // Wait until store has hydrated before rendering anything
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex overflow-hidden bg-[#111111]">
      <Sidebar />
      <div className="mx-auto w-full">{children}</div>
      {!hideTabs && <Tabs />}
    </div>
  );
}
