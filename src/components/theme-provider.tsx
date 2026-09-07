"use client";

/**
 * Theme + tooltip providers for the whole app.
 *
 * Client component because `next-themes` reads and writes `localStorage` and
 * the OS colour-scheme preference — neither exists on the server. It renders
 * only context, so nothing below it is forced to become a Client Component.
 *
 * `<html suppressHydrationWarning>` in `src/app/layout.tsx` is required: the
 * theme class is applied by a blocking inline script before React hydrates, so
 * server and client markup deliberately differ on that one attribute.
 */

import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delay={200} closeDelay={80}>
        {children}
      </TooltipProvider>
    </NextThemesProvider>
  );
}
