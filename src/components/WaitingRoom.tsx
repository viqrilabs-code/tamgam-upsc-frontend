"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { content } from "@/lib/api";
import type { CACard } from "@/lib/types";
import { Chakra, Chip, cx } from "./ui";

let cache: CACard[] | null = null;

async function loadCards(): Promise<CACard[]> {
  if (cache) return cache;
  try {
    const m = await content<{ versions: Record<string, string> }>("manifest.json");
    const date = m.versions["ca/latest"];
    const day = date ? await content<{ articles: CACard[] }>(`ca/${date}.json`) : { articles: [] };
    cache = day.articles.filter((a) => a.summary);
  } catch {
    cache = [];
  }
  return cache;
}

/**
 * Shown while something slow runs (question generation, notes, evaluation, source checks): a progress bar plus
 * today's current-affairs cards that rotate every few seconds — reading time instead of waiting time.
 */
export default function WaitingRoom({ title, message, progress, compact = false }:
  { title: string; message?: string; progress?: number | null; compact?: boolean }) {
  const [cards, setCards] = useState<CACard[]>([]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => { loadCards().then((c) => { setCards(c); setI(Math.floor(Math.random() * Math.max(c.length, 1))); }); }, []);
  useEffect(() => {
    if (cards.length < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % cards.length), 7000);
    return () => clearInterval(t);
  }, [cards.length, paused]);

  const card = cards[i % Math.max(cards.length, 1)];
  const pct = progress == null ? null : Math.max(4, Math.min(100, progress));

  return (
    <div className={cx("w-full", compact ? "" : "max-w-xl")} role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-primary"><Chakra size={compact ? 28 : 40} spin /></span>
        <div className="min-w-0">
          <div className="font-display text-lg font-extrabold leading-tight">{title}</div>
          {message && <div className="truncate text-sm text-ink-2">{message}</div>}
        </div>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
        {pct == null
          ? <div className="h-full w-1/3 animate-[slide_1.6s_ease-in-out_infinite] rounded-full bg-primary" />
          : <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />}
      </div>

      {card && (
        <div className="mt-5 rounded-3xl border-2 border-line bg-surface p-4 text-left" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-saffron">
              <Newspaper size={14} /> While you wait · today&apos;s current affairs
            </span>
            {cards.length > 1 && (
              <span className="flex items-center gap-1">
                <button aria-label="Previous card" onClick={() => setI((x) => (x - 1 + cards.length) % cards.length)} className="rounded-full p-1 text-muted hover:bg-surface-2"><ChevronLeft size={16} /></button>
                <button aria-label="Next card" onClick={() => setI((x) => (x + 1) % cards.length)} className="rounded-full p-1 text-muted hover:bg-surface-2"><ChevronRight size={16} /></button>
              </span>
            )}
          </div>
          <div key={card.id} className="pop">
            <div className="flex flex-wrap gap-1">{card.gs_tags.map((g) => <Chip key={g} tone="primary">{g}</Chip>)}</div>
            <div className="mt-1.5 font-display font-bold leading-snug">{card.headline}</div>
            <p className="mt-1 line-clamp-4 text-sm text-ink-2">{card.summary}</p>
            {!!card.facts?.length && (
              <ul className="mt-2 space-y-0.5 text-xs text-ink-2">
                {card.facts.slice(0, 3).map((f) => <li key={f} className="flex gap-1.5"><span className="text-saffron">▸</span>{f}</li>)}
              </ul>
            )}
            {card.prelims_angle && <p className="mt-2 rounded-xl bg-saffron-soft px-2.5 py-1.5 text-xs"><b className="text-saffron">Prelims angle · </b>{card.prelims_angle}</p>}
          </div>
          {cards.length > 1 && (
            <div className="mt-3 flex justify-center gap-1">
              {cards.slice(0, 12).map((c, j) => <span key={c.id} className={cx("h-1.5 rounded-full transition-all", j === i % cards.length ? "w-5 bg-primary" : "w-1.5 bg-line")} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
