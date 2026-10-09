"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Flame, Lock, NotebookPen, Sparkles, Timer, Zap } from "lucide-react";
import AppShell from "@/components/AppShell";
import { TrendLine } from "@/components/charts";
import { Button, Card, Chip, ErrorBox, Loading, Ring } from "@/components/ui";
import { api, content } from "@/lib/api";
import { useAsync, useEntitlements, useSession } from "@/lib/hooks";
import { SCOPE_LABEL, fmtDate, greeting, gsPapers } from "@/lib/labels";
import LaunchOverlay from "@/components/LaunchOverlay";
import { type LaunchState, bankTest, dailyQuiz, fullMainsMock, fullPrelimsMock, resultUrl } from "@/lib/tests";
import type { Attempt, CACard } from "@/lib/types";

type Summary = {
  attempts: number; questions_answered: number; accuracy: number | null; avg_time_s: number | null;
  streak: { count: number; best: number }; today: { answered: number; goal: number };
  trend: { at: string; pct: number; title: string }[];
};
type Chance = { status: string; band?: [number, number]; confidence?: string; sufficiency?: { answered: number; needed: number; coverage: number } };

export default function Dashboard() {
  const session = useSession();
  const { ent } = useEntitlements(session);
  const [launchState, setLaunch] = useState<LaunchState>({ kind: "idle" });
  const [mainsPaper, setMainsPaper] = useState("GS2");
  const me = useAsync(() => api<{ name: string; avatar?: string; target_year: number; entitlements: { plan_name: string } }>("/api/v1/platform/me"), []);
  const summary = useAsync(() => api<Summary>("/api/v1/analytics/me/summary"), []);
  const chance = useAsync(() => api<Chance>("/api/v1/analytics/me/chance"), []);
  const recent = useAsync(() => api<{ items: Attempt[] }>("/api/v1/attempts?limit=5"), []);
  const notes = useAsync(() => api<{ suggestion?: { topic_id: string } }>("/api/v1/notes?limit=1"), []);
  const ca = useAsync(async () => {
    const m = await content<{ versions: Record<string, string> }>("manifest.json");
    const date = m.versions["ca/latest"];
    return date ? content<{ date: string; articles: CACard[] }>(`ca/${date}.json`) : null;
  }, []);

  if (!session) return null;
  const s = summary.data;
  const goalPct = s ? Math.min(100, (100 * s.today.answered) / Math.max(s.today.goal, 1)) : 0;

  return (
    <AppShell guestPreview={{ emoji: "🏠", title: "Your UPSC home base", points: [
      "Daily goal ring, streaks and your score trend", "One-tap Daily CA quiz, full Prelims (100 Qs) and Mains (250 marks) mocks",
      "Today's newspaper distilled for UPSC", "A chance meter that unlocks when there's enough data — never hype"] }}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-muted">{greeting()},</div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            {me.data?.avatar ?? "🦁"} {me.data?.name ?? session.name}
          </h1>
          <p className="mt-1 text-ink-2">
            Target CSE {me.data?.target_year ?? "—"} · <Link href="/plans/" className="font-semibold underline decoration-dotted">{ent?.plan_name ?? "Free"}</Link>
            {ent?.valid_till && <span className="text-sm text-muted"> · till {new Date(ent.valid_till).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="sticker flex items-center gap-2 rounded-2xl bg-lime px-4 py-2 font-display text-lg font-extrabold text-[#17152b]">
            <Flame size={20} /> {s?.streak.count ?? 0}-day streak
          </div>
        </div>
      </div>

      <LaunchOverlay state={launchState} onClose={() => setLaunch({ kind: "idle" })} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card sticker className="flex items-center gap-5 md:col-span-1">
          <Ring value={goalPct} tone="green">
            <div>
              <div className="font-mono text-2xl font-bold">{s?.today.answered ?? 0}</div>
              <div className="text-[10px] font-semibold uppercase text-muted">of {s?.today.goal ?? 25}</div>
            </div>
          </Ring>
          <div>
            <div className="font-display text-lg font-bold">Today&apos;s goal</div>
            <p className="text-sm text-ink-2">{goalPct >= 100 ? "Goal smashed. Main character energy. ✨" : "Questions answered today."}</p>
            <Button variant="outline" className="mt-3 !py-1.5"
              onClick={() => bankTest("gs3", { stage: "PRELIMS", mode: "ADAPTIVE", n: 10 }, setLaunch)}>
              <Zap size={14} /> Quick 10
            </Button>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-display text-lg font-bold">Score trend</div>
              <div className="text-sm text-muted">Last {s?.trend.length ?? 0} Prelims tests · % of max score</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold">{s?.accuracy ?? "—"}{s?.accuracy != null && "%"}</div>
              <div className="text-xs text-muted">overall accuracy</div>
            </div>
          </div>
          {summary.loading ? <Loading /> : s && s.trend.length > 0
            ? <TrendLine points={s.trend.map((t) => ({ label: t.title, value: t.pct, sub: fmtDate(t.at) }))} />
            : <p className="py-10 text-center text-sm text-muted">Take your first test to see your trend line here.</p>}
        </Card>
      </div>

      <h2 className="mb-3 mt-10 font-display text-2xl font-extrabold">Start something</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button onClick={() => dailyQuiz(setLaunch)}
          className="sticker sticker-hover rounded-3xl bg-saffron p-5 text-left text-white">
          <div className="text-3xl">📰</div>
          <div className="mt-3 font-display text-xl font-extrabold">Daily CA quiz</div>
          <div className="text-sm opacity-90">Today&apos;s newspaper, tested.</div>
        </button>
        <button onClick={() => fullPrelimsMock(setLaunch)}
          className="sticker sticker-hover rounded-3xl bg-primary p-5 text-left text-primary-ink">
          <div className="text-3xl">⏱️</div>
          <div className="mt-3 font-display text-xl font-extrabold">Full Prelims mock</div>
          <div className="text-sm opacity-90">{ent?.plan === "FREE" ? "100 Qs · 2 hours · PYQs + question bank" : "GS Paper I · 100 Qs · 200 marks · 2 hours"}</div>
        </button>
        <div className="sticker rounded-3xl bg-ink p-5 text-left text-bg dark:bg-surface-2 dark:text-ink">
          <div className="text-3xl">✍️</div>
          <div className="mt-3 font-display text-xl font-extrabold">Full Mains mock</div>
          <div className="text-sm opacity-90">20 Qs · 250 marks · 3 hours</div>
          <div className="mt-3 flex gap-2">
            <select value={mainsPaper} onChange={(e) => setMainsPaper(e.target.value)} aria-label="Mains paper"
              className="rounded-xl bg-bg px-2 py-1.5 text-sm font-semibold text-ink">
              {["GS1", "GS2", "GS3", "GS4", "PSIR"].map((p) => <option key={p}>{p}</option>)}
            </select>
            <button onClick={() => fullMainsMock(mainsPaper, setLaunch)} className="rounded-xl bg-lime px-3 py-1.5 text-sm font-bold text-[#17152b]">Start</button>
          </div>
        </div>
        <Link href="/practice/" className="sticker sticker-hover rounded-3xl bg-surface p-5">
          <div className="text-3xl">🎯</div>
          <div className="mt-3 font-display text-xl font-extrabold">Sectional practice</div>
          <div className="text-sm text-ink-2">GS I–IV, PSIR · Prelims or Mains</div>
        </Link>
        <Link href="/pyq/" className="sticker sticker-hover rounded-3xl bg-lime p-5 text-[#17152b]">
          <div className="text-3xl">📜</div>
          <div className="mt-3 font-display text-xl font-extrabold">PYQ Lab</div>
          <div className="text-sm opacity-80">Year papers, heat maps, traps</div>
        </Link>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Today in current affairs</h2>
            <Link href="/current-affairs/" className="text-sm font-semibold text-primary">All cards →</Link>
          </div>
          {ca.loading ? <Loading /> : ca.error ? <ErrorBox error={ca.error} /> : (
            <ul className="mt-3 divide-y divide-line">
              {(ca.data?.articles ?? []).slice(0, 4).map((a) => (
                <li key={a.id} className="py-3">
                  <div className="flex flex-wrap gap-1">{gsPapers(a.gs_tags).map((g) => <Chip key={g} tone="primary">{g}</Chip>)}
                    {a.demo && <Chip>demo</Chip>}</div>
                  <Link href={`/current-affairs/?date=${a.date}#${a.id}`} className="mt-1 block font-semibold hover:underline">{a.headline}</Link>
                </li>
              ))}
              {ca.data?.articles.length === 0 && <li className="py-6 text-sm text-muted">No digest yet today.</li>}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card sticker>
            <div className="flex items-center gap-2 font-display text-lg font-bold"><Sparkles size={18} className="text-saffron" /> Prelims chance meter</div>
            {chance.data?.status === "OK" && chance.data.band ? (
              <div className="mt-2">
                <div className="font-mono text-3xl font-bold">{chance.data.band[0]}–{chance.data.band[1]}%</div>
                <div className="text-xs text-muted">{chance.data.confidence} confidence · TamGam tests only, not a prediction</div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-ink-2">
                <div className="flex items-center gap-2 font-semibold"><Lock size={14} /> Locked until you have enough data</div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, ((s?.questions_answered ?? 0) / 300) * 100)}%` }} />
                </div>
                <div className="mt-1 text-xs text-muted">{s?.questions_answered ?? 0} / 300 Prelims questions answered</div>
              </div>
            )}
            <Link href="/analytics/" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">Open analytics <ArrowRight size={14} /></Link>
          </Card>

          {notes.data?.suggestion && (
            <Card className="bg-primary-soft">
              <div className="flex items-center gap-2 font-display font-bold"><NotebookPen size={16} /> Suggested note</div>
              <p className="mt-1 text-sm text-ink-2">Your report flagged <b>{notes.data.suggestion.topic_id}</b> as the highest-leverage fix.</p>
              <Link href={`/notes/?topic=${notes.data.suggestion.topic_id}`} className="mt-2 inline-block text-sm font-bold text-primary">Open one-pager →</Link>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Recent attempts</h2>
              <Link href="/history/" className="text-sm font-semibold text-primary">History →</Link>
            </div>
            <ul className="mt-2 space-y-2">
              {(recent.data?.items ?? []).map((a) => (
                <li key={a.attempt_id}>
                  <Link href={a.status === "IN_PROGRESS" ? `/attempt/?scope=${a.scope}&test=${a.test_id}` : resultUrl(a.scope, a.attempt_id)}
                    className="flex items-center justify-between rounded-2xl px-2 py-2 hover:bg-surface-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{a.title ?? SCOPE_LABEL[a.scope]}</div>
                      <div className="text-xs text-muted">{fmtDate(a.started_at)}</div>
                    </div>
                    {a.status === "IN_PROGRESS" ? <Chip tone="saffron"><Timer size={12} /> resume</Chip>
                      : a.max_score ? <span className="font-mono text-sm font-bold">{a.score}/{a.max_score}</span>
                      : <Chip tone="primary">{a.status.toLowerCase()}</Chip>}
                  </Link>
                </li>
              ))}
              {recent.data?.items.length === 0 && <li className="py-4 text-sm text-muted">Nothing yet — your first test is one tap away.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
