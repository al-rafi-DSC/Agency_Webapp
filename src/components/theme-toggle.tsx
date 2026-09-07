"use client";

/**
 * Light / dark / system switch.
 *
 * Renders a fixed-size placeholder until hydrated. Reading the resolved theme
 * before hydration would produce different markup on server and client, and a
 * placeholder of the same size means the topbar does not shift when it swaps.
 */

import { useTheme } from "next-themes";
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import { useHydrated } from "@/lib/use-hydrated";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const;

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Change theme"
        disabled
        className="opacity-0"
      >
        <SunIcon />
      </Button>
    );
  }

  const Icon = resolvedTheme === "dark" ? MoonIcon : SunIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Change theme">
            <Icon />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-36">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className="justify-between"
          >
            <span className="flex items-center gap-2">
              <option.icon className="size-4 text-muted-foreground" />
              {option.label}
            </span>
            {theme === option.value ? (
              <CheckIcon className="size-3.5 text-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
