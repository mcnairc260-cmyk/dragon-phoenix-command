"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Briefcase,
  Menu,
  Sun,
  Target,
  UserRound,
  X,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/today", label: "Today", icon: Target },
  { href: "/jobs", label: "Opportunities", icon: Briefcase },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              active
                ? "bg-surface-raised text-ink font-medium"
                : "text-ink-muted hover:text-ink hover:bg-surface-raised/60",
            )}
          >
            <Icon
              className={cn("size-4 shrink-0", active && "text-accent")}
              aria-hidden
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Light/dark toggle. Persists to localStorage; dark is the default. */
function ThemeToggle() {
  const [light, setLight] = useState(false);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      window.localStorage.setItem("cf-theme", next ? "light" : "dark");
    } catch {
      // Private-mode storage failures are not worth surfacing.
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
    >
      <Sun />
    </Button>
  );
}

export function Sidebar({ footer }: { footer: React.ReactNode }) {
  return (
    <aside className="border-line bg-surface-sunken hidden w-56 shrink-0 flex-col border-r lg:flex">
      <div className="px-4 py-5">
        <Link href="/today" className="inline-block rounded-md">
          <Logo />
        </Link>
      </div>
      <div className="flex-1 px-3">
        <NavLinks />
      </div>
      <div className="border-line border-t p-3">{footer}</div>
    </aside>
  );
}

export function MobileNav({ footer }: { footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-line bg-surface-sunken border-b lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/today" className="inline-block rounded-md">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav-panel"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open ? (
        <div id="mobile-nav-panel" className="border-line border-t px-3 py-3">
          <NavLinks onNavigate={() => setOpen(false)} />
          <div className="border-line mt-3 border-t pt-3">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}

export { ThemeToggle };
