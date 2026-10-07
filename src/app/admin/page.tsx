"use client";

import { useState } from "react";
import { BadgeIndianRupee, BookOpen, CreditCard, KeyRound, LayoutGrid, MessageSquareWarning, Newspaper, ShieldCheck, UserCog, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import AdminAdmins, { type AdminRow } from "@/components/admin/AdminAdmins";
import AdminComplaints from "@/components/admin/AdminComplaints";
import AdminCurrentAffairs from "@/components/admin/AdminCurrentAffairs";
import AdminPayments from "@/components/admin/AdminPayments";
import AdminPlans from "@/components/admin/AdminPlans";
import AdminSources from "@/components/admin/AdminSources";
import AdminUsers from "@/components/admin/AdminUsers";
import { Button, Card, Chip, Empty, ErrorBox, Loading, PageHeader, cx } from "@/components/ui";
import { api } from "@/lib/api";
import { useAsync, useSession } from "@/lib/hooks";
import { FORMAT_LABEL, fmtDate } from "@/lib/labels";

type Tab = "overview" | "users" | "admins" | "plans" | "payments" | "complaints" | "sources" | "ca" | "quality";
const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid }, { id: "users", label: "Users", icon: Users }, { id: "admins", label: "Admins", icon: UserCog },
  { id: "plans", label: "Plans & pricing", icon: BadgeIndianRupee }, { id: "payments", label: "Payments", icon: CreditCard }, { id: "complaints", label: "Complaints", icon: MessageSquareWarning },
  { id: "sources", label: "Sources (GS & optional)", icon: BookOpen }, { id: "ca", label: "Current affairs", icon: Newspaper },
  { id: "quality", label: "Question bank", icon: ShieldCheck },
];

type Overview = { complaints: Record<string, number>; payments: { revenue_paise: number; paid: number; active_subscribers: number };
  bank: Record<string, number> };

export default function Admin() {
  const session = useSession();
  const [tab, setTab] = useState<Tab>("overview");
  const me = useAsync(() => session?.admin ? api<{ items: AdminRow[] }>("/api/v1/platform/admin/admins") : Promise.resolve({ items: [] }), [session?.admin]);
  const mustChange = !!me.data?.items.find((a) => a.you)?.must_change_password;
  if (!session) return null;
  if (!session.admin) return <AppShell><Empty icon="🛡️" title="Admins only">Use “Login as Admin” on the sign-in page with the registered admin email and password.</Empty></AppShell>;
  return (
    <AppShell wide>
      <PageHeader kicker="Admin console" title="Run the show" sub="Users, payments, complaints, study sources and the daily newspaper — all in one place." />
      {mustChange && (
        <div className="mb-6 space-y-3 rounded-3xl border-2 border-saffron bg-saffron-soft p-4">
          <div className="flex items-center gap-2 font-semibold"><KeyRound size={16} /> You're signed in with a temporary password — set your own now.</div>
          <PasswordCard onChanged={me.reload} />
        </div>
      )}
      <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cx("flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold",
              tab === id ? "bg-primary text-primary-ink" : "bg-surface text-ink-2 hover:bg-surface-2")}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      {tab === "overview" && <AdminOverview go={setTab} />}
      {tab === "users" && <AdminUsers />}
      {tab === "admins" && <AdminAdmins />}
      {tab === "plans" && <AdminPlans />}
      {tab === "payments" && <AdminPayments />}
      {tab === "complaints" && <AdminComplaints />}
      {tab === "sources" && <AdminSources />}
      {tab === "ca" && <AdminCurrentAffairs />}
      {tab === "quality" && <AdminQuality />}
    </AppShell>
  );
}

function PasswordCard({ onChanged }: { onChanged?: () => void } = {}) {
  const [old, setOld] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<string>();
  const [err, setErr] = useState<unknown>();
  return (
    <Card>
      <div className="mb-2 font-display text-lg font-bold">Admin password</div>
      <form className="flex flex-wrap gap-2" onSubmit={async (e) => {
        e.preventDefault(); setErr(undefined); setMsg(undefined);
        try { await api("/api/v1/auth/admin/password", { method: "POST", json: { old_password: old, new_password: next } }); setMsg("Password changed ✓"); setOld(""); setNext(""); onChanged?.(); }
        catch (e2) { setErr(e2); }
      }}>
        <input type="password" required placeholder="Current password" value={old} onChange={(e) => setOld(e.target.value)} className="rounded-2xl border-2 border-line bg-bg px-3 py-2 text-sm" />
        <input type="password" required minLength={10} placeholder="New password (10+ characters)" value={next} onChange={(e) => setNext(e.target.value)} className="rounded-2xl border-2 border-line bg-bg px-3 py-2 text-sm" />
        <Button type="submit" variant="outline">Change</Button>
      </form>
      {msg && <p className="mt-2 text-sm font-semibold text-green">{msg}</p>}
      {err ? <div className="mt-2"><ErrorBox error={err} /></div> : null}
    </Card>
  );
}

function AdminOverview({ go }: { go: (t: Tab) => void }) {
  const o = useAsync(() => api<Overview>("/api/v1/platform/admin/overview"), []);
  if (o.loading) return <Loading />;
  if (o.error || !o.data) return <ErrorBox error={o.error} />;
  const bank = o.data.bank;
  const tiles: [string, string | number, Tab][] = [
    ["Open complaints", o.data.complaints.OPEN ?? 0, "complaints"], ["In progress", o.data.complaints.IN_PROGRESS ?? 0, "complaints"],
    ["Revenue (30d)", `₹${(o.data.payments.revenue_paise / 100).toLocaleString("en-IN")}`, "payments"],
    ["Active subscribers", o.data.payments.active_subscribers, "payments"], ["Needs review", bank.needs_review ?? 0, "quality"],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map(([l, v, t]) => (
          <button key={l} onClick={() => go(t)} className="rounded-3xl border border-line bg-surface p-4 text-left hover:border-ink">
            <div className="font-mono text-3xl font-bold">{v}</div><div className="text-xs text-muted">{l}</div>
          </button>
        ))}
      </div>
      <Card>
        <div className="mb-3 font-display text-lg font-bold">Servable questions in the bank</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted"><tr><th className="p-2">Paper</th><th className="p-2 text-right">Prelims</th><th className="p-2 text-right">Mains</th></tr></thead>
            <tbody className="divide-y divide-line">
              {["GS1", "GS2", "GS3", "GS4", "PSIR"].map((p) => (
                <tr key={p}><td className="p-2 font-semibold">{p}</td>
                  <td className="p-2 text-right font-mono">{bank[`${p}_PRELIMS`] ?? 0}</td><td className="p-2 text-right font-mono">{bank[`${p}_MAINS`] ?? 0}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <PasswordCard />
    </div>
  );
}

type Q = { _id: string; paper: string; stem: string; statements: string[]; options: string[]; answer_key: number; explanation: string;
  format: string; bucket: string; topic_ids: string[]; created_at: string; owner_uid?: string | null;
  guardrails?: { status: string; layer: string; issues: string[] };
  validation?: { critic_answer?: number; critic_score?: number; fact_flags?: string[] }; generation?: { model?: string } };

const JOBS = [
  { id: "nightly", label: "Run nightly", hint: "replenish · stats · reports · batch evals" },
  { id: "replenish", label: "Replenish bank", hint: "generate for thin pools (OpenAI)" },
  { id: "pyq-reanalyze", label: "Re-analyse PYQs", hint: "weekly + after imports" },
  { id: "rebuild-pools", label: "Rebuild pools", hint: "after bulk edits" },
  { id: "build-canonical", label: "Refresh canonical notes", hint: "gpt-5.4" },
  { id: "ca-ingest", label: "RSS ingest (optional)", hint: "only if enabled" },
];

function AdminQuality() {
  const queue = useAsync(() => api<{ items: Q[] }>("/api/v1/platform/admin/review-queue?limit=30"), []);
  const mix = useAsync(() => api<Record<string, unknown>>("/api/v1/platform/admin/config/test_mix"), []);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState<unknown>();

  const [busy, setBusy] = useState<Record<string, "approve" | "retire">>({});
  const [done, setDone] = useState<Set<string>>(new Set());
  const [confirmAll, setConfirmAll] = useState(false);
  const [allBusy, setAllBusy] = useState(false);
  const pending = (queue.data?.items ?? []).filter((q) => !done.has(q._id));

  async function review(qid: string, action: "approve" | "retire") {
    if (busy[qid]) return;                                   // one request per click — no repeats
    setErr(undefined); setBusy((b) => ({ ...b, [qid]: action }));
    try {
      await api(`/api/v1/platform/admin/questions/${qid}/review`, { method: "POST", json: { action } });
      setDone((d) => new Set(d).add(qid));                   // leaves the list at once; pools refresh in the background
      setMsg(action === "approve" ? "Approved — it's in the question bank" : "Retired");
    } catch (e) { setErr(e); }
    finally { setBusy((b) => { const n = { ...b }; delete n[qid]; return n; }); }
  }

  async function approveAll() {
    setErr(undefined); setAllBusy(true);
    try {
      const r = await api<{ approved: number; papers: string[] }>("/api/v1/platform/admin/review-queue/approve-all", { method: "POST", json: {} });
      setMsg(`Approved ${r.approved} question${r.approved === 1 ? "" : "s"}${r.papers.length ? ` (${r.papers.join(", ")})` : ""} — tests pick them up within a minute`);
      setDone(new Set()); setConfirmAll(false); queue.reload();
    } catch (e) { setErr(e); }
    finally { setAllBusy(false); }
  }
  return (
    <div className="space-y-6">
      {err ? <ErrorBox error={err} /> : null}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl font-bold">Review queue</h2>
          {pending.length > 0 && (confirmAll ? (
            <span className="ml-auto inline-flex flex-wrap items-center gap-2 text-sm">
              Approve every question waiting for review?
              <Button variant="outline" className="!py-1.5" onClick={() => setConfirmAll(false)} disabled={allBusy}>Cancel</Button>
              <Button className="!py-1.5" onClick={approveAll} loading={allBusy}>Yes, approve all</Button>
            </span>
          ) : <Button className="ml-auto !py-1.5" onClick={() => setConfirmAll(true)}>Approve all</Button>)}
        </div>
        <p className="mb-3 text-sm text-muted">Generated questions where the critic disagreed, guardrail models were unavailable, or 3+ users reported a problem.</p>
        {msg && <p className="mb-3 text-sm font-semibold text-green">{msg} ✓</p>}
        {queue.loading ? <Loading /> : pending.length === 0 ? <Empty title="Queue is clear ✨" /> : (
          <div className="space-y-4">
            {pending.map((q) => (
              <Card key={q._id}>
                <div className="flex flex-wrap gap-2">
                  <Chip tone="primary">{q.paper}</Chip><Chip>{q.topic_ids[0]}</Chip><Chip>{FORMAT_LABEL[q.format] ?? q.format}</Chip><Chip tone="saffron">{q.bucket}</Chip>
                  {q.guardrails && <Chip tone={q.guardrails.status === "PASS" ? "green" : "danger"}>guardrails: {q.guardrails.status.toLowerCase()}</Chip>}
                  {q.owner_uid && <Chip>private</Chip>}
                  <span className="ml-auto text-xs text-muted">{q.generation?.model} · {fmtDate(q.created_at)}</span>
                </div>
                <p className="mt-3 font-semibold">{q.stem}</p>
                {!!q.statements.length && <ol className="mt-1 text-sm text-ink-2">{q.statements.map((s, i) => <li key={i}>{i + 1}. {s}</li>)}</ol>}
                <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                  {q.options.map((o, i) => <li key={i} className={i === q.answer_key ? "font-bold text-green" : ""}>{"abcd"[i]}. {o}{i === q.answer_key && " ✓ key"}{q.validation?.critic_answer === i && i !== q.answer_key && " ← critic"}</li>)}
                </ul>
                <p className="mt-2 text-xs text-muted">Critic: {q.validation?.critic_answer ?? "—"} ({q.validation?.critic_score ?? "—"}) · Guardrail notes: {(q.guardrails?.issues ?? []).join("; ") || "—"} · Claims: {(q.validation?.fact_flags ?? []).join("; ") || "—"}</p>
                <div className="mt-3 flex gap-2">
                  <Button className="!py-1.5" onClick={() => review(q._id, "approve")} disabled={!!busy[q._id]} loading={busy[q._id] === "approve"}>
                    {busy[q._id] === "approve" ? "Approving…" : "Approve"}</Button>
                  <Button variant="outline" className="!py-1.5" onClick={() => review(q._id, "retire")} disabled={!!busy[q._id]} loading={busy[q._id] === "retire"}>
                    {busy[q._id] === "retire" ? "Retiring…" : "Retire"}</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div>
        <h2 className="mb-3 font-display text-xl font-bold">Jobs</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {JOBS.map((j) => (
            <Card key={j.id} className="flex items-center justify-between gap-3">
              <div><div className="font-semibold">{j.label}</div><div className="text-xs text-muted">{j.hint}</div></div>
              <Button variant="outline" className="!py-1.5" onClick={async () => {
                try { await api(`/api/v1/platform/admin/jobs/${j.id}`, { method: "POST", json: {} }); setMsg(`Queued ${j.label}`); setTimeout(() => queue.reload(), 2500); }
                catch (e) { setErr(e); }
              }}>Run</Button>
            </Card>
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-3 font-display text-xl font-bold">Test mix (config/test_mix)</h2>
        {mix.loading ? <Loading /> : <Card><pre className="overflow-x-auto text-xs">{JSON.stringify(mix.data, null, 2)}</pre></Card>}
      </div>
    </div>
  );
}
