"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Head from "next/head";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const user = useAuthStore((state) => state.user);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return unsubscribe;
  }, [initializeAuth]);

  useEffect(() => {
    if (user) {
      router.push("/");
    } else if (pathname !== "/auth/signin") {
      router.push("/auth/signin");
    }
  }, [user, pathname, router]);

  // Dynamic metadata
  const isSignIn = pathname === "/auth/signin";
  const pageTitle = isSignIn ? "Sign In to Whispers" : "Sign Up for Whispers";
  const pageDescription = isSignIn
    ? "Sign in to Whispers to access your anonymous messaging profile and connect with friends."
    : "Sign up for Whispers to create your anonymous messaging profile and start connecting with friends.";
  const canonicalUrl = isSignIn ? "/auth/signin" : "/auth/signup";

  return (
    <main className="flex w-full bg-black min-h-screen">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content="anonymous messaging, sign in, sign up, social media, whispers"
        />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/assets/images/shh.jpeg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content="/assets/images/shh.jpeg" />
      </Head>

      <div className="w-full">{children}</div>

      <div className="hidden md:flex w-full">
        <img
          src="/assets/images/auth-bg.jpg"
          alt="Authentication background"
          className="w-full h-full object-cover"
        />
      </div>
    </main>
  );
}
