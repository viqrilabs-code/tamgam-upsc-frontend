"use client";

import { useState } from "react";
import { FileUp } from "lucide-react";
import { api, content, putSigned } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { fmtDate } from "@/lib/labels";
import { Button, Card, Chip, ErrorBox, Loading, Segmented } from "../ui";

type Source = { _id: string; title: string; paper: string; topic_ids: string[]; tags?: string[]; section?: string; kind: string;
  status: string; chunks: number; pages?: number; error?: string; created_at: string; filename: string; files?: { filename: string }[] };
type Node = { node_id: string; name: string; leaf: boolean };

const PAPERS = ["GS1", "GS2", "GS3", "GS4", "PSIR", "ESSAY", "OPTIONAL"];
const TONE: Record<string, "green" | "saffron" | "danger" | "neutral" | "primary"> = {
  INDEXED: "green", INDEXING: "primary", PENDING_UPLOAD: "saffron", FAILED: "danger", REJECTED: "danger", RETIRED: "neutral" };

export default function AdminSources() {
  const [paper, setPaper] = useState("GS1");
  const list = useAsync(() => api<{ items: Source[] }>(`/api/v1/library/admin/sources?limit=50&paper=${paper}`), [paper]);
  const [form, setForm] = useState({ title: "", tags: "", section: "", kind: "BOOK", rights: false });
  const [topics, setTopics] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const syllabus = useAsync(async () => (["GS1", "GS2", "GS3", "GS4", "PSIR"].includes(paper)
    ? (await content<{ nodes: Node[] }>(`syllabus/${paper}.json`)).nodes : []), [paper]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length) return;
    setBusy(true); setErr(undefined);
    try {
      const r = await api<{ source_id: string; uploads: { upload_url: string; content_type: string }[] }>("/api/v1/library/admin/sources", { method: "POST", json: {
        title: form.title, paper, topics: [...topics, ...form.tags.split(",").map((t) => t.trim()).filter(Boolean)],
        section: form.section || null, kind: form.kind, rights_ack: form.rights,
        files: files.map((f) => ({ filename: f.name, content_type: f.type || "application/pdf", size: f.size })) } });
      await Promise.all(r.uploads.map((u, i) => putSigned(u.upload_url, files[i], u.content_type)));
      await api(`/api/v1/library/admin/sources/${r.source_id}/index`, { method: "POST" });
      setForm({ title: "", tags: "", section: "", kind: "BOOK", rights: false }); setFiles([]); setTopics([]);
      setTimeout(list.reload, 800);
    } catch (e2) { setErr(e2); } finally { setBusy(false); }
  }

  const field = "w-full rounded-2xl border-2 border-line bg-bg px-3 py-2 text-sm outline-none focus:border-primary";
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-2">Books, notes, reports and government documents per paper. Indexed sources ground AI question generation (RAG) for GS papers and the optional. Every file passes a content-safety screen.</p>
      <Segmented value={paper} onChange={setPaper} options={PAPERS.map((p) => ({ value: p, label: p }))} />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card sticker>
          <form onSubmit={submit} className="space-y-3">
            <div className="font-display font-bold">Add a {paper} source</div>
            <input className={field} placeholder="Title (e.g. NCERT Class 11 Geography)" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            {!!syllabus.data?.length && (
              <div>
                <div className="mb-1 text-xs font-bold uppercase text-muted">Syllabus topics (optional)</div>
                <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                  {syllabus.data.filter((n) => n.leaf).map((n) => {
                    const on = topics.includes(n.node_id);
                    return <button type="button" key={n.node_id} onClick={() => setTopics(on ? topics.filter((t) => t !== n.node_id) : [...topics, n.node_id])}
                      className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-semibold ${on ? "border-primary bg-primary-soft text-primary" : "border-line text-ink-2"}`}>{n.name}</button>;
                  })}
                </div>
              </div>
            )}
            <input className={field} placeholder="Other topics / tags, comma separated (e.g. Geomorphology)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            <div className="flex gap-2">
              <select className={field} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {["BOOK", "NOTES", "REPORT", "GOVT_DOC", "OTHER"].map((k) => <option key={k}>{k}</option>)}
              </select>
              {paper === "PSIR" && (
                <select className={field} value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
                  <option value="">Section…</option>{["A", "B"].map((s) => <option key={s}>{s}</option>)}
                </select>
              )}
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/40 px-3 py-4 text-sm font-semibold">
              <FileUp size={16} /> {files.length ? `${files.length} file(s): ${files.map((f) => f.name).join(", ").slice(0, 60)}` : "Choose PDFs / images (up to 20 files, 80 MB each)"}
              <input type="file" multiple accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 20))} />
            </label>
            <label className="flex items-start gap-2 text-xs text-ink-2"><input type="checkbox" checked={form.rights} onChange={(e) => setForm({ ...form, rights: e.target.checked })} className="mt-0.5" required />
              I confirm TamGam has the rights to use this material for question generation.</label>
            {err ? <ErrorBox error={err} /> : null}
            <Button type="submit" loading={busy} disabled={!files.length}>Upload & index</Button>
          </form>
        </Card>
        {list.loading ? <Loading /> : (
          <Card className="p-2">
            {list.data?.items.length === 0 && <p className="p-6 text-center text-sm text-muted">No {paper} sources yet.</p>}
            {list.data?.items.map((s) => (
              <div key={s._id} className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 hover:bg-surface-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{s.title}</div>
                  <div className="text-xs text-muted">{s.kind.toLowerCase()} · {s.chunks} chunks{s.pages ? ` · ${s.pages} pages` : ""} · {fmtDate(s.created_at)}{s.topic_ids.length ? ` · ${s.topic_ids.join(", ")}` : ""}{s.tags?.length ? ` · tags: ${s.tags.join(", ")}` : ""}{s.files && s.files.length > 1 ? ` · ${s.files.length} files` : ""}</div>
                  {s.error && <div className="text-xs text-danger">{s.error}</div>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Chip tone={TONE[s.status] ?? "neutral"}>{s.status.toLowerCase()}</Chip>
                  {s.status !== "RETIRED" && <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={async () => { await api(`/api/v1/library/admin/sources/${s._id}`, { method: "DELETE" }); list.reload(); }}>Retire</Button>}
                  {["FAILED"].includes(s.status) && <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={async () => { await api(`/api/v1/library/admin/sources/${s._id}/index`, { method: "POST" }); list.reload(); }}>Retry</Button>}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
