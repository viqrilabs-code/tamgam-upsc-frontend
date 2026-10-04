"use client";

import { useState } from "react";
import { MessageSquarePlus, Send } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button, Card, Chip, Empty, ErrorBox, Loading, PageHeader, cx } from "@/components/ui";
import { api } from "@/lib/api";
import { useAsync, useSession } from "@/lib/hooks";
import { fmtDate } from "@/lib/labels";
import { type Complaint, STATUS_TONE, Thread } from "@/components/support";

const CATS = [["QUESTION", "A question is wrong"], ["EVALUATION", "Mains evaluation"], ["PAYMENT", "Payment / plan"],
  ["NOTES", "Notes"], ["CURRENT_AFFAIRS", "Current affairs"], ["ACCOUNT", "Account / sign-in"], ["OTHER", "Something else"]];

export default function Help() {
  const session = useSession();
  const list = useAsync(() => api<{ items: Complaint[] }>("/api/v1/platform/complaints"), []);
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "QUESTION", subject: "", message: "", ref: "" });
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>();
  if (!session) return null;
  const field = "mt-1 w-full rounded-2xl border-2 border-line bg-bg px-3 py-2.5 outline-none focus:border-primary";
  const current = list.data?.items.find((c) => c.complaint_id === open);

  return (
    <AppShell guestPreview={{ emoji: "🛟", title: "Help & complaints", points: [
      "Report a wrong answer key or a payment problem", "A real person replies in a thread", "Track every complaint's status"] }}>
      <PageHeader kicker="Help" title="Raise a complaint" sub="Wrong answer key? Evaluation feels off? Payment issue? Tell us — a human replies here." />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card sticker>
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault(); setBusy(true); setErr(undefined);
            try {
              const c = await api<Complaint>("/api/v1/platform/complaints", { method: "POST", json: { ...form, ref: form.ref || null } });
              setForm({ category: "QUESTION", subject: "", message: "", ref: "" });
              await list.reload();
              setOpen(c.complaint_id);
            } catch (e2) { setErr(e2); } finally { setBusy(false); }
          }}>
            <div className="flex items-center gap-2 font-display text-lg font-bold"><MessageSquarePlus size={18} /> New complaint</div>
            <label className="block text-sm font-semibold">About
              <select className={field} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></label>
            <label className="block text-sm font-semibold">Subject
              <input className={field} required minLength={3} maxLength={120} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
            <label className="block text-sm font-semibold">Details
              <textarea className={field} required minLength={5} rows={5} maxLength={3000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
            <label className="block text-sm font-semibold">Reference <span className="font-normal text-muted">(optional: attempt, question or order id)</span>
              <input className={field} maxLength={80} value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} /></label>
            {err ? <ErrorBox error={err} /> : null}
            <Button type="submit" loading={busy}>Submit</Button>
          </form>
        </Card>
        <div className="space-y-4">
          {list.loading ? <Loading /> : !list.data?.items.length ? <Empty icon="🛟" title="No complaints yet">Hopefully it stays that way.</Empty> : (
            <Card className="p-2">
              {list.data.items.map((c) => (
                <button key={c.complaint_id} onClick={() => setOpen(c.complaint_id)}
                  className={cx("flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left hover:bg-surface-2", open === c.complaint_id && "bg-surface-2")}>
                  <div className="min-w-0"><div className="truncate text-sm font-semibold">{c.subject}</div>
                    <div className="text-xs text-muted">{c.category.replace("_", " ").toLowerCase()} · {fmtDate(c.updated_at)}</div></div>
                  <Chip tone={STATUS_TONE[c.status]}>{c.status.replace("_", " ").toLowerCase()}</Chip>
                </button>
              ))}
            </Card>
          )}
          {current && (
            <Card>
              <div className="mb-3 flex items-center justify-between"><div className="font-display font-bold">{current.subject}</div>
                <Chip tone={STATUS_TONE[current.status]}>{current.status.replace("_", " ").toLowerCase()}</Chip></div>
              <Thread c={current} />
              <form className="mt-3 flex gap-2" onSubmit={async (e) => {
                e.preventDefault();
                if (!reply.trim()) return;
                await api(`/api/v1/platform/complaints/${current.complaint_id}/messages`, { method: "POST", json: { text: reply } });
                setReply(""); list.reload();
              }}>
                <input className="flex-1 rounded-2xl border-2 border-line bg-bg px-3 py-2 text-sm" placeholder="Add a reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
                <Button type="submit" className="!py-2"><Send size={14} /></Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
