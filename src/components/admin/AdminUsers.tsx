"use client";

import { useState } from "react";
import { Ban, Crown, Search, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { fmtDate } from "@/lib/labels";
import { Button, Card, Chip, ErrorBox, Loading, Modal, cx } from "../ui";

type U = { uid: string; name?: string; avatar?: string; created_at?: string; last_active_at?: string; email?: string; phone?: string;
  marketing_consent?: boolean; blocked: boolean; roles: string[]; plan: string; valid_till?: string };
type Detail = U & { profile: Record<string, unknown>; entitlements: { services: Record<string, { used: number }> };
  orders: { _id: string; plan: string; amount: number; status: string; created_at: string }[];
  attempts: { count: number }; complaints: { _id: string; subject: string; status: string }[] };

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const users = useAsync(() => api<{ items: U[] }>(`/api/v1/platform/admin/users?limit=50${query ? `&q=${encodeURIComponent(query)}` : ""}`), [query]);

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); setQuery(q); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, user id or phone number"
            className="w-full rounded-2xl border-2 border-line bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </div>
        <Button type="submit">Search</Button>
      </form>
      {users.loading ? <Loading /> : users.error ? <ErrorBox error={users.error} /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr><th className="p-3">User</th><th className="p-3">Email · phone</th><th className="p-3">Plan</th><th className="p-3">Joined</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.data?.items.map((u) => (
                <tr key={u.uid} onClick={() => setSel(u.uid)} className="cursor-pointer hover:bg-surface-2">
                  <td className="p-3"><div className="font-semibold">{u.avatar} {u.name}</div><div className="font-mono text-xs text-muted">{u.uid}</div></td>
                  <td className="p-3">{u.uid.startsWith("admin_") ? <Chip tone="saffron">admin</Chip> : (
                    <div className="space-y-0.5"><div className="text-sm">{u.email ?? "—"}</div>
                      {u.phone && <Chip tone="green">{u.phone}{u.marketing_consent ? " · marketing ok" : ""}</Chip>}</div>)}</td>
                  <td className="p-3"><Chip tone={u.plan === "FREE" ? "neutral" : "primary"}>{u.plan}</Chip></td>
                  <td className="p-3 text-muted">{fmtDate(u.created_at)}</td>
                  <td className="p-3 space-x-1">{u.blocked && <Chip tone="danger">blocked</Chip>}{u.roles.map((r) => <Chip key={r} tone="saffron">{r}</Chip>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.data?.items.length === 0 && <p className="p-6 text-center text-sm text-muted">No users match.</p>}
        </Card>
      )}
      {sel && <UserDrawer uid={sel} onClose={() => { setSel(null); users.reload(); }} />}
    </div>
  );
}

function UserDrawer({ uid, onClose }: { uid: string; onClose: () => void }) {
  const d = useAsync(() => api<Detail>(`/api/v1/platform/admin/users/${uid}`), [uid]);
  const [plan, setPlan] = useState("MONTHLY_PASS");
  const [err, setErr] = useState<unknown>();
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setErr(undefined);
    try { d.setData(await api<Detail>(`/api/v1/platform/admin/users/${uid}`, { method: "PATCH", json: body })); }
    catch (e) { setErr(e); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside className="pop h-full w-full max-w-lg overflow-y-auto bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        {d.loading || !d.data ? <Loading /> : (
          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-2xl font-extrabold">{d.data.avatar} {d.data.name}</div>
                <div className="font-mono text-xs text-muted">{d.data.uid}</div>
              </div>
              <button onClick={onClose} className="text-2xl text-muted" aria-label="Close">×</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {d.data.uid.startsWith("admin_") ? <Chip tone="saffron">admin account</Chip>
                : <>{d.data.email && <Chip tone="green"><ShieldCheck size={12} /> {d.data.email}</Chip>}
                    {d.data.phone ? <Chip>{d.data.phone}{d.data.marketing_consent ? " · marketing ok" : ""}</Chip> : <Chip>no phone</Chip>}</>}
              <Chip tone="primary">{d.data.plan}{d.data.valid_till ? ` · till ${fmtDate(d.data.valid_till)}` : ""}</Chip>
              {d.data.blocked && <Chip tone="danger">blocked</Chip>}
              <Chip>{d.data.attempts.count} attempts</Chip>
              <Chip>last active {fmtDate(d.data.last_active_at)}</Chip>
            </div>
            {err ? <ErrorBox error={err} /> : null}

            <section className="space-y-2">
              <div className="text-xs font-bold uppercase text-muted">Access</div>
              <div className="flex flex-wrap gap-2">
                {d.data.blocked
                  ? <Button variant="outline" onClick={() => patch({ blocked: false })}><UserCheck size={14} /> Unblock</Button>
                  : <Button variant="danger" onClick={() => patch({ blocked: true, reason: "admin action" })}><Ban size={14} /> Block</Button>}
                <Button variant="outline" onClick={() => patch({ roles: d.data!.roles.includes("reviewer") ? d.data!.roles.filter((r) => r !== "reviewer") : [...d.data!.roles, "reviewer"] })}>
                  {d.data.roles.includes("reviewer") ? "Remove reviewer" : "Make reviewer"}</Button>
              </div>
            </section>

            <section className="space-y-2">
              <div className="text-xs font-bold uppercase text-muted">Plan & quota</div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={plan} onChange={(e) => setPlan(e.target.value)} className="rounded-xl border-2 border-line bg-bg px-2 py-1.5 text-sm">
                  {["DAILY_PASS", "MONTHLY_PASS", "FREE"].map((p) => <option key={p}>{p}</option>)}
                </select>
                <Button onClick={() => patch({ grant_plan: { plan } })}><Crown size={14} /> Grant</Button>
                <Button variant="outline" onClick={() => patch({ reset_quota: true })}>Reset allowances</Button>
              </div>
              <div className="text-xs text-muted">Used in this pass: {Object.entries(d.data.entitlements.services).filter(([, v]) => v.used).map(([k, v]) => `${k.replace("_", " ")} ${v.used}`).join(" · ") || "nothing"}</div>
            </section>

            <section>
              <div className="mb-1 text-xs font-bold uppercase text-muted">Orders</div>
              <ul className="space-y-1 text-sm">
                {d.data.orders.map((o) => <li key={o._id} className="flex justify-between"><span>{o.plan} · ₹{o.amount / 100}</span><Chip tone={o.status === "PAID" ? "green" : o.status === "REFUNDED" ? "danger" : "neutral"}>{o.status}</Chip></li>)}
                {d.data.orders.length === 0 && <li className="text-muted">No orders</li>}
              </ul>
            </section>
            <section>
              <div className="mb-1 text-xs font-bold uppercase text-muted">Complaints</div>
              <ul className="space-y-1 text-sm">
                {d.data.complaints.map((c) => <li key={c._id} className="flex justify-between gap-2"><span className="truncate">{c.subject}</span><Chip>{c.status}</Chip></li>)}
                {d.data.complaints.length === 0 && <li className="text-muted">None</li>}
              </ul>
            </section>
            <div className={cx("border-t border-line pt-4")}>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Delete user & data</Button>
            </div>
          </div>
        )}
        <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this user?">
          <p className="text-sm text-ink-2">Removes profile, attempts, answers, notes, uploads and sources. Orders are kept for accounting.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={async () => { await api(`/api/v1/platform/admin/users/${uid}`, { method: "DELETE" }); onClose(); }}>Delete</Button>
          </div>
        </Modal>
      </aside>
    </div>
  );
}
