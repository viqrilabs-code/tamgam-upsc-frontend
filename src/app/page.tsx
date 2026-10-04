"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, NotebookPen, ScrollText, Target, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/AppShell";
import { SiteFooter } from "@/components/PublicShell";
import { api } from "@/lib/api";
import { Chakra, Chip, LinkButton, Logo } from "@/components/ui";

const FEATURES = [
  { icon: Target, title: "Tests that feel like the real paper", body: "Prelims MCQs mixed like recent UPSC papers — 55%+ multi-statement, a current-affairs share, PYQs and wildcards. +2 / −0.66 marking.", tone: "bg-primary-soft", span: "md:col-span-2" },
  { icon: CalendarDays, title: "Daily CA, 8 AM sharp", body: "Top stories mapped to GS papers, own-words summaries, Prelims & Mains angles, plus a daily quiz.", tone: "bg-saffron-soft", span: "" },
  { icon: ScrollText, title: "PYQ Lab", body: "Topic heat maps, format trends and option-pattern stats — each published with its measured hit rate.", tone: "bg-green-soft", span: "" },
  { icon: NotebookPen, title: "Cornell one-pagers", body: "Topic notes that expand where you're weak and collapse where you're strong. Upload your coaching PDFs too.", tone: "bg-surface-2", span: "" },
  { icon: BarChart3, title: "Analytics with no cap", body: "Topic mastery, a verdict against the PYQ benchmark, and one focused next step. Chance estimate unlocks only when there's enough data.", tone: "bg-lime/40", span: "" },
];

export default function Landing() {
  const [prices, setPrices] = useState<Record<string, { price_paise: number }>>({});
  useEffect(() => { api<{ plans: Record<string, { price_paise: number }> }>("/api/v1/platform/plans").then((r) => setPrices(r.plans)).catch(() => {}); }, []);
  const inr = (k: string) => (prices[k] ? `₹${prices[k].price_paise / 100}` : "");
  return (
    <div className="min-h-screen">
      <div className="tricolor h-1 w-full" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LinkButton href="/login/" variant="outline">Sign in</LinkButton>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 md:grid-cols-[1.2fr_1fr] md:pt-14">
        <div>
          <Chip tone="lime" className="mb-4 border-2 border-[#17152b]"><Sparkles size={12} /> UPSC CSE 2027 · Prelims + Mains + PSIR</Chip>
          <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight md:text-7xl">
            Crack UPSC.<br />
            <span className="relative inline-block">
              <span className="relative z-10">Stay unbothered.</span>
              <span className="absolute inset-x-0 bottom-1 -z-0 h-4 rounded bg-saffron/40 md:h-6" />
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2">
            Serious prep, zero boring. Daily current affairs, real-pattern test series, PYQ analysis and
            personalised one-page notes — priced for every aspirant.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/login/" className="px-6 py-3 text-base">Start prepping <ArrowRight size={18} /></LinkButton>
            <LinkButton href="/plans/" variant="lime" className="px-6 py-3 text-base">See plans</LinkButton>
          </div>
          <p className="mt-6 text-xs text-muted">
            Sign in with Google or email: Free Prelims tests{prices.DAILY_PASS ? ` · Daily Pass ${inr("DAILY_PASS")} · Monthly Pass ${inr("MONTHLY_PASS")}` : ""} — with progress tracking
          </p>
        </div>

        <div className="relative">
          <div className="sticker rotate-2 rounded-[2rem] bg-surface p-6">
            <div className="flex items-center justify-between">
              <Chip tone="primary">GS III · Prelims</Chip>
              <span className="font-mono text-sm font-bold text-saffron">01:12</span>
            </div>
            <p className="mt-4 font-semibold">Consider the following statements about the Monetary Policy Committee:</p>
            <ol className="mt-3 space-y-1.5 text-sm text-ink-2">
              <li>1. It is chaired by the RBI Governor.</li>
              <li>2. It has six members.</li>
              <li>3. Its decisions must be unanimous.</li>
            </ol>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {["Only one", "Only two", "All three", "None"].map((o, i) => (
                <div key={o} className={`rounded-2xl border-2 px-3 py-2 font-semibold ${i === 1 ? "border-green bg-green-soft text-green" : "border-line"}`}>{o}</div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-surface-2 p-3 text-xs text-ink-2">
              💡 &ldquo;Must be unanimous&rdquo; is an absolute qualifier — in PYQs, statements like this are false more often than not.
            </div>
          </div>
          <div className="sticker absolute -bottom-6 -left-4 -rotate-3 rounded-2xl bg-lime px-4 py-2 font-display font-extrabold text-[#17152b]">
            🔥 12-day streak
          </div>
          <div className="absolute -right-3 -top-5 text-primary"><Chakra size={56} spin /></div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="font-display text-3xl font-extrabold">Everything you need. Nothing you don&apos;t.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body, tone, span }) => (
            <div key={title} className={`rounded-3xl border border-line p-6 ${tone} ${span}`}>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-surface sticker"><Icon size={20} /></div>
              <h3 className="mt-4 font-display text-xl font-bold">{title}</h3>
              <p className="mt-1.5 text-sm text-ink-2">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
