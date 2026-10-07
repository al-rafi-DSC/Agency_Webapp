import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { Providers } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Agency Workspace",
    template: "%s · Agency Workspace",
  },
  description: "Internal student application workspace.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    /*
     * suppressHydrationWarning is required and is scoped to this element only:
     * next-themes writes the theme class onto <html> in a blocking script that
     * runs before hydration, so the server and client markup differ on that
     * attribute by design. Do not spread it to other elements.
     */
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>
          {children}
          {/* Inside Providers — Toaster reads the active theme via useTheme. */}
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
