"use client";

/**
 * The signed-in user's menu in the topbar.
 *
 * Presentational: it renders the identity it is handed. The one thing it does
 * is sign out, and that goes through a POST to `/auth/sign-out` rather than a
 * link — Next prefetches links on hover, so a GET that ends a session would
 * sign people out for merely pointing at the menu.
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

const SIGN_OUT_FORM_ID = "sign-out-form";

export function UserMenu({ user }: { user: SessionUser }) {
  return (
    <>
      <form
        id={SIGN_OUT_FORM_ID}
        action="/auth/sign-out"
        method="post"
        className="hidden"
      />

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

        {/*
          Associated by id rather than by nesting: DropdownMenuContent is
          rendered through a portal, so a <form> wrapped around this item would
          live outside the document flow it appears to belong to. A button's
          `form` attribute is resolved by id across the whole document, which
          sidesteps that entirely.
        */}
        <DropdownMenuItem
          nativeButton
          render={
            <button type="submit" form={SIGN_OUT_FORM_ID}>
              <LogOutIcon className="size-4 text-muted-foreground" />
              Sign out
            </button>
          }
        />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
