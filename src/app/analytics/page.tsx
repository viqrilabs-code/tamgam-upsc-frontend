"use client";

import Link from "next/link";
import { useState } from "react";
import { Info, Lock, RefreshCw, Sparkles } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Bar, Button, Card, Chip, Empty, ErrorBox, Loading, PageHeader, Segmented } from "@/components/ui";
import { api, sleep } from "@/lib/api";
import { useAsync, useSession } from "@/lib/hooks";
import { DIM_LABEL, FORMAT_LABEL, fmtDate } from "@/lib/labels";

type Cell = { topic_id: string; weight: number; theta: number; n: number; accuracy: number };
type Report = {
  report_id: string; created_at: string; narrative: string[]; disclaimer: string; names: Record<string, string>;
  verdict: { critical_weaknesses: Cell[]; core_strengths: Cell[]; deprioritise: Cell[]; maintain: Cell[] };
  chance: { status: string; band?: [number, number]; confidence?: string; score_mean?: number; cutoff_mean?: number;
    cutoff_basis?: string; sufficiency: { answered: number; needed: number; coverage: number; coverage_needed: number };
    inputs?: { questions_answered: number; topics_practised: number; attempt_rate: number; cutoff_years: string[] } };
  mains_readiness: Record<string, { band: string; confidence: string; n: number; needed: number; avg_pct?: number | null }>;
  recommendation: { topic_id: string; delta_p?: number; p_new?: number; acc_now: number; acc_target?: number; hours?: number; questions_per_paper?: number; locked?: boolean } | null;
};
type Mastery = { topics: { topic_id: string; name: string; paper: string; theta: number; ci: number; n: number; accuracy: number | null;
  p_avg_question: number; pyq_weight: number; weakness: number }[]; formats: { format: string; n: number; accuracy: number | null }[] };
type Summary = { mains: Record<string, { answers: number; dims: Record<string, number> }> };

const GRID: { key: keyof Report["verdict"]; title: string; hint: string; tone: string }[] = [
  { key: "critical_weaknesses", title: "Critical weaknesses", hint: "High PYQ weight · low mastery", tone: "bg-danger-soft" },
  { key: "core_strengths", title: "Core strengths", hint: "High PYQ weight · high mastery", tone: "bg-green-soft" },
  { key: "deprioritise", title: "Deprioritise", hint: "Low weight · low mastery", tone: "bg-surface-2" },
  { key: "maintain", title: "Maintain", hint: "Low weight · high mastery", tone: "bg-primary-soft" },
];

export default function Analytics() {
  const session = useSession();
  const [paper, setPaper] = useState("ALL");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>();
  const report = useAsync(() => api<Report>("/api/v1/analytics/me/report/latest"), []);
  const mastery = useAsync(() => api<Mastery>("/api/v1/analytics/me/mastery"), []);
  const summary = useAsync(() => api<Summary>("/api/v1/analytics/me/summary"), []);

  async function regenerate() {
    setBusy(true);
    setErr(undefined);
    try {
      const before = report.data?.report_id;
      await api("/api/v1/analytics/me/report", { method: "POST" });
      for (let i = 0; i < 30; i++) {
        await sleep(1500);
        const r = await api<Report>("/api/v1/analytics/me/report/latest").catch(() => null);
        if (r && r.report_id !== before) { report.setData(r); break; }
      }
    } catch (e) { setErr(e); } finally { setBusy(false); }
  }

  if (!session) return null;
  const r = report.data;
  const topics = (mastery.data?.topics ?? []).filter((t) => paper === "ALL" || t.paper === paper);

  return (
    <AppShell guestPreview={{ emoji: "📊", title: "Honest analytics", points: [
      "Topic mastery and format skills from your own attempts", "Strengths and weaknesses against the PYQ benchmark",
      "One focused next move", "A chance estimate that stays locked until the data is sufficient"] }}>
      <PageHeader kicker="Analytics" title="Your honest verdict"
        sub="All numbers are computed from your TamGam attempts — no AI guesswork in the figures."
        action={<Button onClick={regenerate} loading={busy}><RefreshCw size={16} /> {r ? "Refresh report" : "Generate report"}</Button>} />
      {err ? <div className="mb-4"><ErrorBox error={err} /></div> : null}

      {report.loading ? <Loading /> : !r ? (
        <Empty icon="📊" title="No report yet">Take a few tests, then hit “Generate report”. Reports refresh at most every 6 hours.</Empty>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <Card sticker>
              <div className="flex items-center gap-2 font-display text-lg font-bold"><Sparkles size={18} className="text-saffron" /> The verdict</div>
              <ul className="mt-3 space-y-2.5">
                {r.narrative.map((line) => <li key={line} className="flex gap-2 text-[15px]"><span className="text-primary">→</span>{line}</li>)}
              </ul>
              <div className="mt-4 text-xs text-muted">Report from {fmtDate(r.created_at)}</div>
            </Card>

            <Card className="flex flex-col">
              <div className="font-display text-lg font-bold">Prelims chance</div>
              {r.chance.status === "OK" && r.chance.band ? (
                <>
                  <div className="mt-2 font-mono text-5xl font-bold">{r.chance.band[0]}–{r.chance.band[1]}<span className="text-2xl">%</span></div>
                  <div className="text-sm text-muted">{r.chance.confidence} confidence</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-surface-2 p-2">Simulated score <b className="font-mono">{r.chance.score_mean}</b></div>
                    <div className="rounded-xl bg-surface-2 p-2">Cutoff model <b className="font-mono">{r.chance.cutoff_mean}</b> ({r.chance.cutoff_basis})</div>
                  </div>
                </>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Lock size={14} /> Unlocks with enough data</div>
                  <Bar value={r.chance.sufficiency.answered} max={r.chance.sufficiency.needed} label={`Questions answered (need ${r.chance.sufficiency.needed})`} />
                  <Bar value={Math.round(r.chance.sufficiency.coverage * 100)} max={Math.round(r.chance.sufficiency.coverage_needed * 100)}
                       label={`Weighted topic coverage (need ${Math.round(r.chance.sufficiency.coverage_needed * 100)}%)`} tone="saffron" />
                </div>
              )}
              <p className="mt-auto flex gap-1.5 pt-4 text-[11px] leading-snug text-muted"><Info size={14} className="shrink-0" /> {r.disclaimer}</p>
            </Card>
          </div>

          {r.recommendation && (
            <Card className="mt-4 flex flex-wrap items-center justify-between gap-4 bg-lime/30">
              <div>
                <Chip tone="lime">Your one next move</Chip>
                <div className="mt-2 font-display text-2xl font-extrabold">{r.names[r.recommendation.topic_id] ?? r.recommendation.topic_id}</div>
                <p className="text-sm text-ink-2">
                  {r.recommendation.locked
                    ? `Highest-weight topic where you're weakest (accuracy ${r.recommendation.acc_now}%).`
                    : `Accuracy ${r.recommendation.acc_now}% → ${r.recommendation.acc_target}% could lift your estimate to ~${Math.round((r.recommendation.p_new ?? 0) * 100)}%. ≈${r.recommendation.questions_per_paper} Qs/paper · ~${r.recommendation.hours} h of study.`}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/notes/?topic=${r.recommendation.topic_id}`} className="rounded-2xl border-2 border-ink px-4 py-2 text-sm font-bold dark:border-line">Open notes</Link>
                <Link href={`/practice/?scope=gs${r.recommendation.topic_id[2]}`} className="sticker sticker-hover rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-ink">Drill it</Link>
              </div>
            </Card>
          )}

          <h2 className="mb-3 mt-8 font-display text-2xl font-extrabold">Weight × mastery</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {GRID.map((g) => (
              <div key={g.key} className={`rounded-3xl p-4 ${g.tone}`}>
                <div className="font-display font-bold">{g.title}</div>
                <div className="text-xs text-muted">{g.hint}</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {r.verdict[g.key].slice(0, 6).map((c) => (
                    <li key={c.topic_id} className="flex justify-between gap-2">
                      <span className="truncate">{r.names[c.topic_id] ?? c.topic_id}</span>
                      <span className="shrink-0 font-mono text-xs text-ink-2">{c.accuracy}% · {c.n}q</span>
                    </li>
                  ))}
                  {r.verdict[g.key].length === 0 && <li className="text-xs text-muted">—</li>}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">Topic mastery</h2>
            <Segmented value={paper} onChange={setPaper} options={["ALL", "GS1", "GS2", "GS3", "GS4"].map((p) => ({ value: p, label: p === "ALL" ? "All" : p }))} />
          </div>
          <p className="mb-4 mt-1 text-xs text-muted">Bar = chance of getting an average-difficulty question right (Elo model, decays without practice).</p>
          {mastery.loading ? <Loading /> : topics.length === 0 ? <p className="text-sm text-muted">No data yet.</p> : (
            <div className="space-y-3">
              {topics.map((t) => (
                <Bar key={t.topic_id} value={t.p_avg_question * 100}
                  tone={t.p_avg_question >= 0.6 ? "green" : t.p_avg_question >= 0.45 ? "primary" : "danger"}
                  label={`${t.name} · ${t.n}q${t.pyq_weight ? ` · ~${t.pyq_weight}/yr` : ""}`}
                  hint={`θ ${t.theta} ± ${t.ci} · accuracy ${t.accuracy ?? "—"}%`} />
              ))}
            </div>
          )}
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="font-display text-lg font-bold">Format skills</h2>
            <div className="mt-3 space-y-3">
              {(mastery.data?.formats ?? []).map((f) => <Bar key={f.format} value={f.accuracy} label={`${FORMAT_LABEL[f.format] ?? f.format} · ${f.n}q`} />)}
              {mastery.data?.formats.length === 0 && <p className="text-sm text-muted">No data yet.</p>}
            </div>
          </Card>
          <Card>
            <h2 className="font-display text-lg font-bold">Mains readiness</h2>
            <div className="mt-3 space-y-3">
              {Object.entries(r?.mains_readiness ?? {}).map(([p, m]) => (
                <div key={p} className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{p}</span>
                  <span className="flex items-center gap-2">
                    <Chip tone={m.band === "Competitive" ? "green" : m.band === "Developing" ? "saffron" : m.band === "Low" ? "danger" : "neutral"}>{m.band}</Chip>
                    <span className="text-xs text-muted">{m.n}/{m.needed} answers</span>
                  </span>
                </div>
              ))}
              {Object.entries(summary.data?.mains ?? {}).slice(0, 1).map(([p, m]) => (
                <div key={p} className="border-t border-line pt-3">
                  <div className="mb-2 text-xs text-muted">Rubric averages · {p}</div>
                  {Object.entries(m.dims).map(([d, v]) => <div key={d} className="mb-2"><Bar value={v} max={10} label={DIM_LABEL[d] ?? d} /></div>)}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
