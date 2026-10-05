"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileUp, TriangleAlert } from "lucide-react";
import { api, putSigned } from "@/lib/api";
import type { MainsPdfState, Question } from "@/lib/types";
import { ErrorBox, cx } from "./ui";

/** Mains: upload ONE PDF with the answers to every question; we split it into answers per question. */
export default function MainsPdfUpload({ scope, attemptId, questions, initial, onDone }:
  { scope: string; attemptId: string; questions: Question[]; initial?: MainsPdfState | null; onDone: () => void }) {
  const [state, setState] = useState<MainsPdfState | null>(initial ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>();
  const running = state && (state.status === "QUEUED" || state.status === "PROCESSING");

  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      try {
        const s = await api<MainsPdfState>(`/api/v1/${scope}/attempts/${attemptId}/mains-pdf`);
        setState(s);
        if (s.status === "DONE") onDone();
      } catch { /* keep polling */ }
    }, 2500);
    return () => clearInterval(t);
  }, [running, scope, attemptId, onDone]);

  async function upload(file: File) {
    if (file.type && file.type !== "application/pdf") { setErr(new Error("Choose a PDF file")); return; }
    if (file.size > 30 * 1024 * 1024) { setErr(new Error("The PDF must be 30 MB or smaller")); return; }
    setBusy(true); setErr(undefined);
    try {
      const up = await api<{ upload_id: string; upload_url: string }>(`/api/v1/${scope}/attempts/${attemptId}/mains-pdf`,
        { method: "POST", json: { size: file.size } });
      await putSigned(up.upload_url, file, "application/pdf");
      setState(await api<MainsPdfState>(`/api/v1/${scope}/attempts/${attemptId}/mains-pdf/${up.upload_id}/process`, { method: "POST" }));
    } catch (e) { setErr(e); } finally { setBusy(false); }
  }

  const qno = (qid: string) => questions.findIndex((q) => q.qid === qid) + 1;
  return (
    <div className="mb-5 rounded-3xl border-2 border-dashed border-primary/50 bg-primary-soft/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display font-bold">Wrote everything on paper? Upload one PDF</div>
          <p className="text-xs text-ink-2">Scan all your answer pages into a single PDF (max 30 MB): up to 3 pages per 150-word
            answer and 4 per 250-word answer, plus a cover page. Write the question number (Q1, Q2 …) before each answer —
            we&apos;ll match pages to questions for you.</p>
        </div>
        <label className={cx("inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-ink",
          (busy || running) && "pointer-events-none opacity-60")}>
          <FileUp size={16} /> {busy ? "Uploading…" : running ? "Processing…" : state?.status === "DONE" ? "Upload a new PDF" : "Upload PDF"}
          <input type="file" accept="application/pdf" className="hidden" disabled={busy || !!running}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
      </div>
      {running && (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(5, state.progress)}%` }} /></div>
          <p className="mt-1 text-xs text-muted">{state.message} — you can keep writing other answers meanwhile.</p>
        </div>
      )}
      {state?.status === "DONE" && (
        <div className="mt-3 rounded-2xl bg-surface p-3 text-sm">
          <div className="flex items-center gap-2 font-semibold text-green"><CheckCircle2 size={16} /> {state.message}</div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(state.assignments).sort((a, b) => a[1].qno - b[1].qno).map(([qid, v]) => (
              <li key={qid} className={cx("rounded-full px-2.5 py-0.5 text-xs font-semibold", v.trimmed?.length ? "bg-saffron-soft" : "bg-green-soft")}
                title={v.trimmed?.length ? `Only the first ${v.page_limit} pages are kept for this answer` : undefined}>
                Q{qno(qid) || v.qno}: page{v.pages.length > 1 ? "s" : ""} {v.pages.join(", ")}{v.trimmed?.length ? ` (left out ${v.trimmed.join(", ")})` : ""}</li>
            ))}
          </ul>
          {!!state.unassigned_pages.length && <p className="mt-2 text-xs text-muted">Pages not matched to any question (cover, blank or rough work): {state.unassigned_pages.join(", ")}</p>}
          {Object.keys(state.assignments).length < questions.length && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-saffron"><TriangleAlert size={14} className="mt-0.5 shrink-0" />
              Some questions weren&apos;t found in the PDF. Answer them below by typing or adding a photo — or fix the numbering and upload again.</p>
          )}
        </div>
      )}
      {state?.status === "FAILED" && <div className="mt-3"><ErrorBox error={{ problem: { title: "Couldn't read the PDF", detail: state.error ?? undefined } }} /></div>}
      {err ? <div className="mt-3"><ErrorBox error={err} /></div> : null}
    </div>
  );
}
