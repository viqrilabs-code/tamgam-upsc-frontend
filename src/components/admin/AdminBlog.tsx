"use client";

import { useState } from "react";
import { Copy, ExternalLink, Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { fmtDate } from "@/lib/labels";
import { Button, Card, Chip, Empty, ErrorBox, Loading } from "../ui";

type Source = { url: string; title: string };
type Row = { id: string; slug: string; url: string; title: string; status: "DRAFT" | "PUBLISHED"; updated_at?: string; published_at?: string; sources: number };
type Draft = { title: string; summary: string; body: string; conclusion: string; sources: Source[] };
const EMPTY: Draft = { title: "", summary: "", body: "", conclusion: "", sources: [{ url: "", title: "" }] };
const field = "w-full rounded-2xl border-2 border-line bg-bg px-3 py-2 text-sm outline-none focus:border-primary";

/** Admin → Geopolitics blog: text-only posts with source links. Anyone (no sign-in) reads published posts. */
export default function AdminBlog() {
  const list = useAsync(() => api<{ items: Row[] }>("/api/v1/blog/admin/posts"), []);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [d, setD] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string>();
  const [err, setErr] = useState<unknown>();
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState<string>();

  async function edit(id: string | "new") {
    setErr(undefined); setMsg("");
    if (id === "new") { setD(EMPTY); setEditing("new"); return; }
    try {
      const p = await api<Draft>(`/api/v1/blog/admin/posts/${id}`);
      setD({ ...EMPTY, ...p, sources: p.sources?.length ? p.sources : EMPTY.sources });
      setEditing(id);
    } catch (e) { setErr(e); }
  }

  async function save(publish: boolean | null) {
    setBusy(true); setErr(undefined);
    try {
      const body = { ...d, sources: d.sources.filter((s) => s.url.trim()), ...(publish === null ? {} : { publish }) };
      const out = await api<Row>(editing === "new" ? "/api/v1/blog/admin/posts" : `/api/v1/blog/admin/posts/${editing}`,
        { method: editing === "new" ? "POST" : "PUT", json: body });
      setMsg(out.status === "PUBLISHED" ? `Published “${out.title}” — share it: ${out.url}` : `Saved “${out.title}” as a draft`);
      setEditing(null); list.reload();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  }

  async function status(id: string, publish: boolean) {
    setErr(undefined);
    try { await api(`/api/v1/blog/admin/posts/${id}/status`, { method: "POST", json: { publish } }); list.reload(); }
    catch (e) { setErr(e); }
  }

  async function remove(id: string) {
    setErr(undefined);
    try { await api(`/api/v1/blog/admin/posts/${id}`, { method: "DELETE" }); setConfirmDel(undefined); list.reload(); }
    catch (e) { setErr(e); }
  }

  const setSource = (i: number, patch: Partial<Source>) =>
    setD({ ...d, sources: d.sources.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  if (editing) {
    return (
      <Card className="space-y-4">
        <div className="font-display text-xl font-bold">{editing === "new" ? "New geopolitics post" : "Edit post"}</div>
        <label className="block text-sm font-semibold">Title
          <input className={`${field} mt-1`} value={d.title} maxLength={200} onChange={(e) => setD({ ...d, title: e.target.value })}
            placeholder="e.g. What the Red Sea crisis means for India's trade" /></label>
        {([["summary", "Summary", 3, 2000], ["body", "Main content", 14, 40000], ["conclusion", "Conclusion", 4, 5000]] as const).map(([k, label, rows, max]) => (
          <label key={k} className="block text-sm font-semibold">{label}
            <textarea className={`${field} mt-1 font-normal leading-relaxed`} rows={rows} maxLength={max} value={d[k]}
              onChange={(e) => setD({ ...d, [k]: e.target.value })} />
          </label>
        ))}
        <p className="text-xs text-muted">Text only — no images. Start lines with “- ” to show them as bullet points.</p>
        <div className="space-y-2">
          <div className="text-sm font-semibold">Source links <span className="font-normal text-muted">(at least one)</span></div>
          {d.sources.map((s, i) => (
            <div key={i} className="flex flex-wrap gap-2 sm:flex-nowrap">
              <input className={field} value={s.url} placeholder="https://…" maxLength={500} onChange={(e) => setSource(i, { url: e.target.value })} />
              <input className={`${field} sm:max-w-[40%]`} value={s.title} placeholder="Label (optional, e.g. MEA press release)" maxLength={200}
                onChange={(e) => setSource(i, { title: e.target.value })} />
              <button type="button" aria-label="Remove source" onClick={() => setD({ ...d, sources: d.sources.filter((_, j) => j !== i) })}
                className="rounded-xl border-2 border-line px-2 text-muted hover:border-danger hover:text-danger"><X size={14} /></button>
            </div>
          ))}
          {d.sources.length < 15 && (
            <Button variant="ghost" onClick={() => setD({ ...d, sources: [...d.sources, { url: "", title: "" }] })}><Plus size={14} /> Add source</Button>)}
        </div>
        {err ? <ErrorBox error={err} /> : null}
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
          <Button variant="outline" onClick={() => save(editing === "new" ? false : null)} loading={busy}>{editing === "new" ? "Save as draft" : "Save"}</Button>
          <Button onClick={() => save(true)} loading={busy}>Save &amp; publish</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted">Published posts are public at <a href="/geopolitics/" target="_blank" className="font-semibold text-primary">/geopolitics <ExternalLink size={12} className="inline" /></a> — anyone can read them, no sign-in needed.</p>
        <Button className="ml-auto" onClick={() => edit("new")}><Plus size={16} /> New post</Button>
      </div>
      {msg && <p className="text-sm font-semibold text-green">{msg} ✓</p>}
      {err ? <ErrorBox error={err} /> : null}
      {list.loading ? <Loading /> : !list.data?.items.length ? <Empty icon="🌍" title="No posts yet">Write the first one.</Empty> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr><th className="p-3">Title</th><th className="p-3">Status</th><th className="p-3">Sources</th><th className="p-3">Updated</th><th className="p-3" /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.data.items.map((r) => (
                <tr key={r.id}>
                  <td className="p-3 font-semibold">{r.title}{r.published_at && <div className="text-xs font-normal text-muted">published {fmtDate(r.published_at)}</div>}
                    {r.status === "PUBLISHED" && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-normal">
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">{r.url}</a>
                        <button onClick={async () => { try { await navigator.clipboard.writeText(r.url); setCopied(r.id); } catch { /* blocked */ } }}
                          className="inline-flex items-center gap-1 rounded-lg border border-line px-1.5 py-0.5 text-ink-2 hover:border-primary">
                          <Copy size={11} /> {copied === r.id ? "copied ✓" : "copy link"}</button>
                      </div>)}</td>
                  <td className="p-3">{r.status === "PUBLISHED" ? <Chip tone="green">published</Chip> : <Chip tone="saffron">draft</Chip>}</td>
                  <td className="p-3 font-mono">{r.sources}</td>
                  <td className="p-3 text-ink-2">{fmtDate(r.updated_at)}</td>
                  <td className="whitespace-nowrap p-3 text-right">
                    {confirmDel === r.id ? (
                      <span className="inline-flex gap-1.5">
                        <Button variant="outline" className="!px-2.5 !py-1 text-xs" onClick={() => setConfirmDel(undefined)}>Cancel</Button>
                        <Button className="!bg-danger !px-2.5 !py-1 text-xs" onClick={() => remove(r.id)}>Delete post</Button>
                      </span>
                    ) : (
                      <span className="inline-flex gap-1.5">
                        <Button variant="outline" className="!px-2.5 !py-1 text-xs" onClick={() => edit(r.id)}><Pencil size={13} /> Edit</Button>
                        {r.status === "PUBLISHED"
                          ? <Button variant="outline" className="!px-2.5 !py-1 text-xs" onClick={() => status(r.id, false)}><EyeOff size={13} /> Unpublish</Button>
                          : <Button className="!px-2.5 !py-1 text-xs" onClick={() => status(r.id, true)}><Eye size={13} /> Publish</Button>}
                        <button onClick={() => setConfirmDel(r.id)} aria-label={`Delete ${r.title}`} className="rounded-xl border-2 border-line px-2 py-1 text-danger hover:border-danger"><Trash2 size={13} /></button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
