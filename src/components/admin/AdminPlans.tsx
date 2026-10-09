"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { fmtDate } from "@/lib/labels";
import { Button, Card, Chip, ErrorBox, Loading } from "../ui";

type Plan = { name: string; tagline?: string; price_paise: number; days: number; services: Record<string, number>;
  caps?: { sectional_max_questions?: number; full_length_max_questions?: number } };
type Resp = { plans: Record<string, Plan>; services: Record<string, string>; version: number; updated_by?: string;
  updated_at?: string; history: { version: number; at: string; by: string; prices: Record<string, number> }[] };

const ORDER = ["FREE", "DAILY_PASS", "MONTHLY_PASS"];

export default function AdminPlans() {
  const data = useAsync(() => api<Resp>("/api/v1/platform/admin/plans"), []);
  if (data.loading) return <Loading />;
  if (data.error || !data.data) return <ErrorBox error={data.error} />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-2">
        Changes apply to new purchases immediately (existing orders keep the price they were created with). Every change is
        versioned — current version <b>v{data.data.version}</b>{data.data.updated_at ? `, updated ${fmtDate(data.data.updated_at)}` : ""}.
      </p>
      <div className="grid gap-4 xl:grid-cols-3">
        {ORDER.filter((id) => data.data!.plans[id]).map((id) => (
          <PlanEditor key={id} id={id} plan={data.data!.plans[id]} services={data.data!.services} onSaved={data.reload} />
        ))}
      </div>
      {!!data.data.history.length && (
        <Card>
          <div className="mb-2 font-display font-bold">Price history</div>
          <ul className="space-y-1 text-sm">
            {data.data.history.map((h) => (
              <li key={h.version} className="flex flex-wrap justify-between gap-2">
                <span>v{h.version} · {fmtDate(h.at)}</span>
                <span className="font-mono text-xs text-ink-2">{Object.entries(h.prices).map(([k, v]) => `${k} ₹${(v ?? 0) / 100}`).join(" · ")}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function PlanEditor({ id, plan, services, onSaved }: { id: string; plan: Plan; services: Record<string, string>; onSaved: () => void }) {
  const [price, setPrice] = useState(String(plan.price_paise / 100));
  const [days, setDays] = useState(String(plan.days || ""));
  const [tagline, setTagline] = useState(plan.tagline ?? "");
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [caps, setCaps] = useState({ s: String(plan.caps?.sectional_max_questions ?? "") });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();
  const [err, setErr] = useState<unknown>();

  useEffect(() => {
    setLimits(Object.fromEntries(Object.keys(services).map((s) => {
      const v = plan.services[s];
      return [s, v === undefined ? "off" : v === -1 ? "unlimited" : String(v)];
    })));
  }, [plan, services]);

  async function save() {
    setBusy(true); setErr(undefined); setMsg(undefined);
    try {
      const svc: Record<string, number | null> = {};
      for (const [k, v] of Object.entries(limits)) svc[k] = v === "off" ? null : v === "unlimited" ? -1 : Math.max(1, parseInt(v || "0", 10) || 1);
      await api(`/api/v1/platform/admin/plans/${id}`, { method: "PUT", json: {
        price_paise: Math.round(parseFloat(price || "0") * 100), tagline, services: svc,
        ...(id !== "FREE" && days ? { days: parseInt(days, 10) } : {}),
        ...(id === "FREE" ? { caps: { sectional_max_questions: parseInt(caps.s, 10) || 5 } } : {}),
      } });
      setMsg("Saved ✓");
      onSaved();
    } catch (e) { setErr(e); } finally { setBusy(false); }
  }

  const field = "w-full rounded-xl border-2 border-line bg-bg px-2.5 py-1.5 text-sm outline-none focus:border-primary";
  return (
    <Card sticker={id === "MONTHLY_PASS"} className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-display text-xl font-extrabold">{plan.name}</div>
        <Chip tone={id === "FREE" ? "neutral" : "primary"}>{id}</Chip>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold">Price (₹)
          <input className={field} type="number" min={id === "FREE" ? 0 : 1} step="1" disabled={id === "FREE"} value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        <label className="text-xs font-semibold">Validity (days)
          <input className={field} type="number" min={1} max={366} disabled={id === "FREE"} value={id === "FREE" ? "" : days} placeholder={id === "FREE" ? "—" : ""} onChange={(e) => setDays(e.target.value)} /></label>
      </div>
      <label className="block text-xs font-semibold">Tagline
        <input className={field} value={tagline} maxLength={120} onChange={(e) => setTagline(e.target.value)} /></label>
      {id === "FREE" && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold">Max Qs / sectional test<input className={field} type="number" min={1} max={50} value={caps.s} onChange={(e) => setCaps({ ...caps, s: e.target.value })} /></label>
          <p className="self-end text-xs text-muted">Full mocks are always the 100-question paper — on Free, a mix of PYQs and the question bank, never new AI questions.</p>
        </div>
      )}
      <div>
        <div className="mb-1 text-xs font-bold uppercase text-muted">Services (uses per {id === "FREE" ? "—" : `${days || plan.days}-day pass`})</div>
        <div className="space-y-1.5">
          {Object.entries(services).map(([svc, label]) => {
            const v = limits[svc] ?? "off";
            const mode = v === "off" || v === "unlimited" ? v : "count";
            return (
              <div key={svc} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{label}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <select className="rounded-lg border border-line bg-bg px-1.5 py-1 text-xs" value={mode}
                    onChange={(e) => setLimits({ ...limits, [svc]: e.target.value === "count" ? "1" : e.target.value })}>
                    <option value="off">not included</option><option value="unlimited">unlimited</option><option value="count">limited</option>
                  </select>
                  {mode === "count" && <input type="number" min={1} max={10000} className="w-16 rounded-lg border border-line bg-bg px-1.5 py-1 text-xs"
                    value={v} onChange={(e) => setLimits({ ...limits, [svc]: e.target.value })} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {err ? <ErrorBox error={err} /> : null}
      <div className="flex items-center gap-3">
        <Button onClick={save} loading={busy}><Save size={14} /> Save {plan.name}</Button>
        {msg && <span className="text-sm font-semibold text-green">{msg}</span>}
      </div>
    </Card>
  );
}
