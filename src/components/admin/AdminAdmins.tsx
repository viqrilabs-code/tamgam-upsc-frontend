"use client";

import { useState } from "react";
import { Copy, Crown, KeyRound, Mail, ShieldPlus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { fmtDate } from "@/lib/labels";
import { Button, Card, Chip, ErrorBox, Loading } from "../ui";

export type AdminRow = { email: string; owner: boolean; added_by?: string | null; created_at?: string | null;
  last_login_at?: string | null; must_change_password: boolean; you: boolean };
type Added = { email: string; temp_password: string; emailed: boolean };

/** Who can sign in as admin. Owners come from the deployment config and can't be removed here. */
export default function AdminAdmins() {
  const admins = useAsync(() => api<{ items: AdminRow[] }>("/api/v1/platform/admin/admins"), []);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<Added>();
  const [confirm, setConfirm] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<unknown>();

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(undefined); setAdded(undefined); setCopied(false);
    try {
      setAdded(await api<Added>("/api/v1/platform/admin/admins", { method: "POST", json: { email } }));
      setEmail(""); admins.reload();
    } catch (e2) { setErr(e2); } finally { setBusy(false); }
  }

  async function remove(target: string) {
    setErr(undefined);
    try {
      await api(`/api/v1/platform/admin/admins/${encodeURIComponent(target)}`, { method: "DELETE" });
      setConfirm(undefined); admins.reload();
    } catch (e2) { setErr(e2); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-1 flex items-center gap-2 font-display text-lg font-bold"><ShieldPlus size={18} /> Add an admin</div>
        <p className="mb-3 text-sm text-ink-2">Admins can use every service free and manage users, payments, sources and other admins.
          They get a temporary password by email and set their own after signing in.</p>
        <form onSubmit={add} className="flex flex-wrap gap-2">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com"
            className="min-w-0 flex-1 rounded-2xl border-2 border-line bg-bg px-3 py-2 text-sm outline-none focus:border-primary" />
          <Button type="submit" loading={busy}>Add admin</Button>
        </form>
        {added && (
          <div className="mt-3 rounded-2xl bg-green-soft p-3 text-sm">
            <div className="font-semibold">{added.email} can now sign in as admin.</div>
            <div className="mt-1 flex items-center gap-1.5 text-ink-2"><Mail size={14} />
              {added.emailed ? "The temporary password was emailed to them." : "The email couldn't be sent — share the temporary password with them yourself."}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <KeyRound size={14} /> Temporary password:
              <code className="rounded-lg bg-surface px-2 py-0.5 font-mono font-bold">{added.temp_password}</code>
              <button type="button" onClick={() => { navigator.clipboard?.writeText(added.temp_password).then(() => setCopied(true)).catch(() => {}); }}
                className="inline-flex items-center gap-1 rounded-lg border-2 border-line px-2 py-0.5 text-xs font-semibold hover:border-ink">
                <Copy size={12} /> {copied ? "Copied" : "Copy"}</button>
            </div>
            <p className="mt-1 text-xs text-muted">Shown only once. They'll be asked to change it after their first sign-in.</p>
          </div>
        )}
      </Card>

      {err ? <ErrorBox error={err} /> : null}

      {admins.loading ? <Loading /> : admins.error ? <ErrorBox error={admins.error} onRetry={admins.reload} /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr><th className="p-3">Admin</th><th className="p-3">Added</th><th className="p-3">Last sign-in</th><th className="p-3">Status</th><th className="p-3" /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {admins.data?.items.map((a) => (
                <tr key={a.email}>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-1.5 font-semibold">{a.email}
                      {a.owner && <Chip tone="saffron"><Crown size={11} className="mr-1 inline" />owner</Chip>}
                      {a.you && <Chip tone="primary">you</Chip>}</div>
                  </td>
                  <td className="p-3 text-ink-2">{a.created_at ? fmtDate(a.created_at) : "—"}{a.added_by ? <div className="text-xs text-muted">by {a.added_by}</div> : null}</td>
                  <td className="p-3 text-ink-2">{a.last_login_at ? fmtDate(a.last_login_at) : "never"}</td>
                  <td className="p-3">{a.must_change_password ? <Chip tone="saffron">temporary password</Chip> : <Chip tone="green">active</Chip>}</td>
                  <td className="p-3 text-right">
                    {a.owner || a.you ? <span className="text-xs text-muted">{a.owner ? "set in deployment config" : ""}</span>
                      : confirm === a.email ? (
                        <span className="inline-flex gap-1.5">
                          <Button variant="outline" className="!px-2.5 !py-1 text-xs" onClick={() => setConfirm(undefined)}>Cancel</Button>
                          <Button className="!bg-danger !px-2.5 !py-1 text-xs" onClick={() => remove(a.email)}>Remove access</Button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirm(a.email)} aria-label={`Remove ${a.email}`}
                          className="inline-flex items-center gap-1 rounded-xl border-2 border-line px-2.5 py-1 text-xs font-semibold text-danger hover:border-danger">
                          <Trash2 size={13} /> Remove</button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="text-xs text-muted">Removing an admin signs them out within seconds. Owner admins are set in the deployment
        configuration (TAMGAM_ADMIN_EMAILS) and can only be changed there.</p>
    </div>
  );
}
