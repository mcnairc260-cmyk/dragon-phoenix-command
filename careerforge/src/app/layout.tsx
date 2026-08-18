import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CareerForge",
    template: "%s · CareerForge",
  },
  description:
    "A job-search operating system: capture opportunities, judge fit honestly, tailor materials from your real record, and know what to do next.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#17181a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <a
          href="#main"
          className="bg-accent text-accent-ink sr-only rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[200]"
        >
          Skip to content
        </a>
        <ToastProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
