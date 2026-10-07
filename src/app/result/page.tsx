"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleSlash, RotateCcw, XCircle } from "lucide-react";
import AppShell from "@/components/AppShell";
import WaitingRoom from "@/components/WaitingRoom";
import { Bar, Button, Card, Chip, ErrorBox, Loading, Modal, PageHeader, Ring, Segmented, cx } from "@/components/ui";
import { api, sleep } from "@/lib/api";
import { useSearch, useSession } from "@/lib/hooks";
import { BUCKET_LABEL, DIM_LABEL, FORMAT_LABEL, fmtDate } from "@/lib/labels";
import type { Explanation, Result, TopicRow } from "@/lib/types";

const LETTERS = ["a", "b", "c", "d"];

function vibe(pct: number) {
  if (pct >= 60) return { emoji: "🏆", line: "Topper behaviour. Keep that energy." };
  if (pct >= 45) return { emoji: "🔥", line: "Solid — cutoff territory is in sight." };
  if (pct >= 30) return { emoji: "📈", line: "Getting there. The explanations below are the real gold." };
  return { emoji: "🌱", line: "Every topper started here. Review, revise, retry." };
}

export default function ResultPage() {
  const session = useSession();
  const q = useSearch();
  const scope = q.get("scope") ?? "";
  const attempt = q.get("attempt") ?? "";
  const [r, setR] = useState<Result>();
  const [err, setErr] = useState<unknown>();
  const [filter, setFilter] = useState<"all" | "wrong" | "correct" | "skipped">("all");
  const [report, setReport] = useState<Explanation | null>(null);

  useEffect(() => {
    if (!scope || !attempt) return;
    let alive = true;
    (async () => {
      try {
        for (let i = 0; alive; i++) {
          const res = await api<Result>(`/api/v1/${scope}/attempts/${attempt}/result`);
          setR(res);
          if (res.status !== "EVALUATING" || i > 120) break;
          await sleep(4000);
        }
      } catch (e) { setErr(e); }
    })();
    return () => { alive = false; };
  }, [scope, attempt]);

  if (!session) return null;
  if (err) return <AppShell><ErrorBox error={err} /></AppShell>;
  if (!r) return <AppShell><Loading label="Crunching your result" /></AppShell>;

  if (r.stage === "MAINS") return <AppShell><MainsResult r={r} /></AppShell>;

  const pct = r.max_score ? Math.max(0, (100 * (r.score ?? 0)) / r.max_score) : 0;
  const v = vibe(pct);
  const list = (r.explanations ?? []).filter((e) =>
    filter === "all" ? true : filter === "wrong" ? e.correct === false : filter === "correct" ? e.correct === true : e.your_choice == null);

  return (
    <AppShell>
      <PageHeader kicker={fmtDate(r.submitted_at)} title={r.title ?? "Result"}
        action={<Link href="/practice/" className="inline-flex items-center gap-2 text-sm font-bold text-primary"><RotateCcw size={14} /> New test</Link>} />

      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <Card sticker className="flex items-center gap-6">
          <Ring value={pct} size={150} stroke={14}>
            <div>
              <div className="font-mono text-3xl font-bold">{r.score}</div>
              <div className="text-xs font-semibold text-muted">of {r.max_score}</div>
            </div>
          </Ring>
          <div>
            <div className="text-4xl">{v.emoji}</div>
            <div className="mt-1 max-w-[220px] font-display text-lg font-bold leading-tight">{v.line}</div>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Accuracy", value: `${r.accuracy ?? 0}%`, icon: CheckCircle2, tone: "text-green" },
            { label: "Correct", value: r.correct, icon: CheckCircle2, tone: "text-green" },
            { label: "Wrong (−0.66)", value: r.wrong, icon: XCircle, tone: "text-danger" },
            { label: "Skipped", value: (r.n ?? 0) - (r.attempted ?? 0), icon: CircleSlash, tone: "text-muted" },
          ].map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className="flex flex-col justify-between">
              <Icon size={18} className={tone} />
              <div className="mt-3 font-mono text-3xl font-bold">{value}</div>
              <div className="text-xs font-semibold text-muted">{label}</div>
            </Card>
          ))}
        </div>
      </div>

      {r.topic_summary && <div className="mt-4"><TopicSummary s={r.topic_summary} stage="PRELIMS" /></div>}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-bold">By topic</h2>
          <p className="text-xs text-muted">Accuracy on attempted questions</p>
          <div className="mt-4 space-y-3">
            {(r.per_topic ?? []).map((t) => (
              <Bar key={t.key} value={t.accuracy} label={`${t.name ?? t.key} · ${t.correct}/${t.attempted}`}
                   tone={t.accuracy == null ? "primary" : t.accuracy >= 60 ? "green" : t.accuracy >= 40 ? "saffron" : "danger"}
                   hint={`${t.total} question(s), ${t.attempted} attempted`} />
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-lg font-bold">By format</h2>
          <p className="text-xs text-muted">Multi-statement is ~60% of the real paper</p>
          <div className="mt-4 space-y-3">
            {(r.per_format ?? []).map((t) => (
              <Bar key={t.key} value={t.accuracy} label={`${FORMAT_LABEL[t.key] ?? t.key} · ${t.correct}/${t.attempted}`} />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {(r.per_bucket ?? []).map((b) => (
              <Chip key={b.key}>{BUCKET_LABEL[b.key] ?? b.key}: {b.correct}/{b.total}</Chip>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold">Explanations</h2>
        <Segmented value={filter} onChange={setFilter}
          options={[{ value: "all", label: "All" }, { value: "wrong", label: "Wrong" }, { value: "correct", label: "Correct" }, { value: "skipped", label: "Skipped" }]} />
      </div>
      <div className="mt-4 space-y-4">
        {list.map((e) => (
          <Card key={e.qid} className={cx("border-l-8", e.correct === true ? "border-l-green" : e.correct === false ? "border-l-danger" : "border-l-line")}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-muted">Q{(r.explanations ?? []).indexOf(e) + 1}</span>
              {e.topic_name && <Chip tone="primary">{e.topic_name}</Chip>}
              <Chip>{FORMAT_LABEL[e.format] ?? e.format}</Chip>
              {e.pyq_ref && <Chip tone="saffron">PYQ {e.pyq_ref.year}</Chip>}
              {e.sample && <Chip>sample</Chip>}
              <button onClick={() => setReport(e)} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-danger">
                <AlertTriangle size={12} /> Report
              </button>
            </div>
            <p className="mt-3 font-semibold">{e.stem}</p>
            {!!e.statements?.length && (
              <ol className="mt-2 space-y-1 text-sm text-ink-2">{e.statements.map((s, i) => <li key={i}>{e.format === "STATEMENT_I_II" || /^[IVX]+\.\s/.test(s) ? s : `${i + 1}. ${s}`}</li>)}</ol>
            )}
            {e.tail && <p className="mt-2 whitespace-pre-line text-sm font-semibold">{e.tail}</p>}
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {e.options.map((o, i) => (
                <div key={i} className={cx("rounded-xl border-2 px-3 py-1.5 text-sm",
                  i === e.answer_key ? "border-green bg-green-soft font-semibold" : i === e.your_choice ? "border-danger bg-danger-soft" : "border-line")}>
                  <span className="font-mono font-bold">{LETTERS[i]}.</span> {o}
                  {i === e.answer_key && " ✓"}{i === e.your_choice && i !== e.answer_key && " (yours)"}
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm">
              <span className="font-bold">Why: </span>{e.explanation}
              {e.elimination_hint && <div className="mt-1.5 text-ink-2">💡 <span className="font-semibold">Elimination:</span> {e.elimination_hint}</div>}
            </div>
          </Card>
        ))}
      </div>

      <ReportModal scope={scope} item={report} onClose={() => setReport(null)} />
    </AppShell>
  );
}

function ReportModal({ scope, item, onClose }: { scope: string; item: Explanation | null; onClose: () => void }) {
  const [reason, setReason] = useState("WRONG_KEY");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDone(false); setNote(""); }, [item]);
  return (
    <Modal open={!!item} onClose={onClose} title="Report this question">
      {done ? <p className="text-sm">Thanks! A reviewer will check it. Questions with 3 independent reports are pulled until reviewed. 🙏</p> : (
        <div className="space-y-3">
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-2xl border-2 border-line bg-bg px-3 py-2">
            <option value="WRONG_KEY">Answer key is wrong</option>
            <option value="AMBIGUOUS">Ambiguous / two answers</option>
            <option value="OUTDATED">Outdated fact</option>
            <option value="TYPO">Typo / formatting</option>
            <option value="OTHER">Other</option>
          </select>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="Optional details (source helps!)"
            className="w-full rounded-2xl border-2 border-line bg-bg p-3 text-sm" />
          <Button loading={busy} className="w-full" onClick={async () => {
            if (!item) return;
            setBusy(true);
            try {
              await api(`/api/v1/${scope}/questions/${item.qid}/report`, { method: "POST", json: { reason, note: note || null } });
              setDone(true);
            } finally { setBusy(false); }
          }}>Send report</Button>
        </div>
      )}
    </Modal>
  );
}

function TopicSummary({ s, stage }: { s: NonNullable<Result["topic_summary"]>; stage: "PRELIMS" | "MAINS" }) {
  const line = (t: TopicRow) => stage === "PRELIMS"
    ? `${t.correct ?? 0}/${t.attempted ?? 0} correct${t.total && t.attempted !== t.total ? ` · ${(t.total ?? 0) - (t.attempted ?? 0)} skipped` : ""}`
    : `${t.full ?? 0} of ${t.questions ?? 0} answered fully${t.answered !== t.questions ? ` · ${(t.questions ?? 0) - (t.answered ?? 0)} skipped` : ""}`;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <h2 className="font-display text-lg font-bold text-green">Strong topics</h2>
        {s.strong.length ? <ul className="mt-2 space-y-1.5 text-sm">{s.strong.map((t) => <li key={t.topic_id}><b>{t.name}</b> <span className="text-muted">· {line(t)}</span></li>)}</ul>
          : <p className="mt-2 text-sm text-muted">{stage === "PRELIMS" ? "No topic reached 70% on 2+ questions yet." : "No topic answered fully yet."}</p>}
      </Card>
      <Card>
        <h2 className="font-display text-lg font-bold text-saffron">Weak topics — revise these</h2>
        {s.weak.length ? <ul className="mt-2 space-y-1.5 text-sm">{s.weak.map((t) => <li key={t.topic_id}><b>{t.name}</b> <span className="text-muted">· {line(t)}</span></li>)}</ul>
          : <p className="mt-2 text-sm text-muted">Nothing stands out — well done.</p>}
      </Card>
    </div>
  );
}

function MainsResult({ r }: { r: Result }) {
  const evaluating = r.status === "EVALUATING";
  if (r.eval_mode === "none") return <MainsPractice r={r} />;
  return (
    <>
      <PageHeader kicker="Mains evaluation" title={r.title ?? "Your answers"}
        sub={evaluating
          ? `Evaluating… ${r.eval_mode === "batch" ? "Free-plan answers are batched — results within a few hours." : "Usually done in a few minutes."}`
          : "Marks are computed from rubric dimension scores — the same weights for everyone."} />
      {!evaluating && (
        <Card sticker className="mb-6 flex items-center gap-6">
          <Ring value={r.max_marks ? (100 * (r.marks ?? 0)) / r.max_marks : 0} tone="saffron">
            <div><div className="font-mono text-2xl font-bold">{r.marks}</div><div className="text-xs text-muted">of {r.max_marks}</div></div>
          </Ring>
          <p className="max-w-md text-sm text-ink-2">Toppers typically score 40–50% in GS Mains. Focus on the improvements below — they&apos;re specific to your answer.</p>
        </Card>
      )}
      {evaluating && (
        <Card className="mb-6 grid place-items-center py-6">
          <WaitingRoom title="Your evaluator is reading carefully"
            message={r.eval_mode === "batch" ? "Batched evaluation — you can leave; results appear here." : "Scoring each answer against the rubric…"} />
        </Card>
      )}
      <div className="space-y-5">
        {(r.answers ?? []).filter((a) => a.answered).map((a, i) => (
          <Card key={a.qid}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold"><span className="mr-2 font-mono text-muted">Q{i + 1}</span>{a.stem}</p>
              {a.evaluation && <span className="shrink-0 rounded-2xl bg-saffron-soft px-3 py-1 font-mono text-lg font-bold text-saffron">{a.evaluation.marks}/{a.max_marks}</span>}
            </div>
            {a.evaluation ? (
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div className="space-y-3">
                  {Object.entries(a.evaluation.dims).map(([k, v]) => (
                    <Bar key={k} value={v} max={10} label={DIM_LABEL[k] ?? k} hint={a.evaluation!.comments[k]}
                         tone={v >= 7 ? "green" : v >= 4.5 ? "saffron" : "danger"} />
                  ))}
                  {a.evaluation.dev_heuristic && <p className="text-xs text-muted">Dev heuristic score — configure an OpenAI key for real evaluation.</p>}
                </div>
                <div className="space-y-3 text-sm">
                  <div><div className="font-bold text-green">What worked</div><ul className="mt-1 list-disc pl-5 text-ink-2">{a.evaluation.strengths.map((s) => <li key={s}>{s}</li>)}</ul></div>
                  <div><div className="font-bold text-saffron">Level up</div><ul className="mt-1 list-disc pl-5 text-ink-2">{a.evaluation.improvements.map((s) => <li key={s}>{s}</li>)}</ul></div>
                  {!!a.evaluation.missed_dimensions.length && (
                    <div className="flex flex-wrap gap-1">{a.evaluation.missed_dimensions.map((d) => <Chip key={d} tone="danger">missed: {d}</Chip>)}</div>
                  )}
                  {!!a.evaluation.doubtful_claims.length && (
                    <div className="rounded-xl bg-danger-soft p-2 text-xs text-danger">Check these claims: {a.evaluation.doubtful_claims.join("; ")}</div>
                  )}
                </div>
                <details className="md:col-span-2">
                  <summary className="cursor-pointer text-sm font-bold text-primary">Model-answer outline</summary>
                  <ul className="mt-2 list-disc pl-5 text-sm text-ink-2">{(a.evaluation.model_outline.length ? a.evaluation.model_outline : a.model_outline ?? []).map((s) => <li key={s}>{s}</li>)}</ul>
                </details>
              </div>
            ) : <p className="mt-3 text-sm text-muted">{a.status === "SAVED" ? "Queued for evaluation…" : a.status}</p>}
          </Card>
        ))}
      </div>
    </>
  );
}


/** Free PYQ practice: no AI evaluation — topic coverage from word counts, and the answers as written. */
function MainsPractice({ r }: { r: Result }) {
  return (
    <>
      <PageHeader kicker="Mains PYQ practice" title={r.title ?? "Your answers"}
        sub="Your answers are saved. On the free plan, PYQ answers aren't AI-evaluated — below is which topics you covered, judged by how fully you answered." />
      <Card sticker className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-primary-soft">
        <p className="text-sm text-ink-2">Want marks out of 10/15, rubric scores and a model-answer outline for every answer?</p>
        <Link href="/plans/" className="sticker sticker-hover inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-ink">Get AI evaluation with a pass</Link>
      </Card>
      {r.topic_summary && <div className="mb-6"><TopicSummary s={r.topic_summary} stage="MAINS" /></div>}
      <div className="space-y-4">
        {(r.answers ?? []).map((a, i) => {
          const words = (a.your_text ?? "").split(/\s+/).filter(Boolean).length;
          return (
            <Card key={a.qid}>
              <p className="font-semibold"><span className="mr-2 font-mono text-muted">Q{i + 1}</span>{a.stem}</p>
              <p className="mt-2 text-xs text-muted">
                {!a.answered ? "Not answered" : words ? `${words} of ${a.word_limit ?? 150} words` : "Handwritten pages attached"}
                {a.max_marks ? ` · ${a.max_marks} marks` : ""}</p>
              {a.your_text && <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-ink-2">{a.your_text}</p>}
            </Card>
          );
        })}
      </div>
    </>
  );
}
