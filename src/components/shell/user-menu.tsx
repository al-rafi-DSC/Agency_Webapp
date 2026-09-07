"use client";

/**
 * The signed-in user's menu in the topbar.
 *
 * Presentational. It renders the identity it is handed and links; it performs
 * no auth. "Sign out" navigates to /login rather than calling Supabase —
 * session handling is hand-written in Phase 3, and a button that pretends to
 * end a session it cannot end would be worse than an honest link.
 */

import Link from "next/link";
import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";

import { initials } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/types/ui";

const ROLE_LABELS: Record<SessionUser["role"], string> = {
  admin: "Admin",
  staff: "Staff",
  superadmin: "Superadmin",
};

export function UserMenu({ user }: { user: SessionUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            aria-label={`Account menu for ${user.full_name}`}
          >
            <Avatar size="sm">
              {user.avatar_url ? (
                <AvatarImage src={user.avatar_url} alt="" />
              ) : null}
              <AvatarFallback>{initials(user.full_name)}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-1 py-2">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium text-foreground">
              {user.full_name}
            </span>
            <Badge variant="secondary" className="shrink-0">
              {ROLE_LABELS[user.role]}
            </Badge>
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {user.role === "admin" ? (
          <DropdownMenuItem
            render={
              <Link href="/admin/settings">
                <SettingsIcon className="size-4 text-muted-foreground" />
                Settings
              </Link>
            }
          />
        ) : (
          <DropdownMenuItem disabled>
            <UserIcon className="size-4 text-muted-foreground" />
            Profile
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          render={
            <Link href="/login">
              <LogOutIcon className="size-4 text-muted-foreground" />
              Sign out
            </Link>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
