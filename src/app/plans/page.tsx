"use client";

import { useState } from "react";
import { Check, Minus, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button, Card, Chip, ErrorBox, Loading, Modal, PageHeader, cx } from "@/components/ui";
import { api, openSignIn } from "@/lib/api";
import { inr, payOrder, type Order } from "@/lib/checkout";
import { useAsync, useEntitlements, useSession } from "@/lib/hooks";

type Plan = { name: string; price_paise: number; days: number; tagline?: string; services: Record<string, number>;
  caps?: { sectional_max_questions?: number; full_length_max_questions?: number } };
type PlansResp = { plans: Record<string, Plan>; services: Record<string, string>; razorpay: boolean };
const ORDER = ["FREE", "DAILY_PASS", "MONTHLY_PASS"];

export default function Plans() {
  const session = useSession();
  const plans = useAsync(() => api<PlansResp>("/api/v1/platform/plans"), [], true);
  const { ent, reload } = useEntitlements(session);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<unknown>();
  const [testOrder, setTestOrder] = useState<Order | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function buy(planId: string) {
    if (!session || session.kind === "guest") { openSignIn("Sign in with your email to buy a member pass — it's linked to your email and keeps your progress."); return; }
    setBusy(planId); setErr(undefined);
    try {
      const order = await api<Order>("/api/v1/platform/orders", { method: "POST", json: { plan: planId } });
      if (order.test_mode) { setTestOrder(order); setBusy(null); return; }
      const paid = await payOrder(order);
      if (paid) {
        await api("/api/v1/platform/payments/verify", { method: "POST", json: paid });
        setDone(plans.data?.plans[planId]?.name ?? planId);
        reload();
      }
    } catch (e) { setErr(e); } finally { setBusy(null); }
  }

  if (!session) return null;
  const data = plans.data;

  return (
    <AppShell>
      <PageHeader kicker="Plans" title="Pick your pass" sub="Sign in with Google or your email and pick a pass — your history and progress stay with your account. Paid securely via Razorpay; passes simply expire — no auto-renewal." />
      {err ? <div className="mb-4"><ErrorBox error={err} /></div> : null}
      {done && <div className="mb-4 rounded-2xl bg-green-soft p-4 font-semibold text-green">🎉 {done} is active. Go crush it.</div>}
      {ent && (
        <Card className="mb-6 flex flex-wrap items-center gap-3">
          <div><div className="text-xs text-muted">Current plan</div><div className="font-display text-xl font-bold">{ent.plan_name}</div></div>
          {ent.plan === "ADMIN" && <Chip tone="green">every service is free and unlimited for admins — no purchase needed</Chip>}
          {ent.valid_till && <Chip tone="green">active till {new Date(ent.valid_till).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</Chip>}
        </Card>
      )}
      {plans.loading || !data ? <Loading /> : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {ORDER.filter((id) => data.plans[id]).map((id) => {
              const p = data.plans[id];
              const current = ent?.plan === id;
              const hot = id === "MONTHLY_PASS";
              return (
                <Card key={id} sticker={hot} className={cx("flex flex-col", hot && "bg-primary-soft")}>
                  {hot && <Chip tone="lime" className="mb-2 self-start">best value</Chip>}
                  <div className="font-display text-2xl font-extrabold">{p.name}</div>
                  <div className="mt-2 font-mono text-4xl font-bold">{p.price_paise ? inr(p.price_paise) : "₹0"}
                    <span className="text-base text-muted">{p.days === 1 ? " / 24 hours" : p.days ? ` / ${p.days} days` : ""}</span></div>
                  <p className="mt-2 text-sm text-ink-2">{p.tagline}</p>
                  <div className="flex-1" />
                  {p.price_paise > 0 && ent?.plan !== "ADMIN" ? (
                    <Button className="mt-5" variant={hot ? "primary" : "outline"} loading={busy === id} onClick={() => buy(id)}>
                      {current ? "Buy again (fresh allowances)" : `Get ${p.name}`}</Button>
                  ) : <div className="mt-5 text-center text-sm font-semibold text-muted">{current ? "You're on this plan" : ent?.plan === "ADMIN" ? "Included for admins" : "Included with sign-in"}</div>}
                </Card>
              );
            })}
          </div>

          <Card className="mt-6 overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted">
                <tr><th className="p-3">What you can do</th>{ORDER.map((id) => <th key={id} className="p-3 text-center">{data.plans[id]?.name}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {Object.entries(data.services).map(([svc, label]) => (
                  <tr key={svc}>
                    <td className="p-3">{label}</td>
                    {ORDER.map((id) => {
                      const raw = data.plans[id]?.services ?? {};
                      // own Mains questions = the plan's Mains mock allowance × 20 answers (derived, not stored)
                      const v = svc === "custom_mains"
                        ? (raw.mains_mock === undefined ? undefined : raw.mains_mock === -1 ? -1 : raw.mains_mock * 20)
                        : raw[svc];
                      const cap = id === "FREE" && svc === "prelims_test" ? ` · ${data.plans[id].caps?.sectional_max_questions} Qs/test`
                        : id === "FREE" && svc === "prelims_mock" ? " · 100 Qs, PYQs + question bank" : "";
                      return (
                        <td key={id} className="p-3 text-center">
                          {v === undefined ? <Minus size={16} className="mx-auto text-muted" />
                            : v === -1 ? <span className="inline-flex items-center gap-1 font-semibold text-green"><Check size={16} />unlimited{cap}</span>
                            : <span className="font-mono font-semibold">{v}×{id === "DAILY_PASS" ? " today" : ""}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="mt-3 flex items-center gap-1 text-xs text-muted"><ShieldCheck size={14} /> Payments are verified on our server (signature + Razorpay status) before your pass activates. Refunds go back to the original payment method.</p>
        </>
      )}

      <Modal open={!!testOrder} onClose={() => setTestOrder(null)} title="Test checkout (development)">
        {testOrder && (
          <div className="space-y-3 text-sm">
            <p className="rounded-2xl bg-saffron-soft p-3">Razorpay keys aren&apos;t configured on this server, so a real checkout can&apos;t open. Set TAMGAM_RAZORPAY_KEY_ID / KEY_SECRET (test keys work) to use Razorpay Checkout.</p>
            <p>Order {testOrder.order_id} · {inr(testOrder.amount)}</p>
            <Button className="w-full" loading={busy === "test"} onClick={async () => {
              setBusy("test");
              try { await api(`/api/v1/platform/orders/${testOrder.order_id}/test-checkout`, { method: "POST" }); setDone(plans.data?.plans[testOrder.plan]?.name ?? testOrder.plan); setTestOrder(null); reload(); }
              catch (e) { setErr(e); } finally { setBusy(null); }
            }}>Simulate a successful payment</Button>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
