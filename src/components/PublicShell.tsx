"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./AppShell";
import { LinkButton, Logo } from "./ui";

export const COMPANY = "Viqri Labs";
export const EMAIL = "contact@viqrilabs.com";
export const WHATSAPP_DISPLAY = "+91 92702 11542";
export const WHATSAPP_LINK = "https://wa.me/919270211542";
export const LAST_UPDATED = "2 October 2026";

export const FOOTER_LINKS = [
  ["Geopolitics blog", "/geopolitics/"], ["About", "/about/"], ["Careers", "/careers/"], ["Contact", "/contact/"], ["FAQs", "/faqs/"],
  ["Privacy", "/privacy/"], ["Terms", "/terms/"], ["Refunds", "/refunds/"], ["Licenses", "/licenses/"],
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-line px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.2fr_2fr]">
        <div>
          <Logo />
          <p className="mt-2 max-w-sm text-sm text-ink-2">UPSC prep that&apos;s serious about results and honest about everything else. Built by {COMPANY}.</p>
          <p className="mt-3 text-sm text-ink-2">
            <a className="font-semibold text-primary" href={`mailto:${EMAIL}`}>{EMAIL}</a><br />
            WhatsApp: <a className="font-semibold text-primary" href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">{WHATSAPP_DISPLAY}</a>
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {FOOTER_LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="text-ink-2 hover:text-ink hover:underline">{label}</Link>
          ))}
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-xs text-muted">
        © 2026 {COMPANY}. TamGam is an independent platform and is not affiliated with the Union Public Service Commission or any
        newspaper. Analytics reflect performance on TamGam only and are never a guarantee of selection.
      </p>
    </footer>
  );
}

export default function PublicShell({ kicker, title, intro, children }:
  { kicker: string; title: string; intro?: ReactNode; children: ReactNode }) {
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
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-4">
        <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-saffron">{kicker}</div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">{title}</h1>
        {intro && <div className="mt-3 text-lg text-ink-2">{intro}</div>}
        <article className="prose-tamgam mt-8">{children}</article>
      </main>
      <SiteFooter />
    </div>
  );
}

export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mb-8 scroll-mt-20">
      <h2 className="mb-2 font-display text-2xl font-bold">{title}</h2>
      <div className="space-y-3 leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return <ul className="list-disc space-y-1.5 pl-5">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>;
}

export function Updated() {
  return <p className="mb-8 rounded-2xl bg-surface-2 px-4 py-2 text-sm text-muted">Last updated: {LAST_UPDATED}</p>;
}
