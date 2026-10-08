"use client";

import { useEffect, useState } from "react";
import { EyeOff, FileUp, Pencil } from "lucide-react";
import { api, putSigned } from "@/lib/api";
import { useAsync, usePageVisible } from "@/lib/hooks";
import { fmtDate, todayIST, gsPapers } from "@/lib/labels";
import { Button, Card, Chip, ErrorBox, Loading, Modal } from "../ui";

type Paper = { _id: string; date: string; name: string; filename: string; status: string; progress: number; message?: string;
  articles: number; questions: number; pages?: number; pages_read?: number; pages_skipped?: number; error?: string; created_at: string };
type Article = { id: string; headline: string; summary: string; gs_tags: string[]; facts: string[]; page?: number;
  status: string; importance?: number; source?: string; prelims_angle?: string; mains_angle?: string };

export default function AdminCurrentAffairs() {
  const papers = useAsync(() => api<{ items: Paper[] }>("/api/v1/current_affairs/admin/newspapers?limit=20"), []);
  const [date, setDate] = useState(todayIST());
  const [name, setName] = useState("The Indian Express");
  const [file, setFile] = useState<File | null>(null);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>();
  const [viewDate, setViewDate] = useState(todayIST());
  const articles = useAsync(() => api<{ items: Article[] }>(`/api/v1/current_affairs/admin/articles?date=${viewDate}`), [viewDate]);
  const [edit, setEdit] = useState<Article | null>(null);

  const processing = papers.data?.items.some((p) => ["QUEUED", "PROCESSING"].includes(p.status));
  const visible = usePageVisible();
  useEffect(() => {
    if (!processing || !visible) return;                   // background tabs don't poll
    const t = setInterval(() => { papers.reload(); articles.reload(); }, 5000);
    return () => clearInterval(t);
  }, [processing, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true); setErr(undefined);
    try {
      const r = await api<{ newspaper_id: string; upload_url: string }>("/api/v1/current_affairs/admin/newspapers", { method: "POST",
        json: { date, name, filename: file.name, content_type: "application/pdf", size: file.size, rights_ack: rights } });
      await putSigned(r.upload_url, file, "application/pdf");
      await api(`/api/v1/current_affairs/admin/newspapers/${r.newspaper_id}/process`, { method: "POST" });
      setFile(null); setViewDate(date); papers.reload();
    } catch (e2) { setErr(e2); } finally { setBusy(false); }
  }

  const field = "w-full rounded-2xl border-2 border-line bg-bg px-3 py-2 text-sm outline-none focus:border-primary";
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card sticker>
          <form onSubmit={upload} className="space-y-3">
            <div className="font-display font-bold">Upload today&apos;s newspaper</div>
            <p className="text-xs text-ink-2">Pages with a readable text layer are used directly; scanned pages and e-papers with scrambled fonts are read with AI vision (about ₹50 for a 22-page broadsheet, needs OpenAI credit). Pages are read one by one; UPSC-relevant stories become own-words cards, and each story gets Prelims MCQs and a Mains question (critic + guardrails) stored in the question bank. Article text is never stored.</p>
            <div className="flex gap-2">
              <input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} required />
              <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Newspaper name" required />
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/40 px-3 py-4 text-sm font-semibold">
              <FileUp size={16} /> {file ? file.name : "Choose e-paper PDF (max 120 MB)"}
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <label className="flex items-start gap-2 text-xs text-ink-2"><input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} required className="mt-0.5" />
              TamGam is licensed/subscribed to use this edition for summaries and questions.</label>
            {err ? <ErrorBox error={err} /> : null}
            <Button type="submit" loading={busy} disabled={!file}>Upload & process</Button>
          </form>
        </Card>
        <Card className="p-2">
          <div className="px-3 py-2 font-display font-bold">Recent editions</div>
          {papers.loading ? <Loading /> : papers.data?.items.map((p) => (
            <div key={p._id}>
            <button onClick={() => setViewDate(p.date)} className="block w-full rounded-2xl px-3 py-2.5 text-left hover:bg-surface-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">{p.name} · {fmtDate(p.date)}</div>
                <Chip tone={p.status === "DONE" ? "green" : p.status === "FAILED" ? "danger" : "primary"}>{p.status.toLowerCase()}</Chip>
              </div>
              <div className="text-xs text-muted">{p.articles} stories · {p.questions} questions{p.pages_read != null ? ` · ${p.pages_read} readable page${p.pages_read === 1 ? "" : "s"}${p.pages_skipped ? `, ${p.pages_skipped} skipped` : ""}` : p.pages ? ` · ${p.pages} pages` : ""}{p.message && p.status !== "DONE" ? ` · ${p.message}` : ""}</div>
              {["QUEUED", "PROCESSING"].includes(p.status) && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} /></div>
              )}
            </button>
            {p.status === "FAILED" && (
              <div className="mx-3 mb-1 flex items-start justify-between gap-2 rounded-xl bg-danger-soft px-2.5 py-1.5 text-xs text-danger">
                <span>{p.error || "Processing failed"}</span>
                <button className="shrink-0 font-bold underline" onClick={async () => {
                  try { await api(`/api/v1/current_affairs/admin/newspapers/${p._id}/process`, { method: "POST" }); papers.reload(); }
                  catch (e) { setErr(e); }
                }}>Retry</button>
              </div>
            )}
            </div>
          ))}
          {papers.data?.items.length === 0 && <p className="p-6 text-center text-sm text-muted">No editions uploaded yet.</p>}
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="font-display text-lg font-bold">Stories for {fmtDate(viewDate)}</div>
          <input type="date" value={viewDate} onChange={(e) => setViewDate(e.target.value)} className="rounded-xl border-2 border-line bg-bg px-2 py-1 text-sm" />
        </div>
        {articles.loading ? <Loading /> : (
          <ul className="divide-y divide-line">
            {articles.data?.items.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-1">{gsPapers(a.gs_tags).map((g) => <Chip key={g} tone="primary">{g}</Chip>)}
                    {a.page && <Chip>p.{a.page}</Chip>}{a.status === "HIDDEN" && <Chip tone="danger">hidden</Chip>}</div>
                  <div className="mt-1 font-semibold">{a.headline}</div>
                  <div className="text-sm text-ink-2">{a.summary}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" className="!px-2" onClick={() => setEdit(a)} aria-label="Edit"><Pencil size={14} /></Button>
                  <Button variant="ghost" className="!px-2" aria-label={a.status === "HIDDEN" ? "Show" : "Hide"} onClick={async () => {
                    await api(`/api/v1/current_affairs/admin/articles/${a.id}`, { method: "PATCH", json: { hidden: a.status !== "HIDDEN" } }); articles.reload();
                  }}><EyeOff size={14} /></Button>
                </div>
              </li>
            ))}
            {articles.data?.items.length === 0 && <li className="py-6 text-center text-sm text-muted">No stories for this date.</li>}
          </ul>
        )}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit story">
        {edit && (
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            await api(`/api/v1/current_affairs/admin/articles/${edit.id}`, { method: "PATCH", json: {
              headline: edit.headline, summary: edit.summary, prelims_angle: edit.prelims_angle, mains_angle: edit.mains_angle } });
            setEdit(null); articles.reload();
          }}>
            <input className={field} value={edit.headline} onChange={(e) => setEdit({ ...edit, headline: e.target.value })} />
            <textarea className={field} rows={4} value={edit.summary} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} />
            <input className={field} placeholder="Prelims angle" value={edit.prelims_angle ?? ""} onChange={(e) => setEdit({ ...edit, prelims_angle: e.target.value })} />
            <input className={field} placeholder="Mains angle" value={edit.mains_angle ?? ""} onChange={(e) => setEdit({ ...edit, mains_angle: e.target.value })} />
            <Button type="submit">Save & republish</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
