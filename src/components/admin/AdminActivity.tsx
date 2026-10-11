"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { Card, ErrorBox, Loading, cx } from "../ui";
import ActivityList, { type ActivityItem } from "./ActivityList";
import { UserDrawer } from "./AdminUsers";

type Feed = { items: ActivityItem[]; actions: Record<string, string>; active_people: number;
  totals: { action: string; label: string; count: number; people: number }[] };

/** Admin → Activity: who did what across all members, newest first. */
export default function AdminActivity() {
  const [days, setDays] = useState(7);
  const [action, setAction] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const f = useAsync(() => api<Feed>(`/api/v1/platform/admin/activity?days=${days}&limit=300${action ? `&action=${action}` : ""}`), [days, action]);
  const pill = (on: boolean) => cx("rounded-full px-3 py-1 text-xs font-semibold", on ? "bg-primary text-primary-ink" : "bg-surface text-ink-2 hover:bg-surface-2");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-2">Every member action — sign-ups, tests, Mains answers, notes, revision cards, purchases and feedback. Admin accounts aren&apos;t logged. Click a name to open that member.</p>
        <div className="flex gap-1">{[1, 7, 30, 90].map((n) => <button key={n} onClick={() => setDays(n)} className={pill(days === n)}>{n === 1 ? "Today" : `${n} days`}</button>)}</div>
      </div>
      {f.error ? <ErrorBox error={f.error} /> : f.loading || !f.data ? <Loading /> : (
        <>
          <Card>
            <div className="mb-2 flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-3xl font-bold">{f.data.active_people}</span>
              <span className="text-sm text-ink-2">active member{f.data.active_people === 1 ? "" : "s"} · last {days === 1 ? "day" : `${days} days`}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setAction(null)} className={pill(!action)}>All</button>
              {f.data.totals.map((t) => (
                <button key={t.action} onClick={() => setAction(action === t.action ? null : t.action)} className={pill(action === t.action)}>
                  {t.label} · {t.count} ({t.people} {t.people === 1 ? "person" : "people"})</button>))}
            </div>
          </Card>
          <Card><ActivityList items={f.data.items} showUser onUser={setSel} /></Card>
        </>
      )}
      {sel && <UserDrawer uid={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
