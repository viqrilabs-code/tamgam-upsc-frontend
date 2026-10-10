"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { fmtDate } from "@/lib/labels";
import { Card, Chip, Empty, ErrorBox, Loading, cx } from "../ui";

type Item = { uid: string; rating: number; review: string; improve: string; areas: string[]; allow_public: boolean;
  name?: string; email?: string; plan?: string; updated_at?: string; edits?: number };
type Report = { count: number; average: number | null; distribution: Record<string, number>;
  areas: Record<string, { label: string; count: number; average: number }>; items: Item[] };

/** Admin → Feedback: every member's rating, review and suggestions. */
export default function AdminFeedback() {
  const [rating, setRating] = useState<number | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const r = useAsync(() => api<Report>(`/api/v1/feedback/admin?${new URLSearchParams({
    ...(rating ? { rating: String(rating) } : {}), ...(area ? { area } : {}) })}`), [rating, area]);
  if (r.error) return <ErrorBox error={r.error} />;
  if (r.loading || !r.data) return <Loading />;
  const d = r.data;
  const maxDist = Math.max(1, ...Object.values(d.distribution));
  const pill = (on: boolean) => cx("rounded-full px-3 py-1 text-xs font-semibold", on ? "bg-primary text-primary-ink" : "bg-surface text-ink-2 hover:bg-surface-2");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[auto_1fr_1fr]">
        <Card className="min-w-[180px]">
          <div className="text-xs text-muted">Average rating</div>
          <div className="font-mono text-4xl font-bold">{d.average ?? "—"}<span className="text-base text-muted"> / 5</span></div>
          <div className="text-xs text-ink-2">{d.count} review{d.count === 1 ? "" : "s"}</div>
        </Card>
        <Card>
          <div className="mb-2 text-xs text-muted">Ratings</div>
          {[5, 4, 3, 2, 1].map((n) => (
            <button key={n} onClick={() => setRating(rating === n ? null : n)} className={cx("flex w-full items-center gap-2 rounded-lg px-1 text-sm", rating === n && "bg-primary-soft")}>
              <span className="w-6 font-mono">{n}★</span>
              <span className="h-2 flex-1 rounded-full bg-surface-2"><span className="block h-full rounded-full bg-saffron" style={{ width: `${(d.distribution[n] / maxDist) * 100}%` }} /></span>
              <span className="w-8 text-right font-mono text-xs">{d.distribution[n]}</span>
            </button>))}
        </Card>
        <Card>
          <div className="mb-2 text-xs text-muted">By feature (avg rating)</div>
          {Object.keys(d.areas).length === 0 ? <p className="text-sm text-muted">No feature tags yet</p> : (
            <div className="flex flex-wrap gap-1.5">{Object.entries(d.areas).map(([k, a]) => (
              <button key={k} onClick={() => setArea(area === k ? null : k)} className={pill(area === k)}>{a.label} · {a.average}★ ({a.count})</button>))}</div>)}
        </Card>
      </div>
      {(rating || area) && <button className="text-sm font-semibold text-primary" onClick={() => { setRating(null); setArea(null); }}>Clear filters ×</button>}
      {d.items.length === 0 ? <Empty icon="💬" title="No feedback yet">It appears here as members send it.</Empty> : (
        <div className="space-y-3">{d.items.map((i) => (
          <Card key={i.uid} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={16} className={n <= i.rating ? "fill-saffron text-saffron" : "text-line"} />)}</span>
              <span className="text-sm font-semibold">{i.name || "Member"}</span>
              {i.email && <span className="text-xs text-muted">{i.email}</span>}
              {i.plan && <Chip>{i.plan.replace("_", " ").toLowerCase()}</Chip>}
              {i.allow_public && <Chip tone="green">ok to show publicly</Chip>}
              <span className="ml-auto text-xs text-muted">{fmtDate(i.updated_at)}{i.edits ? ` · edited ${i.edits}×` : ""}</span>
            </div>
            {i.review && <p className="whitespace-pre-line text-sm"><span className="font-semibold text-muted">Review: </span>{i.review}</p>}
            {i.improve && <p className="whitespace-pre-line rounded-xl bg-saffron-soft p-2 text-sm"><span className="font-semibold">Improve: </span>{i.improve}</p>}
            {i.areas.length > 0 && <div className="flex flex-wrap gap-1">{i.areas.map((a) => <Chip key={a} tone="primary">{d.areas[a]?.label ?? a}</Chip>)}</div>}
          </Card>))}
        </div>)}
    </div>
  );
}
