"use client";

import { useEffect, useState } from "react";
import { Download, ShieldCheck, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { EmailSignInForm } from "@/components/Gates";
import { Button, Card, ErrorBox, Loading, Modal, PageHeader } from "@/components/ui";
import { api, downloadFile, openSignIn, signOut } from "@/lib/api";
import { useAsync, useEntitlements, useSession } from "@/lib/hooks";

type Me = { name: string; target_year: number; category: string; attempt_no: number; daily_goal: number; avatar?: string;
  optional?: string; email?: string; phone?: string | null; marketing_consent?: boolean };

export default function Profile() {
  const session = useSession();
  const me = useAsync(() => api<Me>("/api/v1/platform/me"), []);
  const { ent } = useEntitlements(session);
  const [form, setForm] = useState<Me>();
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<unknown>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (me.data) setForm(me.data); }, [me.data]);
  if (!session) return null;
  if (session.kind === "guest") return (
    <AppShell>
      <PageHeader kicker="Profile" title="Make it yours" />
      <Card sticker className="max-w-md"><EmailSignInForm onDone={() => window.location.reload()}
        reason="Sign in with your email. If you've used TamGam before, your history comes right back." /></Card>
    </AppShell>
  );

  const field = "mt-1 w-full rounded-2xl border-2 border-line bg-bg px-3 py-2.5 font-semibold outline-none focus:border-primary";

  return (
    <AppShell>
      <PageHeader kicker="Profile" title="You, the aspirant" />
      {me.loading || !form ? <Loading /> : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={async (e) => {
              e.preventDefault(); setErr(undefined); setSaved(false);
              try { await api("/api/v1/platform/me", { method: "PUT", json: form }); setSaved(true); } catch (e2) { setErr(e2); }
            }}>
              <label className="sm:col-span-2"><span className="text-sm font-semibold">Name</span>
                <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60} /></label>
              <label><span className="text-sm font-semibold">Target year</span>
                <input type="number" className={field} min={2025} max={2035} value={form.target_year} onChange={(e) => setForm({ ...form, target_year: Number(e.target.value) })} /></label>
              <label><span className="text-sm font-semibold">Attempt number</span>
                <input type="number" className={field} min={1} max={9} value={form.attempt_no} onChange={(e) => setForm({ ...form, attempt_no: Number(e.target.value) })} /></label>
              <label><span className="text-sm font-semibold">Category (for the cutoff model)</span>
                <select className={field} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {["GEN", "EWS", "OBC", "SC", "ST", "PwBD"].map((c) => <option key={c}>{c}</option>)}
                </select></label>
              <label><span className="text-sm font-semibold">Daily question goal</span>
                <input type="number" className={field} min={5} max={300} value={form.daily_goal} onChange={(e) => setForm({ ...form, daily_goal: Number(e.target.value) })} /></label>
              {err ? <div className="sm:col-span-2"><ErrorBox error={err} /></div> : null}
              <div className="flex items-center gap-3 sm:col-span-2">
                <Button type="submit">Save</Button>
                {saved && <span className="text-sm font-semibold text-green">Saved ✓</span>}
              </div>
            </form>
          </Card>
          <div className="space-y-4">
          <Card sticker>
            <div className="flex items-center gap-2 font-display text-lg font-bold"><ShieldCheck size={18} className="text-green" /> Your account</div>
            <p className="mt-1 text-sm text-ink-2">
              {session.kind === "admin" ? <>Admin · <b>{session.email}</b></> : <>Signed in with <b className="font-mono">{me.data?.email ?? session.email}</b> — use this email on any device to get your history.</>}
            </p>
            {session.kind === "member" && <MarketingPhone current={me.data?.phone ?? null} consent={!!me.data?.marketing_consent} onSaved={me.reload} />}
            {ent && (
              <div className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm">
                <div className="font-semibold">{ent.plan_name}{ent.valid_till ? ` · till ${new Date(ent.valid_till).toLocaleString("en-IN")}` : ""}</div>
                <ul className="mt-1 space-y-0.5 text-xs text-ink-2">
                  {Object.entries(ent.services).filter(([, v]) => v.allowed).map(([k, v]) => (
                    <li key={k} className="flex justify-between"><span>{v.label}</span>
                      <span className="font-mono">{v.limit === -1 ? "unlimited" : `${v.remaining} of ${v.limit} left`}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          <Card>
            <div className="font-display text-lg font-bold">Your data, your call</div>
            <p className="mt-1 text-sm text-ink-2">Under India&apos;s DPDP Act you can export or delete everything we hold about you.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="outline" onClick={async () => {
                const data = await api("/api/v1/platform/me/export");
                await downloadFile(URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })), "tamgam-export.json");
              }}><Download size={16} /> Export my data</Button>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Delete my account</Button>
            </div>
          </Card>
          </div>
        </div>
      )}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete everything?">
        <p className="text-sm text-ink-2">This removes your profile, attempts, answers, notes and uploads. Anonymised analytics rows remain. This can&apos;t be undone.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={async () => {
            setBusy(true);
            await api("/api/v1/platform/me", { method: "DELETE" });
            signOut(); window.location.href = "/";
          }}>Delete permanently</Button>
        </div>
      </Modal>
    </AppShell>
  );
}


/** Optional mobile number for updates and offers — saved only with consent; removing it withdraws consent. */
function MarketingPhone({ current, consent, onSaved }: { current: string | null; consent: boolean; onSaved: () => void }) {
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>();
  async function save(body: Record<string, unknown>) {
    setBusy(true); setErr(undefined);
    try { await api("/api/v1/platform/me", { method: "PUT", json: body }); setPhone(""); setAgree(false); onSaved(); }
    catch (e) { setErr(e); } finally { setBusy(false); }
  }
  return (
    <div className="mt-3 rounded-2xl border-2 border-line p-3 text-sm">
      <div className="font-semibold">Mobile number <span className="font-normal text-muted">(optional)</span></div>
      {current && consent ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono">{current}</span>
          <button className="text-xs font-semibold text-danger" disabled={busy} onClick={() => save({ phone: "", marketing_consent: false })}>
            Remove &amp; stop updates</button>
        </div>
      ) : (
        <form className="mt-2 space-y-2" onSubmit={(e) => { e.preventDefault(); save({ phone, marketing_consent: agree }); }}>
          <input className="w-full rounded-xl border-2 border-line bg-bg px-3 py-2 font-semibold" inputMode="tel" placeholder="98765 43210"
            value={phone} maxLength={14} onChange={(e) => setPhone(e.target.value)} required />
          <label className="flex items-start gap-2 text-xs text-ink-2">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" required />
            TamGam may contact me on this number with study updates and offers.
          </label>
          {err ? <ErrorBox error={err} /> : null}
          <Button type="submit" variant="outline" loading={busy} className="!py-1.5">Save number</Button>
        </form>
      )}
    </div>
  );
}
