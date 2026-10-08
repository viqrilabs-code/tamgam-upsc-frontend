"use client";

import { useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { api, content } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { fmtDate } from "@/lib/labels";
import type { SyllabusNode } from "@/lib/types";
import { Button, Card, Chip, Empty, ErrorBox, Loading } from "../ui";

type Row = { id: string; paper: string; topic: string; topic_name?: string | null; status: "DRAFT" | "PUBLISHED"; updated_at?: string };
type Draft = { paper: string; topic: string; topic_id: string; introduction: string; body: string; initiatives: string; conclusion: string };
const EMPTY: Draft = { paper: "GS2", topic: "", topic_id: "", introduction: "", body: "", initiatives: "", conclusion: "" };
const PAPERS = ["GS1", "GS2", "GS3", "GS4", "PSIR"];
const field = "w-full rounded-2xl border-2 border-line bg-bg px-3 py-2 text-sm outline-none focus:border-primary";

/** Admin → Revision: write one-topic revision cards. Members only ever see published cards. */
export default function AdminRevision() {
  const list = useAsync(() => api<{ items: Row[] }>("/api/v1/revision/admin/cards"), []);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [d, setD] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string>();
  const [err, setErr] = useState<unknown>();
  const [msg, setMsg] = useState("");
  const syllabus = useAsync(() => content<{ nodes: SyllabusNode[] }>(`syllabus/${d.paper}.json`).catch(() => ({ nodes: [] as SyllabusNode[] })), [d.paper]);

  async function edit(id: string | "new") {
    setErr(undefined); setMsg("");
    if (id === "new") { setD(EMPTY); setEditing("new"); return; }
    try {
      const c = await api<Draft & { topic_id?: string | null; initiatives?: string | null }>(`/api/v1/revision/admin/cards/${id}`);
      setD({ ...EMPTY, ...c, topic_id: c.topic_id ?? "", initiatives: c.initiatives ?? "" });
      setEditing(id);
    } catch (e) { setErr(e); }
  }

  async function save(publish: boolean | null) {
    setBusy(true); setErr(undefined);
    try {
      const body = { ...d, topic_id: d.topic_id || null, ...(publish === null ? {} : { publish }) };
      const out = await api<Row>(editing === "new" ? "/api/v1/revision/admin/cards" : `/api/v1/revision/admin/cards/${editing}`,
        { method: editing === "new" ? "POST" : "PUT", json: body });
      setMsg(out.status === "PUBLISHED" ? `Published “${out.topic}” — students can see it now` : `Saved “${out.topic}” as a draft`);
      setEditing(null); list.reload();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  }

  async function status(id: string, publish: boolean) {
    setErr(undefined);
    try { await api(`/api/v1/revision/admin/cards/${id}/status`, { method: "POST", json: { publish } }); list.reload(); }
    catch (e) { setErr(e); }
  }

  async function remove(id: string) {
    setErr(undefined);
    try { await api(`/api/v1/revision/admin/cards/${id}`, { method: "DELETE" }); setConfirmDel(undefined); list.reload(); }
    catch (e) { setErr(e); }
  }

  if (editing) {
    const topics = (syllabus.data?.nodes ?? []).filter((t) => t.leaf);
    return (
      <Card className="space-y-4">
        <div className="font-display text-xl font-bold">{editing === "new" ? "New revision card" : "Edit revision card"}</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold">Paper
            <select className={field} value={d.paper} onChange={(e) => setD({ ...d, paper: e.target.value, topic_id: "" })}>
              {PAPERS.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="text-sm font-semibold sm:col-span-2">Topic
            <input className={field} value={d.topic} maxLength={150} onChange={(e) => setD({ ...d, topic: e.target.value })} placeholder="e.g. Cooperative federalism" /></label>
          <label className="text-sm font-semibold sm:col-span-3">Syllabus topic (optional)
            <select className={field} value={d.topic_id} onChange={(e) => setD({ ...d, topic_id: e.target.value })}>
              <option value="">—</option>{topics.map((t) => <option key={t.node_id} value={t.node_id}>{t.name}</option>)}</select></label>
        </div>
        {([["introduction", "Introduction", 4], ["body", "Main body", 10], ["initiatives", "Recent government initiatives (optional)", 5], ["conclusion", "Conclusion", 3]] as const).map(([k, label, rows]) => (
          <label key={k} className="block text-sm font-semibold">{label}
            <textarea className={`${field} mt-1 font-normal leading-relaxed`} rows={rows} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
          </label>
        ))}
        <p className="text-xs text-muted">Tip: start lines with “- ” to show them as bullet points.</p>
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
        <p className="text-sm text-muted">Students (signed in, any plan) see published cards under Revision. They can read but not edit.</p>
        <Button className="ml-auto" onClick={() => edit("new")}><Plus size={16} /> New card</Button>
      </div>
      {msg && <p className="text-sm font-semibold text-green">{msg} ✓</p>}
      {err ? <ErrorBox error={err} /> : null}
      {list.loading ? <Loading /> : !list.data?.items.length ? <Empty icon="📗" title="No revision cards yet">Create the first one.</Empty> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr><th className="p-3">Topic</th><th className="p-3">Paper</th><th className="p-3">Status</th><th className="p-3">Updated</th><th className="p-3" /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.data.items.map((r) => (
                <tr key={r.id}>
                  <td className="p-3 font-semibold">{r.topic}{r.topic_name && <div className="text-xs font-normal text-muted">{r.topic_name}</div>}</td>
                  <td className="p-3"><Chip tone="primary">{r.paper}</Chip></td>
                  <td className="p-3">{r.status === "PUBLISHED" ? <Chip tone="green">published</Chip> : <Chip tone="saffron">draft</Chip>}</td>
                  <td className="p-3 text-ink-2">{fmtDate(r.updated_at)}</td>
                  <td className="whitespace-nowrap p-3 text-right">
                    {confirmDel === r.id ? (
                      <span className="inline-flex gap-1.5">
                        <Button variant="outline" className="!px-2.5 !py-1 text-xs" onClick={() => setConfirmDel(undefined)}>Cancel</Button>
                        <Button className="!bg-danger !px-2.5 !py-1 text-xs" onClick={() => remove(r.id)}>Delete card</Button>
                      </span>
                    ) : (
                      <span className="inline-flex gap-1.5">
                        <Button variant="outline" className="!px-2.5 !py-1 text-xs" onClick={() => edit(r.id)}><Pencil size={13} /> Edit</Button>
                        {r.status === "PUBLISHED"
                          ? <Button variant="outline" className="!px-2.5 !py-1 text-xs" onClick={() => status(r.id, false)}><EyeOff size={13} /> Unpublish</Button>
                          : <Button className="!px-2.5 !py-1 text-xs" onClick={() => status(r.id, true)}><Eye size={13} /> Publish</Button>}
                        <button onClick={() => setConfirmDel(r.id)} aria-label={`Delete ${r.topic}`} className="rounded-xl border-2 border-line px-2 py-1 text-danger hover:border-danger"><Trash2 size={13} /></button>
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
