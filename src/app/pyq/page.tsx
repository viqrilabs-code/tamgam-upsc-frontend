"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Play } from "lucide-react";
import AppShell from "@/components/AppShell";
import { HeatGrid } from "@/components/charts";
import { Bar, Button, Card, Chip, Empty, ErrorBox, Loading, PageHeader, Segmented, cx } from "@/components/ui";
import { content } from "@/lib/api";
import { useAsync, useSession } from "@/lib/hooks";
import { FORMAT_LABEL } from "@/lib/labels";
import LaunchOverlay from "@/components/LaunchOverlay";
import { type LaunchState, pyqTest } from "@/lib/tests";
import type { Question, SyllabusNode } from "@/lib/types";

type Index = { papers: { paper: string; years: number[]; n: number; sample_only: boolean }[] };
type Insight = { topic_id: string; total: number; last_window: number; years_asked: number; last_year: number;
  gap_years: number; trend: "rising" | "falling" | "steady"; status: "hot" | "evergreen" | "due" | "fading" | "occasional" };
type Analysis = {
  paper: string; years: number[]; sample_only: boolean; no_data?: boolean; n_items: number;
  heat_map: Record<string, Record<string, number>>;
  topic_weights: Record<string, number>; format_profile: Record<string, Record<string, number>>;
  subject_trend?: Record<string, Record<string, number>>; topic_insights?: Insight[]; strategy?: string[];
  statement_profile?: { statement_counts: Record<string, number>; how_many_share_by_year: Record<string, number> };
  option_stats: { answer_key_distribution: Record<string, number>; how_many_resolution: Record<string, number>;
    heuristics: { id: string; rule: string; train_false_rate: number | null; baseline_false_rate: number | null;
      holdout_hit_rate: number | null; holdout_years: number[]; n_holdout: number; label: string }[] };
};
type Item = Question & { official_key: number; explanation?: string };

const PAPER_LABEL: Record<string, string> = { PRE_GS1: "Prelims GS I", GS1: "Mains GS I", GS2: "Mains GS II", GS3: "Mains GS III", GS4: "Mains GS IV", PSIR_P1: "PSIR I", PSIR_P2: "PSIR II" };

export default function PyqLab() {
  const session = useSession();
  const [tab, setTab] = useState<"browse" | "analysis" | "strategy">("browse");
  const [paper, setPaper] = useState("PRE_GS1");
  const [year, setYear] = useState<number>();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [launchState, setLaunch] = useState<LaunchState>({ kind: "idle" });

  const index = useAsync(() => content<Index>("pyq/index.json"), []);
  const cur = index.data?.papers.find((p) => p.paper === paper);
  useEffect(() => { if (cur && (!year || !cur.years.includes(year))) setYear(cur.years[cur.years.length - 1]); }, [cur]); // eslint-disable-line
  const items = useAsync(async () => (year ? content<{ items: Item[] }>(`pyq/${paper}/${year}.json`) : null), [paper, year]);
  const analysis = useAsync(() => content<Analysis>(`analysis/${paper}.json`), [paper]);
  const names = useAsync(async () => {
    const all = await Promise.all(["GS1", "GS2", "GS3", "GS4"].map((p) => content<{ nodes: SyllabusNode[] }>(`syllabus/${p}.json`).catch(() => ({ nodes: [] }))));
    return Object.fromEntries(all.flatMap((a) => a.nodes.map((n) => [n.node_id, n.name])));
  }, []);

  const heat = useMemo(() => {
    const hm = analysis.data?.heat_map ?? {};
    const rows = Object.keys(hm).sort((a, b) => (analysis.data?.topic_weights[b] ?? 0) - (analysis.data?.topic_weights[a] ?? 0));
    return { rows, cols: (analysis.data?.years ?? []).map(String), hm };
  }, [analysis.data]);

  if (!session) return null;
  const sample = cur?.sample_only;
  const noData = !analysis.data || analysis.data.no_data || analysis.data.sample_only || !analysis.data.n_items;

  return (
    <AppShell guestPreview={{ emoji: "📜", title: "PYQ Lab", points: [
      "Year-wise papers with answers to reveal", "Topic heat maps — what UPSC keeps asking",
      "Option-pattern strategy with measured hit rates", "PYQ tests that skip questions you've already seen"] }}>
      <PageHeader kicker="PYQ Lab" title="How UPSC actually asks"
        sub="Browse previous-year papers, see which topics keep coming back, and learn option patterns — with their measured hit rates."
        action={<div className="flex gap-2">
          <Button variant="outline" onClick={() => pyqTest({ mode: "RANDOM", paper, n: 25, stage: paper === "PRE_GS1" ? "PRELIMS" : "MAINS" }, setLaunch)}>
            Random unseen PYQs</Button>
          <Button onClick={() => pyqTest({ mode: year ? "YEAR" : "RANDOM", paper, year, n: 100, stage: paper === "PRE_GS1" ? "PRELIMS" : "MAINS" }, setLaunch)}>
            <Play size={16} /> Attempt {year ?? ""} paper</Button></div>} />
      <LaunchOverlay state={launchState} onClose={() => setLaunch({ kind: "idle" })} />

      {sample && (
        <div className="mb-5 rounded-2xl border-2 border-dashed border-saffron bg-saffron-soft p-3 text-sm">
          <b>Sample data.</b> These are PYQ-format practice items, not official questions. Admins import real papers (with official keys) via the PYQ import API.
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented value={tab} onChange={setTab} options={[{ value: "browse", label: "Browse" }, { value: "analysis", label: "Topic analysis" }, { value: "strategy", label: "Option strategy" }]} />
        <select value={paper} onChange={(e) => setPaper(e.target.value)} className="rounded-2xl border-2 border-line bg-surface px-3 py-2 text-sm font-semibold">
          {(index.data?.papers ?? []).map((p) => <option key={p.paper} value={p.paper}>{PAPER_LABEL[p.paper] ?? p.paper}</option>)}
        </select>
      </div>

      {index.loading ? <Loading /> : index.error ? <ErrorBox error={index.error} /> : tab === "browse" ? (
        <>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {(cur?.years ?? []).map((y) => (
              <button key={y} onClick={() => setYear(y)} className={cx("rounded-2xl border-2 px-3 py-1 font-mono text-sm font-bold",
                y === year ? "border-ink bg-ink text-bg dark:border-primary dark:bg-primary" : "border-line")}>{y}</button>
            ))}
          </div>
          {items.loading ? <Loading /> : (
            <div className="space-y-4">
              {(items.data?.items ?? []).map((it, i) => {
                const open = revealed.has(it.qid);
                return (
                  <Card key={it.qid}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-muted">Q{it.pyq_ref?.qno ?? i + 1}</span>
                      <Chip tone="primary">{names.data?.[it.topic_ids[0]] ?? it.topic_ids[0]}</Chip>
                      <Chip>{FORMAT_LABEL[it.format] ?? it.format}</Chip>
                      {it.sample && <Chip tone="saffron">sample</Chip>}
                    </div>
                    <p className="mt-3 font-semibold">{it.stem}</p>
                    {!!it.statements?.length && <ol className="mt-2 space-y-1 text-sm text-ink-2">{it.statements.map((s, j) => <li key={j}>{it.format === "STATEMENT_I_II" ? s : `${j + 1}. ${s}`}</li>)}</ol>}
                    {!!it.options?.length && (
                      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                        {it.options.map((o, j) => (
                          <div key={j} className={cx("rounded-xl border-2 px-3 py-1.5 text-sm", open && j === it.official_key ? "border-green bg-green-soft font-semibold" : "border-line")}>
                            <span className="font-mono font-bold">{"abcd"[j]}.</span> {o}
                          </div>
                        ))}
                      </div>
                    )}
                    {open ? (it.explanation ? <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm">{it.explanation}</p> : null) : (
                      <button onClick={() => setRevealed(new Set([...revealed, it.qid]))} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
                        <Eye size={14} /> Reveal answer
                      </button>
                    )}
                  </Card>
                );
              })}
              {items.data?.items.length === 0 && <Empty title="No questions for this year" />}
            </div>
          )}
        </>
      ) : analysis.loading ? <Loading /> : noData ? (
        <Empty icon="📭" title="No PYQ data for analysis yet">
          Analysis and strategy appear once official {PAPER_LABEL[paper] ?? paper} papers are uploaded by the TamGam team.
          {sample && " The questions under Browse are practice samples and are not used for analysis."}
        </Empty>
      ) : tab === "analysis" ? (
        <TopicAnalysis a={analysis.data!} name={(t) => names.data?.[t] ?? t} heat={heat} />
      ) : (
        <OptionStrategy a={analysis.data!} />
      )}
    </AppShell>
  );
}

const STATUS: Record<Insight["status"], { title: string; hint: string; tone: "danger" | "primary" | "saffron" | "green" }> = {
  hot: { title: "🔥 Hot", hint: "rising and asked recently", tone: "danger" },
  evergreen: { title: "🌳 Evergreen", hint: "asked almost every year", tone: "green" },
  due: { title: "⏳ Due for a comeback", hint: "asked repeatedly before, quiet for 3+ years", tone: "saffron" },
  fading: { title: "📉 Fading", hint: "asked less in recent papers", tone: "primary" },
  occasional: { title: "Occasional", hint: "", tone: "primary" },
};

function TopicAnalysis({ a, name, heat }: { a: Analysis; name: (t: string) => string;
  heat: { rows: string[]; cols: string[]; hm: Record<string, Record<string, number>> } }) {
  const years = a.years;
  const latest = String(years[years.length - 1]);
  const insights = a.topic_insights ?? [];
  const subjects = a.subject_trend ?? {};
  const subjectRows = [...new Set(Object.values(subjects).flatMap((y) => Object.keys(y)))]
    .sort((x, y) => (subjects[latest]?.[y] ?? 0) - (subjects[latest]?.[x] ?? 0));
  const fmtLatest = a.format_profile[latest] ?? {};
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><div className="font-mono text-3xl font-bold">{a.n_items}</div><div className="text-sm text-muted">official questions analysed</div></Card>
        <Card><div className="font-mono text-3xl font-bold">{years.length}</div><div className="text-sm text-muted">papers · {years[0]}–{latest}</div></Card>
        <Card><div className="font-mono text-3xl font-bold">{insights.filter((i) => i.status === "due").length}</div><div className="text-sm text-muted">topics due for a comeback</div></Card>
      </div>

      {!!a.strategy?.length && (
        <Card sticker>
          <Chip tone="lime">Strategy from the data</Chip>
          <ul className="mt-3 space-y-2">{a.strategy.map((s, i) => <li key={i} className="flex gap-2 text-sm"><span className="font-bold text-primary">{i + 1}.</span>{s}</li>)}</ul>
          <p className="mt-3 text-xs text-muted">Computed from official papers only. Your notes use the same analysis to decide what to emphasise.</p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {(["hot", "evergreen", "due"] as const).map((st) => {
          const list = insights.filter((i) => i.status === st).slice(0, 6);
          return (
            <Card key={st}>
              <h2 className="font-display text-lg font-bold">{STATUS[st].title}</h2>
              <p className="mb-2 text-xs text-muted">{STATUS[st].hint}</p>
              {list.length ? (
                <ul className="space-y-1.5">{list.map((i) => (
                  <li key={i.topic_id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{name(i.topic_id)}</span>
                    <span className="shrink-0 font-mono text-xs text-muted">{st === "due" ? `last ${i.last_year}` : `${i.last_window} recent · ${i.trend === "rising" ? "↑" : i.trend === "falling" ? "↓" : "→"}`}</span>
                  </li>))}</ul>
              ) : <p className="text-sm text-muted">None right now.</p>}
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <h2 className="font-display text-lg font-bold">Questions per topic per year</h2>
          <p className="mb-3 text-xs text-muted">Darker = more questions. Hover a cell for the count. Rows sorted by 5-year weight.</p>
          <HeatGrid rows={heat.rows} cols={heat.cols} value={(r, c) => heat.hm[r]?.[c] ?? 0} rowLabel={name} />
        </Card>
        <Card>
          <h2 className="font-display text-lg font-bold">Expected questions per 100</h2>
          <p className="mb-3 text-xs text-muted">5-year moving average — this weight drives test assembly and your analytics.</p>
          <div className="space-y-3">
            {Object.entries(a.topic_weights).sort((x, y) => y[1] - x[1]).slice(0, 12).map(([t, w]) => (
              <Bar key={t} value={w} max={Math.max(...Object.values(a.topic_weights))} label={name(t)} />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-bold">Subject share by year (%)</h2>
          <p className="mb-3 text-xs text-muted">Where the marks have moved — compare the latest columns with older ones.</p>
          <HeatGrid rows={subjectRows} cols={years.map(String)} value={(r, c) => Math.round((subjects[c]?.[r] ?? 0) * 100)} rowLabel={name} />
        </Card>
        <Card>
          <h2 className="font-display text-lg font-bold">How {latest} questions were framed</h2>
          <div className="mt-3 space-y-2">
            {Object.entries(fmtLatest).sort((x, y) => y[1] - x[1]).map(([f, v]) => <Bar key={f} value={v * 100} label={FORMAT_LABEL[f] ?? f} />)}
          </div>
        </Card>
      </div>
    </div>
  );
}

function OptionStrategy({ a }: { a: Analysis }) {
  const hmYears = Object.entries(a.statement_profile?.how_many_share_by_year ?? {});
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {a.option_stats.heuristics.map((h) => (
        <Card sticker key={h.id} className="md:col-span-2">
          <Chip tone="lime">Heuristic</Chip>
          <h2 className="mt-2 font-display text-xl font-bold">{h.rule}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="False rate with qualifier" value={h.train_false_rate} />
            <Stat label="False rate without" value={h.baseline_false_rate} />
            <Stat label={`Hit rate on held-out ${h.holdout_years.join(", ") || "years"}`} value={h.holdout_hit_rate} />
          </div>
          <p className="mt-3 text-xs text-muted">{h.label} Based on {h.n_holdout} held-out statements.</p>
        </Card>
      ))}
      <Card>
        <h2 className="font-display text-lg font-bold">Answer-key distribution</h2>
        <div className="mt-3 space-y-2">
          {Object.entries(a.option_stats.answer_key_distribution).map(([k, v]) => <Bar key={k} value={v * 100} label={`Option (${k})`} />)}
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-lg font-bold">&ldquo;How many are correct?&rdquo; resolves to</h2>
        <div className="mt-3 space-y-2">
          {Object.entries(a.option_stats.how_many_resolution).map(([k, v]) => <Bar key={k} value={v * 100} label={k === "all" ? "All" : k === "none" ? "None" : `Only ${k}`} />)}
        </div>
      </Card>
      {hmYears.length > 0 && (
        <Card className="md:col-span-2">
          <h2 className="font-display text-lg font-bold">Share of &ldquo;how many are correct&rdquo; questions</h2>
          <p className="mb-3 text-xs text-muted">This format removes elimination shortcuts — if it is rising, practise judging every statement on its own.</p>
          <div className="grid gap-2 sm:grid-cols-2">{hmYears.map(([y, v]) => <Bar key={y} value={v * 100} label={y} />)}</div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <div className="font-mono text-2xl font-bold">{value == null ? "—" : `${Math.round(value * 100)}%`}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
