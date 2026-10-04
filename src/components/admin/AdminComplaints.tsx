"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { fmtDate } from "@/lib/labels";
import { type Complaint, STATUS_TONE, Thread } from "../support";
import { Button, Card, Chip, Empty, Loading, Segmented, cx } from "../ui";

type Flag = { _id: string; qid: string; uid: string; reason: string; note?: string; at: string; scope?: string };

export default function AdminComplaints() {
  const [tab, setTab] = useState<"tickets" | "reports">("tickets");
  const [status, setStatus] = useState("OPEN");
  const list = useAsync(() => api<{ items: Complaint[] }>(`/api/v1/platform/admin/complaints?limit=50${status !== "ALL" ? `&status=${status}` : ""}`), [status]);
  const flags = useAsync(() => api<{ items: Flag[] }>("/api/v1/platform/admin/flags?limit=50"), []);
  const [open, setOpen] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const current = list.data?.items.find((c) => c.complaint_id === open);

  async function update(body: Record<string, unknown>) {
    if (!current) return;
    await api(`/api/v1/platform/admin/complaints/${current.complaint_id}`, { method: "PATCH", json: body });
    list.reload();
  }

  return (
    <div className="space-y-4">
      <Segmented value={tab} onChange={setTab} options={[{ value: "tickets", label: "User complaints" }, { value: "reports", label: `Question reports (${flags.data?.items.length ?? 0})` }]} />
      {tab === "tickets" ? (
        <>
          <Segmented value={status} onChange={(v) => { setStatus(v); setOpen(null); }} options={["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED", "ALL"].map((s) => ({ value: s, label: s.replace("_", " ").toLowerCase() }))} />
          {list.loading ? <Loading /> : !list.data?.items.length ? <Empty icon="🎉" title="Nothing here" /> : (
            <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
              <Card className="p-2">
                {list.data.items.map((c) => (
                  <button key={c.complaint_id} onClick={() => setOpen(c.complaint_id)}
                    className={cx("flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left hover:bg-surface-2", open === c.complaint_id && "bg-surface-2")}>
                    <div className="min-w-0"><div className="truncate text-sm font-semibold">{c.subject}</div>
                      <div className="text-xs text-muted">{c.user_name ?? c.uid} · {c.category.toLowerCase()} · {fmtDate(c.updated_at)}</div></div>
                    <Chip tone={STATUS_TONE[c.status]}>{c.status.replace("_", " ").toLowerCase()}</Chip>
                  </button>
                ))}
              </Card>
              {current ? (
                <Card>
                  <div className="mb-1 font-display text-lg font-bold">{current.subject}</div>
                  <div className="mb-3 text-xs text-muted">{current.user_name} ({current.uid}) · {current.category}{current.ref ? ` · ref ${current.ref}` : ""}</div>
                  <Thread c={current} admin />
                  <form className="mt-3 flex gap-2" onSubmit={async (e) => {
                    e.preventDefault();
                    if (!reply.trim()) return;
                    await api(`/api/v1/platform/admin/complaints/${current.complaint_id}/messages`, { method: "POST", json: { text: reply } });
                    setReply(""); list.reload();
                  }}>
                    <input className="flex-1 rounded-2xl border-2 border-line bg-bg px-3 py-2 text-sm" placeholder="Reply to the user…" value={reply} onChange={(e) => setReply(e.target.value)} />
                    <Button type="submit" className="!py-2"><Send size={14} /></Button>
                  </form>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["IN_PROGRESS", "RESOLVED", "REJECTED", "OPEN"].filter((s) => s !== current.status).map((s) => (
                      <Button key={s} variant="outline" className="!py-1.5" onClick={() => update({ status: s })}>Mark {s.replace("_", " ").toLowerCase()}</Button>
                    ))}
                  </div>
                </Card>
              ) : <Empty icon="💬" title="Pick a complaint" />}
            </div>
          )}
        </>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted"><tr><th className="p-3">Question</th><th className="p-3">Reason</th><th className="p-3">Note</th><th className="p-3">When</th><th /></tr></thead>
            <tbody className="divide-y divide-line">
              {flags.data?.items.map((f) => (
                <tr key={f._id}>
                  <td className="p-3 font-mono text-xs">{f.qid}</td><td className="p-3"><Chip tone="danger">{f.reason}</Chip></td>
                  <td className="p-3">{f.note ?? "—"}</td><td className="p-3 text-muted">{fmtDate(f.at)}</td>
                  <td className="p-3 text-right space-x-1">
                    <Button variant="outline" className="!py-1" onClick={async () => { await api(`/api/v1/platform/admin/flags/${f._id}`, { method: "PATCH", json: { status: "RESOLVED" } }); flags.reload(); }}>Resolve</Button>
                    <Button variant="ghost" className="!py-1" onClick={async () => { await api(`/api/v1/platform/admin/flags/${f._id}`, { method: "PATCH", json: { status: "DISMISSED" } }); flags.reload(); }}>Dismiss</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {flags.data?.items.length === 0 && <p className="p-6 text-center text-sm text-muted">No open reports.</p>}
        </Card>
      )}
    </div>
  );
}
