import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Whispers – Anonymous Chat App",
  description:
    "Join Whispers for secure, anonymous chats and candid conversations.",
  openGraph: {
    title: "Whispers – Anonymous Chat App",
    description:
      "Chat anonymously and securely with people worldwide on Whispers. Enjoy private, unfiltered conversations without accounts or tracking.",
    url: "https://www.whisprs.fun",
    siteName: "Whispers",
    images: [
      {
        url: "https://www.whisprs.fun/og-image-1200x630.jpg",
        width: 1200,
        height: 630,
        alt: "Whispers – Anonymous Chat App",
      },
      {
        url: "https://www.whisprs.fun/og-image-300x200.jpg",
        width: 300,
        height: 200,
        alt: "Whispers – Anonymous Chat App (small preview)",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Whispers – Anonymous Chat App",
    description:
      "Join Whispers for safe, honest, and anonymous conversations online.",
    images: ["https://www.whisprs.fun/og-image-1200x630.jpg"],
    creator: "@whisprsapp", // optional
  },
  metadataBase: new URL("https://www.whisprs.fun"),
  alternates: {
    canonical: "https://www.whisprs.fun",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="caveat-brush">
        {children}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          closeOnClick
          pauseOnHover
          theme="dark"
        />
      </body>
    </html>
  );
}
