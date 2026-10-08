"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { fmtDate } from "@/lib/labels";
import { Card, ErrorBox, Loading, cx } from "../ui";

type Day = { date: string; pageviews: number; visitors: number; members: number; guests: number; anonymous: number };
type Win = { visitors_daily_sum: number; pageviews: number; members: number };
type Report = { days: Day[]; today: Day; last_7: Win; last_30: Win; sections: [string, number][]; referrers: [string, number][] };

export default function AdminVisitors() {
  const [days, setDays] = useState(30);
  const r = useAsync(() => api<Report>(`/api/v1/platform/admin/visits?days=${days}`), [days]);
  if (r.error) return <ErrorBox error={r.error} />;
  if (r.loading || !r.data) return <Loading />;
  const d = r.data;
  const chron = [...d.days].reverse();
  const max = Math.max(1, ...chron.map((x) => x.visitors));

  const tile = (label: string, value: number, sub: string) => (
    <Card><div className="text-xs text-muted">{label}</div><div className="font-mono text-3xl font-bold">{value.toLocaleString("en-IN")}</div>
      <div className="text-xs text-ink-2">{sub}</div></Card>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-2">Real people only — admins and bots aren&apos;t counted. A visitor is one signed-in account, or one browser per day when not signed in (IP + browser, hashed with a key that changes daily; no IP is stored).</p>
        <div className="flex gap-1">{[7, 30, 90].map((n) => (
          <button key={n} onClick={() => setDays(n)} className={cx("rounded-full px-3 py-1 text-xs font-semibold",
            days === n ? "bg-primary text-primary-ink" : "bg-surface text-ink-2 hover:bg-surface-2")}>{n} days</button>))}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tile("Visitors today", d.today.visitors ?? 0, `${d.today.members ?? 0} signed in · ${(d.today.guests ?? 0) + (d.today.anonymous ?? 0)} not signed in`)}
        {tile("Page views today", d.today.pageviews ?? 0, "every page opened")}
        {tile("Visitor-days, last 7", d.last_7.visitors_daily_sum, `${d.last_7.pageviews.toLocaleString("en-IN")} page views`)}
        {tile(`Visitor-days, last ${Math.min(30, days)}`, d.last_30.visitors_daily_sum, `${d.last_30.pageviews.toLocaleString("en-IN")} page views`)}
      </div>

      <Card>
        <div className="mb-3 font-display font-bold">Visitors per day</div>
        <div className="flex h-40 items-end gap-[2px]" role="img" aria-label="Daily visitors bar chart">
          {chron.map((x) => (
            <div key={x.date} className="group relative flex h-full flex-1 items-end">
              <div className="w-full rounded-t bg-primary" style={{ height: `${(x.visitors / max) * 100}%`, minHeight: x.visitors ? 2 : 0 }} />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs text-bg group-hover:block">
                {fmtDate(x.date)}: {x.visitors} visitors · {x.pageviews} views</div>
            </div>))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted"><span>{fmtDate(chron[0]?.date)}</span><span>{fmtDate(chron.at(-1)?.date)}</span></div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr><th className="p-3">Day (IST)</th><th className="p-3 text-right">Visitors</th><th className="p-3 text-right">Signed in</th>
                <th className="p-3 text-right">Guests</th><th className="p-3 text-right">Not signed in</th><th className="p-3 text-right">Page views</th></tr>
            </thead>
            <tbody className="divide-y divide-line font-mono">
              {d.days.map((x) => (
                <tr key={x.date} className={x.visitors ? "" : "text-muted"}>
                  <td className="p-3 font-sans">{fmtDate(x.date)}</td><td className="p-3 text-right font-bold">{x.visitors}</td>
                  <td className="p-3 text-right">{x.members}</td><td className="p-3 text-right">{x.guests}</td>
                  <td className="p-3 text-right">{x.anonymous}</td><td className="p-3 text-right">{x.pageviews}</td>
                </tr>))}
            </tbody>
          </table>
        </Card>
        <div className="space-y-4">
          <TopList title="Most visited sections" rows={d.sections} />
          <TopList title="Where visitors came from" rows={d.referrers} empty="No referrers yet" />
        </div>
      </div>
    </div>
  );
}

function TopList({ title, rows, empty = "No data yet" }: { title: string; rows: [string, number][]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <Card>
      <div className="mb-2 font-display font-bold">{title}</div>
      {rows.length === 0 ? <p className="text-sm text-muted">{empty}</p> : (
        <ul className="space-y-1.5">{rows.map(([k, n]) => (
          <li key={k} className="text-sm">
            <div className="flex justify-between"><span>{k}</span><span className="font-mono font-semibold">{n}</span></div>
            <div className="h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div>
          </li>))}</ul>)}
    </Card>
  );
}
