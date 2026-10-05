"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Flag, ImagePlus, Pause, Play, Send } from "lucide-react";
import CameraCapture from "@/components/CameraCapture";
import MainsPdfUpload from "@/components/MainsPdfUpload";
import { Button, Chip, ErrorBox, Loading, Logo, Modal, cx } from "@/components/ui";
import { api, apiWithStatus, putSigned } from "@/lib/api";
import { useSearch, useSession } from "@/lib/hooks";
import { BUCKET_LABEL, FORMAT_LABEL, fmtDuration } from "@/lib/labels";
import { mainsPageLimit } from "@/lib/limits";
import { resultUrl } from "@/lib/tests";
import type { Answer, TestView } from "@/lib/types";

const ROMAN_LABEL = /^[IVX]+\.\s/;      // official PYQs that number statements I, II, III keep their own labels

const LETTERS = ["a", "b", "c", "d"];
const CONF: { v: Answer["confidence"]; label: string }[] = [
  { v: "LOW", label: "🤔 Guess" }, { v: "MEDIUM", label: "🙂 Fairly sure" }, { v: "HIGH", label: "😎 Sure" },
];

export default function AttemptPage() {
  const session = useSession();
  const q = useSearch();
  const scope = q.get("scope") ?? "";
  const testId = q.get("test") ?? "";
  const [test, setTest] = useState<TestView>();
  const [err, setErr] = useState<unknown>();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [images, setImages] = useState<Record<string, string[]>>({});
  const [left, setLeft] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const dirty = useRef<Set<string>>(new Set());
  const shownAt = useRef<number>(Date.now());
  const idemKey = useRef<string>("");
  const answersRef = useRef<Record<string, Answer>>({});
  answersRef.current = answers;

  useEffect(() => {
    if (!scope || !testId) return;
    api<TestView>(`/api/v1/${scope}/tests/${testId}`).then((t) => {
      if (t.status !== "IN_PROGRESS") { window.location.href = resultUrl(scope, t.attempt_id); return; }
      setTest(t);
      setAnswers(t.answers ?? {});
      setTexts(Object.fromEntries(Object.entries(t.mains_answers ?? {}).map(([k, v]) => [k, v.text ?? ""])));
      setImages(Object.fromEntries(Object.entries(t.mains_answers ?? {}).map(([k, v]) => [k, v.image_paths ?? []])));
      idemKey.current = `${t.attempt_id}-${crypto.randomUUID()}`;
    }).catch(setErr);
  }, [scope, testId]);

  // After a whole-paper PDF is split, pull the per-question answers it created (typed text stays as typed).
  const reloadMains = useCallback(async () => {
    if (!scope || !testId) return;
    const t = await api<TestView>(`/api/v1/${scope}/tests/${testId}`);
    setTest(t);
    setImages(Object.fromEntries(Object.entries(t.mains_answers ?? {}).map(([k, v]) => [k, v.image_paths ?? []])));
  }, [scope, testId]);

  // Prelims autosave: batch every 30 s or 10 answers (LLD §5.1).
  const flush = useCallback(async () => {
    if (!test || test.stage !== "PRELIMS" || dirty.current.size === 0) return;
    const ids = [...dirty.current];
    dirty.current.clear();
    setSaveState("saving");
    try {
      await api(`/api/v1/${scope}/attempts/${test.attempt_id}`, {
        method: "PATCH", json: { answers: ids.map((qid) => ({ qid, ...answersRef.current[qid] })) },
      });
      setSaveState(dirty.current.size ? "dirty" : "saved");
    } catch {
      ids.forEach((i) => dirty.current.add(i));
      setSaveState("dirty");
    }
  }, [scope, test]);

  useEffect(() => {
    const t = setInterval(flush, 30_000);
    return () => clearInterval(t);
  }, [flush]);

  useEffect(() => {
    if (!test) return;
    const tick = () => {
      const now = test.paused_at ? new Date(test.paused_at).getTime() : Date.now();   // clock frozen while paused
      setLeft(Math.max(0, (new Date(test.expires_at).getTime() - now) / 1000));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [test]);

  useEffect(() => { shownAt.current = Date.now(); }, [idx]);

  const submit = useCallback(async () => {
    if (!test) return;
    setSubmitting(true);
    try {
      if (test.stage === "PRELIMS") {
        Object.keys(answers).forEach((k) => dirty.current.add(k));
        await flush();
      } else {
        for (const qq of test.questions) {
          const text = texts[qq.qid]?.trim();
          if (text || images[qq.qid]?.length) {
            await api(`/api/v1/${scope}/attempts/${test.attempt_id}/mains-answers`, {
              method: "POST", json: { qid: qq.qid, text: text || null, image_paths: images[qq.qid] ?? [] },
            });
          }
        }
      }
      await apiWithStatus(`/api/v1/${scope}/attempts/${test.attempt_id}/submit`, {
        method: "POST", headers: { "Idempotency-Key": idemKey.current },
      });
      window.location.href = resultUrl(scope, test.attempt_id);
    } catch (e) {
      setErr(e);
      setSubmitting(false);
      setConfirm(false);
    }
  }, [answers, flush, images, scope, test, texts]);

  useEffect(() => {
    if (test && !test.paused_at && left === 0 && !submitting && test.stage === "PRELIMS" && Date.now() > new Date(test.expires_at).getTime()) submit();
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const [pausing, setPausing] = useState(false);
  async function pauseTest() {
    if (!test) return;
    setPausing(true);
    try {
      Object.keys(answersRef.current).forEach((k) => dirty.current.add(k));
      await flush();
      await api(`/api/v1/${scope}/attempts/${test.attempt_id}/pause`, { method: "POST" });
      setTest({ ...test, paused_at: new Date().toISOString() });
    } catch (e) { setErr(e); } finally { setPausing(false); }
  }
  async function resumeTest() {
    if (!test) return;
    setPausing(true);
    try {
      const r = await api<{ expires_at: string }>(`/api/v1/${scope}/attempts/${test.attempt_id}/resume`, { method: "POST" });
      setTest({ ...test, paused_at: null, expires_at: r.expires_at });
      shownAt.current = Date.now();
    } catch (e) { setErr(e); } finally { setPausing(false); }
  }

  function choose(qid: string, patch: Partial<Answer>) {
    setAnswers((prev) => {
      const cur = prev[qid] ?? {};
      const spent = Date.now() - shownAt.current;
      const next = { ...prev, [qid]: { ...cur, ...patch, time_ms: (cur.time_ms ?? 0) + spent } };
      shownAt.current = Date.now();
      answersRef.current = next;
      return next;
    });
    dirty.current.add(qid);
    setSaveState("dirty");
    if (dirty.current.size >= 10) setTimeout(flush, 0);
  }

  async function addPage(qid: string, file: File) {
    if (!test) return;
    const page = (images[qid]?.length ?? 0) + 1;
    const q = test.questions.find((x) => x.qid === qid);
    const limit = mainsPageLimit(q?.word_limit);
    if (page > limit) throw new Error(`A ${q?.word_limit ?? 150}-word answer can have at most ${limit} pages — remove a page before adding another.`);
    const up = await api<{ path: string; upload_url: string }>(`/api/v1/${scope}/attempts/${test.attempt_id}/mains-uploads`, {
      method: "POST", json: { qid, page, content_type: file.type || "image/jpeg" },
    });
    await putSigned(up.upload_url, file, file.type || "image/jpeg");
    setImages((p) => ({ ...p, [qid]: [...(p[qid] ?? []), up.path] }));
  }

  if (!session) return null;
  if (err && !test) return <div className="mx-auto max-w-xl p-6"><ErrorBox error={err} /></div>;
  if (!test) return <Loading label="Loading your paper" />;

  const cur = test.questions[idx];
  const a = answers[cur.qid] ?? {};
  const answered = test.stage === "PRELIMS"
    ? Object.values(answers).filter((x) => x.choice != null).length
    : test.questions.filter((qq) => texts[qq.qid]?.trim() || images[qq.qid]?.length).length;
  const urgent = left < 300;

  return (
    <div className="min-h-screen pb-24">
      <div className="tricolor h-1" />
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Logo className="hidden sm:inline-flex" />
          <div className="min-w-0 truncate text-sm font-semibold text-ink-2">{test.title}</div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted sm:inline">{saveState === "saved" ? "✓ saved" : saveState === "saving" ? "saving…" : "unsaved"}</span>
            <span className={cx("rounded-xl px-3 py-1 font-mono text-lg font-bold", urgent ? "bg-danger text-white" : "bg-surface-2")}
                  aria-live="polite">{fmtDuration(left)}</span>
            <Button variant="outline" onClick={pauseTest} loading={pausing} className="!py-2" aria-label="Pause test"><Pause size={16} /><span className="hidden sm:inline">Pause</span></Button>
            <Button onClick={() => setConfirm(true)} className="!py-2"><Send size={16} /> Submit</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 lg:grid-cols-[1fr_280px]">
        {test.stage === "MAINS" && (
          <div className="lg:col-span-2">
            <MainsPdfUpload scope={scope} attemptId={test.attempt_id} questions={test.questions}
              initial={test.mains_pdf} onDone={() => { reloadMains().catch(setErr); }} />
          </div>
        )}
        <section className="pop rounded-3xl bg-surface p-6 sticker" key={cur.qid}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-extrabold">Q{idx + 1}<span className="text-muted">/{test.questions.length}</span></span>
            <Chip tone="primary">{FORMAT_LABEL[cur.format] ?? cur.format}</Chip>
            {cur.bucket && <Chip>{BUCKET_LABEL[cur.bucket] ?? cur.bucket}</Chip>}
            {cur.pyq_ref && <Chip tone="saffron">PYQ {cur.pyq_ref.year}</Chip>}
            {cur.sample && <Chip>sample</Chip>}
            {cur.stage === "MAINS" && <Chip tone="green">{cur.marks} marks · {cur.word_limit} words</Chip>}
          </div>

          <p className="mt-4 text-lg font-semibold leading-relaxed">{cur.stem}</p>
          {!!cur.statements?.length && (
            <ol className="mt-3 space-y-2">
              {cur.statements.map((s, i) => (
                <li key={i} className="rounded-2xl bg-surface-2 px-4 py-2.5 text-[15px]">
                  {cur.format === "STATEMENT_I_II" || ROMAN_LABEL.test(s) ? s : <><span className="font-mono font-bold text-primary">{i + 1}.</span> {s}</>}
                </li>
              ))}
            </ol>
          )}

          {cur.stage === "PRELIMS" ? (
            <>
              {cur.tail ? <p className="mt-4 text-[15px] font-semibold">{cur.tail}</p>
                : !!cur.statements?.length && cur.format !== "STATEMENT_I_II" && <p className="mt-4 text-sm font-semibold text-ink-2">Which of the above is/are correct?</p>}
              <div className="mt-3 grid gap-2">
                {(cur.options ?? []).map((o, i) => (
                  <button key={i} onClick={() => choose(cur.qid, { choice: a.choice === i ? null : i })}
                    className={cx("flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition",
                      a.choice === i ? "border-primary bg-primary-soft" : "border-line hover:border-ink")}>
                    <span className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-sm font-bold",
                      a.choice === i ? "bg-primary text-primary-ink" : "bg-surface-2")}>{LETTERS[i]}</span>
                    <span className="font-medium">{o}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted">Confidence:</span>
                {CONF.map((c) => (
                  <button key={c.v} onClick={() => choose(cur.qid, { confidence: a.confidence === c.v ? null : c.v })}
                    className={cx("rounded-full border-2 px-3 py-1 text-xs font-semibold",
                      a.confidence === c.v ? "border-saffron bg-saffron-soft text-saffron" : "border-line text-ink-2")}>{c.label}</button>
                ))}
                <button onClick={() => choose(cur.qid, { flagged: !a.flagged })}
                  className={cx("ml-auto inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 text-xs font-semibold",
                    a.flagged ? "border-pink bg-pink/10 text-pink" : "border-line text-ink-2")}>
                  <Flag size={12} /> {a.flagged ? "Flagged" : "Flag for review"}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-4">
              <textarea value={texts[cur.qid] ?? ""} onChange={(e) => setTexts({ ...texts, [cur.qid]: e.target.value })}
                rows={14} placeholder="Intro → body with dimensions & evidence → way forward. Or upload photos of your handwritten pages."
                className="w-full rounded-2xl border-2 border-line bg-bg p-4 leading-relaxed outline-none focus:border-primary" />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                {(() => {
                  const w = (texts[cur.qid] ?? "").trim().split(/\s+/).filter(Boolean).length;
                  const limit = cur.word_limit ?? 250;
                  return <span className={cx("font-mono font-semibold", w > limit * 1.1 ? "text-danger" : "text-ink-2")}>{w} / {limit} words</span>;
                })()}
                {(() => {
                  const full = (images[cur.qid]?.length ?? 0) >= mainsPageLimit(cur.word_limit);
                  const add = (f: File) => { setUploading(true); addPage(cur.qid, f).catch(setErr).finally(() => setUploading(false)); };
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <CameraCapture disabled={full || uploading} onPhoto={add} />
                      <label className={cx("inline-flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-line px-3 py-1.5 font-semibold hover:border-ink",
                        (full || uploading) && "pointer-events-none opacity-50")}>
                        <ImagePlus size={16} /> {uploading ? "Uploading…" : "Upload image"}
                        <input type="file" accept="image/jpeg,image/png,image/heic" className="hidden" disabled={full || uploading}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) add(f); e.target.value = ""; }} />
                      </label>
                    </div>
                  );
                })()}
              </div>
              {(() => {
                const m = test.mains_answers?.[cur.qid];
                const n = images[cur.qid]?.length ?? 0;
                const fromPdf = m?.source === "pdf" && JSON.stringify(m.image_paths ?? []) === JSON.stringify(images[cur.qid] ?? []);
                if (fromPdf) return (
                  <div className="mt-3 rounded-2xl bg-surface-2 p-3 text-xs">
                    <div className="font-semibold text-ink-2">From your PDF — page{(m.pdf_pages?.length ?? 0) > 1 ? "s" : ""} {m.pdf_pages?.join(", ")}</div>
                    {m.transcript_preview && <p className="mt-1 whitespace-pre-line text-muted">{m.transcript_preview}{m.transcript_preview.length >= 400 ? "…" : ""}</p>}
                  </div>
                );
                const limit = mainsPageLimit(cur.word_limit);
                return (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{n ? `${n} of ${limit} pages attached — they'll be transcribed before evaluation.` : `Handwritten? Up to ${limit} pages for a ${cur.word_limit ?? 150}-word answer.`}</span>
                    {n >= limit && <span className="font-semibold text-saffron">Page limit reached.</span>}
                    {n > 0 && (
                      <button type="button" onClick={() => setImages((p) => ({ ...p, [cur.qid]: (p[cur.qid] ?? []).slice(0, -1) }))}
                        className="rounded-lg border-2 border-line px-2 py-0.5 font-semibold text-ink-2 hover:border-ink">Remove last page</button>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {err ? <div className="mt-4"><ErrorBox error={err} /></div> : null}

          <div className="mt-6 flex justify-between">
            <Button variant="outline" disabled={idx === 0} onClick={() => setIdx(idx - 1)}><ChevronLeft size={16} /> Prev</Button>
            {idx < test.questions.length - 1
              ? <Button onClick={() => setIdx(idx + 1)}>Next <ChevronRight size={16} /></Button>
              : <Button variant="lime" onClick={() => setConfirm(true)}>Finish <Send size={16} /></Button>}
          </div>
        </section>

        <aside className="h-fit rounded-3xl border border-line bg-surface p-4 lg:sticky lg:top-24">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-bold">Question palette</span>
            <span className="text-muted">{answered}/{test.questions.length}</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-5">
            {test.questions.map((qq, i) => {
              const x = answers[qq.qid];
              const done = qq.stage === "PRELIMS" ? x?.choice != null : !!(texts[qq.qid]?.trim() || images[qq.qid]?.length);
              return (
                <button key={qq.qid} onClick={() => setIdx(i)} aria-label={`Question ${i + 1}`}
                  className={cx("relative h-9 rounded-xl font-mono text-xs font-bold",
                    i === idx ? "ring-2 ring-ink dark:ring-ink" : "",
                    done ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink-2")}>
                  {i + 1}
                  {x?.flagged && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-pink" />}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1 text-xs text-muted">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-primary" /> answered</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-pink" /> flagged</div>
            {test.stage === "PRELIMS" && <div className="pt-2">Marking: +2 correct · −0.66 wrong · 0 skipped</div>}
          </div>
        </aside>
      </div>

      {test.paused_at && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-bg/95 p-4 backdrop-blur">
          <div className="pop w-full max-w-sm rounded-3xl bg-surface p-6 text-center sticker">
            <div className="text-4xl">⏸️</div>
            <div className="mt-2 font-display text-2xl font-extrabold">Test paused</div>
            <p className="mt-1 text-sm text-ink-2">The clock is stopped at <b className="font-mono">{fmtDuration(left)}</b> and your answers are saved. Come back any time — even after signing out — from the <b>Live test</b> button.</p>
            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={resumeTest} loading={pausing} className="w-full"><Play size={16} /> Resume</Button>
              <Link href="/dashboard/" className="rounded-2xl px-4 py-2 text-sm font-semibold text-muted hover:text-ink">Leave for now</Link>
            </div>
          </div>
        </div>
      )}

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Submit this attempt?">
        <p className="text-sm text-ink-2">
          {answered} of {test.questions.length} {test.stage === "PRELIMS" ? "answered" : "written"}.
          {test.stage === "MAINS" && " Each answered question uses one Mains evaluation from your weekly quota."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(false)}>Keep going</Button>
          <Button onClick={submit} loading={submitting}>Submit</Button>
        </div>
      </Modal>
    </div>
  );
}
