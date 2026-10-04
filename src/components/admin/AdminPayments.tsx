"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { fmtDate } from "@/lib/labels";
import { Button, Card, Chip, ErrorBox, Loading, Modal, Segmented } from "../ui";

type Order = { order_id: string; uid: string; plan: string; amount: number; status: string; created_at: string;
  payment_id?: string; refund_reason?: string; used?: number };
type Summary = { days: number; orders: number; paid: number; refunded: number; revenue_paise: number; active_subscribers: number;
  by_plan: Record<string, { orders: number; revenue_paise: number }> };

const inr = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

export default function AdminPayments() {
  const [status, setStatus] = useState("ALL");
  const summary = useAsync(() => api<Summary>("/api/v1/platform/admin/payments/summary?days=30"), []);
  const orders = useAsync(() => api<{ items: Order[] }>(`/api/v1/platform/admin/orders?limit=50${status !== "ALL" ? `&status=${status}` : ""}`), [status]);
  const [refund, setRefund] = useState<Order | null>(null);
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState(false);
  const [err, setErr] = useState<unknown>();

  return (
    <div className="space-y-4">
      {summary.data && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[["Revenue (30d)", inr(summary.data.revenue_paise)], ["Paid orders", summary.data.paid], ["Refunded", summary.data.refunded],
            ["All orders", summary.data.orders], ["Active subscribers", summary.data.active_subscribers]].map(([l, v]) => (
            <Card key={String(l)}><div className="font-mono text-2xl font-bold">{v}</div><div className="text-xs text-muted">{l}</div></Card>
          ))}
        </div>
      )}
      <Segmented value={status} onChange={setStatus} options={["ALL", "PAID", "CREATED", "REFUNDED"].map((s) => ({ value: s, label: s.toLowerCase() }))} />
      {err ? <ErrorBox error={err} /> : null}
      {orders.loading ? <Loading /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr><th className="p-3">Order</th><th className="p-3">User</th><th className="p-3">Plan</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3">Used</th><th className="p-3">Date</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.data?.items.map((o) => (
                <tr key={o.order_id}>
                  <td className="p-3 font-mono text-xs">{o.order_id}</td>
                  <td className="p-3 font-mono text-xs">{o.uid}</td>
                  <td className="p-3">{o.plan}</td>
                  <td className="p-3 text-right font-mono">{inr(o.amount)}</td>
                  <td className="p-3"><Chip tone={o.status === "PAID" ? "green" : o.status === "REFUNDED" ? "danger" : "neutral"}>{o.status}</Chip></td>
                  <td className="p-3">{o.status === "PAID" ? (o.used ? <Chip tone="saffron">{o.used}× — not refundable</Chip> : <Chip tone="green">unused</Chip>) : "—"}</td>
                  <td className="p-3 text-muted">{fmtDate(o.created_at)}</td>
                  <td className="p-3 text-right">{o.status === "PAID" && <Button variant="outline" className="!py-1" onClick={() => { setRefund(o); setReason(""); setOverride(false); }}>Refund</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.data?.items.length === 0 && <p className="p-6 text-center text-sm text-muted">No orders.</p>}
        </Card>
      )}
      <Modal open={!!refund} onClose={() => setRefund(null)} title="Refund this order?">
        {refund && (
          <div className="space-y-3 text-sm">
            <p>{refund.order_id} · {inr(refund.amount)} · {refund.plan}. The plan is revoked immediately; Razorpay refunds in 5–7 days.</p>
            {!!refund.used && (
              <label className="flex items-start gap-2 rounded-2xl bg-saffron-soft p-3 text-xs">
                <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="mt-0.5" />
                This pass was used {refund.used} time(s), so the refund policy says no refund. Tick only for an exception (e.g. our service failed) — it is logged.
              </label>
            )}
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" className="w-full rounded-2xl border-2 border-line bg-bg px-3 py-2" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRefund(null)}>Cancel</Button>
              <Button variant="danger" disabled={reason.trim().length < 3 || (!!refund.used && !override)} onClick={async () => {
                try { await api(`/api/v1/platform/admin/orders/${refund.order_id}/refund`, { method: "POST", json: { reason, override } }); setRefund(null); orders.reload(); summary.reload(); }
                catch (e) { setErr(e); setRefund(null); }
              }}>Refund</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
