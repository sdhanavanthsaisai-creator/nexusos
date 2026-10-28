import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/**
 * Roboto® RB/25 typography:
 * - Aeonik (commercial) → Inter as the sanctioned web substitute (--font-rb-sans)
 * - IBM Plex Mono → --font-rb-mono
 * - Times New Roman → system serif via `.font-editorial` (globals.css)
 */
const rbSans = Inter({
  variable: "--font-rb-sans",
  subsets: ["latin"],
});

const rbMono = IBM_Plex_Mono({
  variable: "--font-rb-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
        className={`${rbSans.variable} ${rbMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
