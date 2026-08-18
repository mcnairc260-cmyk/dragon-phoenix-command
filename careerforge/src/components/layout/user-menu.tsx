"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/lib/server/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0] ?? "").join("") || "?").toUpperCase();
}

export function UserMenu({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-surface-raised flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors">
        <span
          aria-hidden
          className="bg-accent-soft text-accent grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold"
        >
          {initials(name, email)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-ink block truncate text-sm">
            {name ?? "Your account"}
          </span>
          <span className="text-ink-subtle block truncate text-xs">{email}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>Signed in</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          tone="critical"
          onSelect={(event) => {
            event.preventDefault();
            void signOutAction();
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
