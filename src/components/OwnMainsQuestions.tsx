"use client";

import { useState } from "react";
import { PenLine, Plus, Trash2 } from "lucide-react";
import { content } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import type { Entitlements } from "@/lib/hooks";
import { type LaunchState, launch } from "@/lib/tests";
import type { SyllabusNode } from "@/lib/types";
import { Button, Card, Chip, Segmented, cx } from "./ui";

const PAPERS = ["GS1", "GS2", "GS3", "GS4"] as const;
type Paper = (typeof PAPERS)[number];
// marks · word limit presets (UPSC pattern); GS IV case studies are 20 marks / 250 words
const PRESETS = [
  { id: "10-150", marks: 10, words: 150, label: "10 marks · 150 words" },
  { id: "15-250", marks: 15, words: 250, label: "15 marks · 250 words" },
  { id: "12.5-200", marks: 12.5, words: 200, label: "12.5 marks · 200 words" },
  { id: "20-250", marks: 20, words: 250, label: "20 marks · 250 words (case study)", case: true },
  { id: "25-300", marks: 25, words: 300, label: "25 marks · 300 words (case study)", case: true },
];
type Draft = { topic: string; ownTopic: string; stem: string; preset: string };
const OTHER = "__own__";
const blank = (): Draft => ({ topic: "", ownTopic: "", stem: "", preset: "10-150" });

/** Practice → "Write your own Mains question": paper → topic (or type one) → question → marks & words → answer
 *  and get it evaluated exactly like a Mains test. Allowance = the plan's Mains mock allowance × 20 questions. */
export default function OwnMainsQuestions({ ent, onState }: { ent: Entitlements | null; onState: (s: LaunchState) => void }) {
  const [paper, setPaper] = useState<Paper>("GS2");
  const [drafts, setDrafts] = useState<Draft[]>([blank()]);
  const [msg, setMsg] = useState("");
  const syllabus = useAsync(() => content<{ nodes: SyllabusNode[] }>(`syllabus/${paper}.json`), [paper]);
  const topics = (syllabus.data?.nodes ?? []).filter((t) => t.leaf && t.stage !== "PRELIMS");
  const row = ent?.services.custom_mains;
  const remaining = row?.remaining ?? null;                 // null = unlimited
  const set = (i: number, patch: Partial<Draft>) => setDrafts((d) => d.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  function problem(): string {
    for (const [i, d] of drafts.entries()) {
      if (!d.topic || (d.topic === OTHER && !d.ownTopic.trim())) return `Question ${i + 1}: pick a topic, or type your own`;
      if (d.stem.trim().length < 20) return `Question ${i + 1}: type or paste the full question`;
    }
    if (remaining !== null && drafts.length > remaining) return `You have ${remaining} question${remaining === 1 ? "" : "s"} left on your plan`;
    return "";
  }

  function start() {
    const p = problem();
    setMsg(p);
    if (p) return;
    const questions = drafts.map((d) => {
      const pr = PRESETS.find((x) => x.id === d.preset)!;
      return { ...(d.topic === OTHER ? { topic_name: d.ownTopic.trim() } : { topic_id: d.topic }),
               stem: d.stem.trim(), marks: pr.marks, word_limit: pr.words, case_study: !!pr.case };
    });
    const scope = paper.toLowerCase();
    launch(scope, `/api/v1/${scope}/tests/custom`, { questions }, "Setting up your questions", onState);
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-display text-xl font-extrabold"><PenLine size={20} /> Write your own Mains question</div>
          <p className="text-sm text-ink-2">Got a question from your coaching, a test series or your own revision? Add it, write the answer
            (type, photos or one PDF) and get it evaluated exactly like a Mains test.</p>
        </div>
        {row && (row.allowed
          ? <Chip tone="primary">{remaining === null ? "Unlimited" : `${remaining} of ${row.limit} questions left`}</Chip>
          : <Chip tone="saffron">Needs a Daily or Monthly Pass</Chip>)}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Paper</span>
        <Segmented value={paper} onChange={(v: Paper) => { setPaper(v); setDrafts((d) => d.map((x) => ({ ...x, topic: "" }))); }}
          options={PAPERS.map((p) => ({ value: p, label: p.replace("GS", "GS ") }))} />
      </div>

      {drafts.map((d, i) => (
        <div key={i} className="space-y-3 rounded-2xl border-2 border-line p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold text-muted">Q{i + 1}</span>
            {drafts.length > 1 && (
              <button onClick={() => setDrafts((x) => x.filter((_, k) => k !== i))} className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                <Trash2 size={13} /> Remove</button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={d.topic} onChange={(e) => set(i, { topic: e.target.value })} aria-label="Topic"
              className="rounded-2xl border-2 border-line bg-surface px-3 py-2 text-sm font-semibold">
              <option value="">Topic…</option>
              {topics.map((t) => <option key={t.node_id} value={t.node_id}>{t.name}</option>)}
              <option value={OTHER}>Other — type your own topic</option>
            </select>
            {d.topic === OTHER
              ? <input value={d.ownTopic} onChange={(e) => set(i, { ownTopic: e.target.value })} maxLength={80} placeholder="e.g. Lokpal and Lokayuktas"
                  className="rounded-2xl border-2 border-line bg-bg px-3 py-2 text-sm outline-none focus:border-primary" />
              : <select value={d.preset} onChange={(e) => set(i, { preset: e.target.value })} aria-label="Marks and word limit"
                  className="rounded-2xl border-2 border-line bg-surface px-3 py-2 text-sm font-semibold">
                  {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>}
          </div>
          {d.topic === OTHER && (
            <select value={d.preset} onChange={(e) => set(i, { preset: e.target.value })} aria-label="Marks and word limit"
              className="w-full rounded-2xl border-2 border-line bg-surface px-3 py-2 text-sm font-semibold sm:w-auto">
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          )}
          <textarea value={d.stem} onChange={(e) => set(i, { stem: e.target.value })} rows={3} maxLength={2500}
            placeholder="Type or paste the question exactly as set, e.g. “Critically examine the role of the Governor in India's federal polity.”"
            className={cx("w-full rounded-2xl border-2 bg-bg p-3 text-sm leading-relaxed outline-none focus:border-primary", "border-line")} />
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        {drafts.length < 10 && (
          <Button variant="outline" onClick={() => setDrafts((d) => [...d, blank()])}><Plus size={16} /> Add another question</Button>
        )}
        <Button className="ml-auto" onClick={start}>Start writing {drafts.length > 1 ? `${drafts.length} answers` : "the answer"}</Button>
      </div>
      {msg && <p className="text-sm font-semibold text-danger">{msg}</p>}
      <p className="text-xs text-muted">Each question uses one from your plan&apos;s allowance (your Mains mock allowance × 20). Your questions stay private —
        they&apos;re never shown to other students.</p>
    </Card>
  );
}
