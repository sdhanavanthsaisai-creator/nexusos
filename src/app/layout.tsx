import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GlassOS — a glass desktop in your browser",
  description:
    "GlassOS: an ultra-aesthetic web operating system with a spring-physics window manager, Dynamic Island, magnetic dock, live generative music, spotlight search and native glass apps.",
  keywords: ["GlassOS", "web desktop", "glassmorphism", "dynamic island", "window manager", "web audio"],
  authors: [{ name: "GlassOS" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "GlassOS — a glass desktop in your browser",
    description: "Spring-physics windows, a living Dynamic Island, generative music and beautiful glass apps.",
    siteName: "GlassOS",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
