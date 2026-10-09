"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3, CalendarDays, Crown, History, LayoutGrid, LifeBuoy, LogOut, Moon, NotebookPen,
  ScrollText, Shield, Sun, Target, UserRound, BookOpenCheck, Globe2,
} from "lucide-react";
import { GuestPreview, SignInGate, UpgradeGate } from "./Gates";
import LiveTests from "./LiveTests";
import { openSignIn, signOut } from "@/lib/api";
import { useSession, useTheme } from "@/lib/hooks";
import { Logo, cx } from "./ui";

const NAV = [
  { href: "/dashboard/", label: "Home", icon: LayoutGrid },
  { href: "/practice/", label: "Practice", icon: Target },
  { href: "/current-affairs/", label: "Current Affairs", icon: CalendarDays },
  { href: "/pyq/", label: "PYQ Lab", icon: ScrollText },
  { href: "/notes/", label: "Notes", icon: NotebookPen },
  { href: "/revision/", label: "Revision", icon: BookOpenCheck },
  { href: "/geopolitics/", label: "Geopolitics", icon: Globe2 },
  { href: "/analytics/", label: "Analytics", icon: BarChart3 },
  { href: "/history/", label: "History", icon: History },
];
const MOBILE = [NAV[0], NAV[1], NAV[2], NAV[4], NAV[5]];

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label="Toggle dark mode"
      className="grid h-10 w-10 place-items-center rounded-2xl border-2 border-line text-ink-2 hover:text-ink">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

type Preview = { emoji: string; title: string; points: string[] };

export default function AppShell({ children, wide = false, guestPreview }:
  { children: ReactNode; wide?: boolean; guestPreview?: Preview }) {
  const path = usePathname();
  const session = useSession();
  const active = (href: string) => path === href || path?.startsWith(href);

  return (
    <div className="min-h-screen">
      <div className="tricolor h-1 w-full" />
      <aside className="fixed inset-y-0 left-0 top-1 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <Logo className="px-2" />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={cx("flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                active(href) ? "bg-primary text-primary-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}>
              <Icon size={18} /> {label}
            </Link>
          ))}
          <div className="my-3 h-px bg-line" />
          <Link href="/plans/" className={cx("flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold",
            active("/plans/") ? "bg-primary text-primary-ink" : "text-ink-2 hover:bg-surface-2")}>
            <Crown size={18} className="text-saffron" /> Plans
          </Link>
          <Link href="/help/" className={cx("flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold",
            active("/help/") ? "bg-primary text-primary-ink" : "text-ink-2 hover:bg-surface-2")}>
            <LifeBuoy size={18} /> Help &amp; complaints
          </Link>
          {session?.admin && (
            <Link href="/admin/" className={cx("flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold",
              active("/admin/") ? "bg-primary text-primary-ink" : "text-ink-2 hover:bg-surface-2")}>
              <Shield size={18} /> Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/profile/" className="flex flex-1 items-center gap-2 rounded-2xl border-2 border-line px-3 py-2 text-sm font-semibold hover:bg-surface-2">
            <span>{session?.avatar ?? <UserRound size={16} />}</span> <span className="truncate">{session?.name ?? "Profile"}</span>
            {session?.kind === "guest" && <span className="ml-auto rounded-full bg-surface-2 px-2 text-[10px] uppercase text-muted">guest</span>}
          </Link>
          <ThemeToggle />
        </div>
        <button onClick={() => { signOut(); window.location.href = "/"; }}
          className="mt-2 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted hover:text-ink">
          <LogOut size={14} /> Sign out
        </button>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 px-3 text-[10px] text-muted">
          {[["About", "/about/"], ["FAQs", "/faqs/"], ["Contact", "/contact/"], ["Privacy", "/privacy/"], ["Terms", "/terms/"], ["Refunds", "/refunds/"]].map(([l, h]) => (
            <Link key={h} href={h} className="hover:text-ink">{l}</Link>
          ))}
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/profile/" aria-label="Profile" className="grid h-10 w-10 place-items-center rounded-2xl border-2 border-line"><UserRound size={18} /></Link>
          <ThemeToggle />
        </div>
      </header>

      <main className={cx("px-4 pb-28 pt-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-10", wide ? "" : "max-w-6xl")}>
        {session?.kind === "guest" && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-lime/40 px-5 py-3">
            <div className="text-sm"><b>You&apos;re exploring as a guest, {session.name}.</b> Sign in with your email to use TamGam — your email keeps your history on every device.</div>
            <button onClick={() => openSignIn()} className="sticker sticker-hover rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-ink">Sign in with email</button>
          </div>
        )}
        {session?.kind === "guest" && guestPreview ? <GuestPreview {...guestPreview} /> : children}
      </main>

      <SignInGate />
      <UpgradeGate />
      {session && session.kind !== "guest" && <LiveTests />}

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-3xl bg-surface p-1.5 sticker lg:hidden">
        {MOBILE.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={cx("flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-bold",
              active(href) ? "bg-primary text-primary-ink" : "text-muted")}>
            <Icon size={18} /> {label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}


