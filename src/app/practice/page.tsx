"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileUp, Play, ShieldCheck, XCircle } from "lucide-react";
import AppShell from "@/components/AppShell";
import FreeMixNote from "@/components/FreeMixNote";
import OwnMainsQuestions from "@/components/OwnMainsQuestions";
import LaunchOverlay from "@/components/LaunchOverlay";
import MaterialPicker, { type Material } from "@/components/MaterialPicker";
import WaitingRoom from "@/components/WaitingRoom";
import { Button, Card, Chip, ErrorBox, PageHeader, Segmented, cx } from "@/components/ui";
import { SOURCE_HINT, sourceFilesProblem } from "@/lib/limits";
import { api, content, putSigned, sleep } from "@/lib/api";
import { useAsync, useEntitlements, useSearch, useSession } from "@/lib/hooks";
import { PAPERS } from "@/lib/labels";
import { type LaunchState, bankTest, fullMainsMock, fullPrelimsMock } from "@/lib/tests";
import type { SyllabusNode } from "@/lib/types";

type Stage = "PRELIMS" | "MAINS";
type Mode = "SECTIONAL" | "TOPIC" | "ADAPTIVE" | "TIMED_MOCK";
type Source = { source_id: string; status: string; topic_name: string; filename: string; relevance?: number;
  reason?: string; error?: string; detected_topics?: string[] };

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "SECTIONAL", label: "Sectional", hint: "Whole paper, real mix of PYQ / fresh / CA / wildcard." },
  { value: "TOPIC", label: "Topic drill", hint: "Pick topics and grind them." },
  { value: "ADAPTIVE", label: "Adaptive", hint: "Tilts to your weak topics (max 40%) at ~60% expected accuracy." },
  { value: "TIMED_MOCK", label: "Timed mock", hint: "Strict clock, exam difficulty mix 30/45/25." },
];

export default function Practice() {
  const session = useSession();
  const { ent } = useEntitlements(session);
  const q = useSearch();
  const [scope, setScope] = useState<string>("gs1");
  const [stage, setStage] = useState<Stage>("PRELIMS");
  const [mode, setMode] = useState<Mode>("SECTIONAL");
  const [n, setN] = useState(10);
  const [topics, setTopics] = useState<string[]>([]);
  const [useSource, setUseSource] = useState(false);
  const [sourceTopic, setSourceTopic] = useState("");
  const [source, setSource] = useState<Source | null>(null);
  const [sourceBusy, setSourceBusy] = useState(false);
  const [sourceErr, setSourceErr] = useState<unknown>();
  const [launchState, setLaunch] = useState<LaunchState>({ kind: "idle" });
  const [mainsPaper, setMainsPaper] = useState("GS2");

  useEffect(() => {
    const s = q.get("scope");
    if (s && PAPERS.some((p) => p.scope === s)) setScope(s);
  }, [q]);

  const paper = PAPERS.find((p) => p.scope === scope)!;
  useEffect(() => {
    if (!(paper.stages as readonly string[]).includes(stage)) setStage(paper.stages[0] as Stage);
    setTopics([]);
    setSource(null);
    setSourceTopic("");
  }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const syllabus = useAsync(() => content<{ nodes: SyllabusNode[] }>(`syllabus/${paper.paper}.json`), [paper.paper]);
  const leaves = (syllabus.data?.nodes ?? []).filter((t) => t.leaf && (t.stage === "BOTH" || t.stage === stage));
  const sourceReady = useSource && source?.status === "ACCEPTED";
  const freeCap = ent?.caps.sectional_max_questions;
  const maxQ = stage === "MAINS" ? 5 : freeCap ?? (sourceReady ? 25 : 50);
  const minQ = stage === "MAINS" || freeCap ? 1 : 5;
  const canSource = stage === "PRELIMS" && paper.paper !== "PSIR";

  async function uploadSource(files: File[]) {
    if (!sourceTopic || !files.length) return;
    setSourceErr(undefined);
    setSource(null);
    const problem = sourceFilesProblem(files);
    if (problem) { setSourceErr(new Error(problem)); return; }
    setSourceBusy(true);
    try {
      const meta = files.map((f) => ({ filename: f.name, content_type: f.type || "application/pdf", size: f.size }));
      const reg = await api<{ source_id: string; uploads: { upload_url: string; content_type: string }[] }>("/api/v1/library/my-sources", {
        method: "POST", json: { paper: paper.paper, topic_id: sourceTopic, files: meta },
      });
      await Promise.all(reg.uploads.map((u, i) => putSigned(u.upload_url, files[i], u.content_type)));
      await api(`/api/v1/library/my-sources/${reg.source_id}/check`, { method: "POST" });
      await pollSource(reg.source_id);
    } catch (e) { setSourceErr(e); } finally { setSourceBusy(false); }
  }

  async function pollSource(id: string) {
    for (let i = 0; i < 80; i++) {
      const s = await api<Source>(`/api/v1/library/my-sources/${id}`);
      setSource(s);
      if (!["CHECKING", "PENDING_UPLOAD"].includes(s.status)) break;
      await sleep(1500);
    }
  }

  async function pickMaterial(m: Material) {
    if (!sourceTopic) return;
    setSourceBusy(true);
    setSourceErr(undefined);
    setSource(null);
    try {
      const s = await api<Source>("/api/v1/library/my-sources/from-material", {
        method: "POST", json: { material_id: m.material_id, paper: paper.paper, topic_id: sourceTopic },
      });
      setSource(s);
      await pollSource(s.source_id);
    } catch (e) { setSourceErr(e); } finally { setSourceBusy(false); }
  }

  function start() {
    const body: Record<string, unknown> = {
      stage, mode: stage === "MAINS" ? "SECTIONAL" : mode, n: Math.max(minQ, Math.min(n, maxQ)),
      topic_ids: mode === "TOPIC" && topics.length ? topics : undefined,
    };
    if (sourceReady) Object.assign(body, { source_id: source!.source_id, mode: "TOPIC" });
    bankTest(scope, body, setLaunch);
  }

  if (!session) return null;
  return (
    <AppShell guestPreview={{ emoji: "🎯", title: "Practice that feels like the real paper", points: [
      "GS I–IV and PSIR · Prelims MCQs and Mains answer writing", "Sectional, topic, adaptive and timed modes — never a repeated question",
      "Generate tests from your own notes (topic-checked)", "Full-length Prelims (100 Qs, 2 h) and Mains (250 marks, 3 h) mocks"] }}>
      <PageHeader kicker="Practice" title="Pick your battle"
        sub="Questions come from the bank first and are never repeated. When you've cleared the bank, fresh questions are written and quality-checked for you." />
      <LaunchOverlay state={launchState} onClose={() => setLaunch({ kind: "idle" })} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PAPERS.map((p) => (
          <button key={p.scope} onClick={() => setScope(p.scope)}
            className={cx("rounded-3xl border-2 p-4 text-left transition",
              scope === p.scope ? "sticker bg-primary text-primary-ink" : "border-line bg-surface hover:border-ink")}>
            <div className="text-2xl">{p.emoji}</div>
            <div className="mt-2 font-display text-lg font-extrabold">{p.label}</div>
            <div className={cx("text-xs", scope === p.scope ? "opacity-90" : "text-muted")}>{p.long}</div>
          </button>
        ))}
      </div>

      <Card className="mt-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="w-24 text-sm font-bold">Stage</span>
          <Segmented value={stage} onChange={setStage}
            options={paper.stages.map((s) => ({ value: s as Stage, label: s === "PRELIMS" ? "Prelims MCQ"
              : ent && !ent.services.mains_test.allowed ? "Mains answer writing 🔒" : "Mains answer writing" }))} />
          {stage === "MAINS" && ent && !ent.services.mains_test.allowed && <Chip tone="saffron">Mains needs a Daily or Monthly Pass</Chip>}
        </div>

        {stage === "PRELIMS" && !sourceReady && (
          <div className="flex flex-wrap items-start gap-4">
            <span className="w-24 pt-2 text-sm font-bold">Mode</span>
            <div className="flex-1">
              <Segmented value={mode} onChange={setMode} options={MODES.map((m) => ({ value: m.value, label: m.label }))} />
              <p className="mt-2 text-sm text-muted">{MODES.find((m) => m.value === mode)?.hint}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <span className="w-24 text-sm font-bold">Questions</span>
          <input type="range" min={minQ} max={maxQ} step={1} value={Math.max(minQ, Math.min(n, maxQ))}
            onChange={(e) => setN(Number(e.target.value))} className="w-56 accent-[var(--primary)]" aria-label="Number of questions" />
          <span className="font-mono text-lg font-bold">{Math.max(minQ, Math.min(n, maxQ))}</span>
          {freeCap && stage === "PRELIMS" && <Chip tone="saffron">Free plan: up to {freeCap} per test</Chip>}
          <span className="text-xs text-muted">{stage === "PRELIMS" ? `≈ ${Math.round(Math.min(n, 50) * 1.2)} min` : "7–11 min per answer"}</span>
        </div>

        {canSource && (
          <div className="rounded-3xl border-2 border-dashed border-line p-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={useSource} onChange={(e) => { setUseSource(e.target.checked); setSource(null); }} />
              <span className="font-display font-bold">Generate from my own source</span>
              <Chip tone="primary">{ent?.services.source_test.allowed ? "AI-generated" : "Daily / Monthly Pass"}</Chip>
            </label>
            <p className="ml-7 mt-1 text-sm text-muted">
              Upload your notes or a chapter for one topic. We check it&apos;s actually about that topic and safe, then write
              UPSC-style questions only from it. Skip this to use TamGam&apos;s question bank. <b>{SOURCE_HINT}</b>
            </p>
            {useSource && (
              <div className="ml-7 mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select value={sourceTopic} onChange={(e) => { setSourceTopic(e.target.value); setSource(null); }}
                    className="rounded-2xl border-2 border-line bg-surface px-3 py-2 text-sm font-semibold" aria-label="Topic of your source">
                    <option value="">Which topic is this source about?</option>
                    {leaves.map((t) => <option key={t.node_id} value={t.node_id}>{t.name}</option>)}
                  </select>
                  <label className={cx("inline-flex cursor-pointer items-center gap-2 rounded-2xl border-2 px-3 py-2 text-sm font-semibold",
                    sourceTopic && !sourceBusy ? "border-ink hover:bg-surface-2" : "pointer-events-none border-line opacity-50")}>
                    <FileUp size={16} /> {sourceBusy ? "Checking…" : "Upload PDFs / photos (multiple OK)"}
                    <input type="file" multiple accept="application/pdf,image/jpeg,image/png" className="hidden" disabled={!sourceTopic || sourceBusy}
                      onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length) uploadSource(fs); e.target.value = ""; }} />
                  </label>
                </div>
                {!sourceBusy && <MaterialPicker onPick={pickMaterial} disabled={!sourceTopic}
                  label={sourceTopic ? "Use material you've already uploaded" : "Pick a topic, then reuse material you've already uploaded"} />}
                {sourceBusy && <WaitingRoom title="Checking your material" message="Reading it and checking it matches the topic…" compact />}
                {source?.status === "ACCEPTED" && (
                  <div className="flex items-start gap-2 rounded-2xl bg-green-soft p-3 text-sm">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green" />
                    <div><b>{source.filename}</b> ({(source as Source & { files?: number }).files ?? 1} file{((source as Source & { files?: number }).files ?? 1) > 1 ? "s" : ""}) matches <b>{source.topic_name}</b> (relevance {Math.round((source.relevance ?? 0) * 100)}%). Questions will be generated from it and kept private to you.</div>
                  </div>
                )}
                {source && ["REJECTED", "FAILED"].includes(source.status) && (
                  <div className="flex items-start gap-2 rounded-2xl bg-danger-soft p-3 text-sm text-danger">
                    <XCircle size={18} className="mt-0.5 shrink-0" />
                    <div>
                      <b>Can&apos;t use this file.</b> {source.reason || source.error}
                      {!!source.detected_topics?.length && <div className="mt-1 text-xs">It looks like: {source.detected_topics.join(", ")}</div>}
                    </div>
                  </div>
                )}
                {sourceErr ? <ErrorBox error={sourceErr} /> : null}
              </div>
            )}
          </div>
        )}

        {stage === "PRELIMS" && mode === "TOPIC" && !sourceReady && (
          <div>
            <div className="mb-2 text-sm font-bold">Topics <span className="font-normal text-muted">(leave empty for all)</span></div>
            {syllabus.error ? <ErrorBox error={syllabus.error} /> : (
              <div className="flex flex-wrap gap-2">
                {leaves.map((t) => {
                  const on = topics.includes(t.node_id);
                  return (
                    <button key={t.node_id} onClick={() => setTopics(on ? topics.filter((x) => x !== t.node_id) : [...topics, t.node_id])}
                      className={cx("rounded-full border-2 px-3 py-1 text-sm font-semibold",
                        on ? "border-primary bg-primary-soft text-primary" : "border-line text-ink-2 hover:border-ink")}>
                      {t.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={start} disabled={useSource && canSource && !sourceReady} className="px-6 py-3 text-base">
            <Play size={18} /> {sourceReady ? "Generate from my source" : "Start test"}
          </Button>
          {stage === "MAINS" && <Chip tone="saffron">Evaluation uses your weekly Mains quota on submit</Chip>}
          <span className="inline-flex items-center gap-1 text-xs text-muted"><ShieldCheck size={14} /> Every generated question passes a critic plus safety and UPSC-standards guardrails</span>
        </div>
      </Card>

      <h2 className="mb-3 mt-10 font-display text-2xl font-extrabold">Full-length mocks</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Card sticker className="flex flex-col justify-between gap-4 bg-primary-soft">
          <div>
            <div className="font-display text-xl font-extrabold">Prelims · GS Paper I</div>
            <p className="text-sm text-ink-2">{ent?.plan === "FREE"
              ? "The full paper, free: 100 questions, 200 marks, 2 hours, −⅓ negative marking — a mix of real UPSC PYQs and our question bank."
              : "Exactly like the real paper: 100 questions, 200 marks, 2 hours, −⅓ negative marking. Sized across GS I–IV by PYQ weight."}</p>
            {ent?.plan === "FREE" && <FreeMixNote className="mt-3" />}
          </div>
          <Button variant="lime" onClick={() => fullPrelimsMock(setLaunch)}>Start 100-question mock 🔥</Button>
        </Card>
        <Card sticker className="flex flex-col justify-between gap-4">
          <div>
            <div className="font-display text-xl font-extrabold">Mains · full paper</div>
            <p className="text-sm text-ink-2">GS I–III: 20 questions (10 × 10 marks, 10 × 15 marks) = 250 marks in 3 hours. GS IV: 13 × 10 marks + 6 case studies × 20 marks. PSIR: GS-style 250-mark practice paper. Evaluation included. Needs a Daily or Monthly Pass.</p>
          </div>
          <div className="flex gap-2">
            <Segmented value={mainsPaper} onChange={setMainsPaper} options={["GS1", "GS2", "GS3", "GS4", "PSIR"].map((p) => ({ value: p, label: p }))} />
            <Button onClick={() => fullMainsMock(mainsPaper, setLaunch)}>Start</Button>
          </div>
        </Card>
      </div>

      <h2 className="mb-3 mt-10 font-display text-2xl font-extrabold">Your own question</h2>
      <OwnMainsQuestions ent={ent ?? null} onState={setLaunch} />
    </AppShell>
  );
}
