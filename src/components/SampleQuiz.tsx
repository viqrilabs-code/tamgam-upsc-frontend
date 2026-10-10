"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Chip, cx } from "./ui";

type Q = { qid: string; year: number; stem: string; statements: string[]; tail?: string | null; options: string[]; answer: number; explanation: string };
const L = ["a", "b", "c", "d"];

function track(step: "sample_start" | "sample_done") {
  try {
    fetch(`${API_BASE}/api/v1/platform/funnel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step }) }).catch(() => {});
  } catch { /* ignore */ }
}

/** Landing-page taste: 5 real UPSC Prelims questions, no sign-in. Graded in the browser — no AI, one cached read. */
export default function SampleQuiz({ fallback }: { fallback: React.ReactNode }) {
  const [qs, setQs] = useState<Q[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<(number | null)[]>([]);
  const started = useRef(false);

  async function load() {
    setQs(null); setI(0); setPicked([]); setFailed(false);
    try {
      const r = await fetch(`${API_BASE}/api/v1/pyq/sample?n=5`);
      if (!r.ok) throw new Error();
      const items = (await r.json()).items as Q[];
      if (!items.length) throw new Error();
      setQs(items); setPicked(items.map(() => null));
    } catch { setFailed(true); }
  }
  useEffect(() => { load(); }, []);

  if (failed) return <>{fallback}</>;
  if (!qs) return <div className="sticker grid h-80 place-items-center rounded-[2rem] bg-surface text-sm text-muted">Loading real UPSC questions…</div>;

  const done = i >= qs.length;
  const right = picked.filter((p, k) => p === qs[k]?.answer).length;
  const wrong = picked.filter((p, k) => p !== null && p !== qs[k]?.answer).length;
  const marks = Math.round((right * 2 - wrong * 0.66) * 100) / 100;

  function choose(o: number) {
    if (picked[i] !== null) return;
    if (!started.current) { started.current = true; track("sample_start"); }
    setPicked(picked.map((p, k) => (k === i ? o : p)));
  }
  function next() {
    if (i + 1 >= qs!.length) track("sample_done");
    setI(i + 1);
  }

  if (done) {
    const pct = Math.round((right / qs.length) * 100);
    return (
      <div className="sticker rounded-[2rem] bg-surface p-6">
        <Chip tone="lime">Your score</Chip>
        <div className="mt-3 font-mono text-5xl font-bold">{right}<span className="text-2xl text-muted">/{qs.length}</span></div>
        <p className="mt-1 text-sm text-ink-2">{marks} marks with UPSC&apos;s +2 / −0.66 marking · {pct >= 60 ? "Topper territory 🏆" : pct >= 40 ? "Solid start 📈" : "Every topper started here 🌱"}</p>
        <div className="mt-5 rounded-2xl bg-primary-soft p-4">
          <div className="font-display text-lg font-bold">Now take the real thing — free</div>
          <p className="mt-1 text-sm text-ink-2">A full 100-question Prelims mock with a 2-hour timer, topic-wise strengths and weak spots, and 13+ years of UPSC papers.</p>
          <Link href="/login/" className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 font-bold text-primary-ink">
            Sign up free <ArrowRight size={16} /></Link>
          <p className="mt-2 text-xs text-muted">Google or email · 30 seconds · no card</p>
        </div>
        <button onClick={load} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><RotateCcw size={14} /> Try 5 more</button>
      </div>
    );
  }

  const q = qs[i], p = picked[i];
  return (
    <div className="sticker rounded-[2rem] bg-surface p-6">
      <div className="flex items-center justify-between gap-2">
        <Chip tone="primary">Real UPSC Prelims {q.year}</Chip>
        <span className="font-mono text-sm font-bold text-saffron">{i + 1} / {qs.length}</span>
      </div>
      <p className="mt-4 whitespace-pre-line font-semibold">{q.stem}</p>
      {q.statements.length > 0 && (
        <ol className="mt-3 space-y-1.5 text-sm text-ink-2">{q.statements.map((s, k) => <li key={k}>{k + 1}. {s}</li>)}</ol>)}
      {q.tail && <p className="mt-2 whitespace-pre-line text-sm font-semibold">{q.tail}</p>}
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {q.options.map((o, k) => {
          const isAns = p !== null && k === q.answer, isWrong = p === k && k !== q.answer;
          return (
            <button key={k} onClick={() => choose(k)} disabled={p !== null}
              className={cx("rounded-2xl border-2 px-3 py-2 text-left font-semibold transition",
                isAns ? "border-green bg-green-soft text-green" : isWrong ? "border-danger bg-danger-soft text-danger"
                  : p === null ? "border-line hover:border-primary" : "border-line opacity-60")}>
              ({L[k]}) {o}
            </button>);
        })}
      </div>
      {p === null ? <p className="mt-3 text-xs text-muted">Tap an answer — no sign-up needed.</p> : (
        <div className="mt-4 space-y-3">
          <div className={cx("flex items-start gap-2 rounded-2xl p-3 text-sm", p === q.answer ? "bg-green-soft" : "bg-surface-2")}>
            {p === q.answer ? <CheckCircle2 size={18} className="shrink-0 text-green" /> : <XCircle size={18} className="shrink-0 text-danger" />}
            <span>{p === q.answer ? "Correct! " : `The answer is (${L[q.answer]}). `}
              <span className="text-ink-2">{q.explanation ? q.explanation.slice(0, 400) + (q.explanation.length > 400 ? "…" : "") : ""}</span></span>
          </div>
          <button onClick={next} className="inline-flex items-center gap-2 rounded-2xl bg-ink px-4 py-2 text-sm font-bold text-bg">
            {i + 1 < qs.length ? "Next question" : "See my score"} <ArrowRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
