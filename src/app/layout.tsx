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
  title: "NexusOS — Student Productivity & Coding OS",
  description:
    "Personal student productivity, coding mastery and habit tracking operating system: 3D dashboard, 20+ analytics charts, tasks, habits, AI coach and more.",
  keywords: ["NexusOS", "student productivity", "study tracker", "habit tracker", "coding roadmap", "analytics", "AI coach"],
  authors: [{ name: "NexusOS" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "NexusOS — Student Productivity & Coding OS",
    description: "Study tracking, habits, tasks, analytics and an AI coach in one immersive dashboard.",
    siteName: "NexusOS",
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
