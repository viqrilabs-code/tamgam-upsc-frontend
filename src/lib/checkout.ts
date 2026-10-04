"use client";

/** Razorpay Checkout for member plans. */
export type Order = { order_id: string; amount: number; plan: string; test_mode: boolean; key_id?: string; razorpay_order_id?: string;
  checkout: { name: string; description: string; prefill: Record<string, string | undefined>; theme: { color: string }; notes: Record<string, string> } };
export type CheckoutResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: { error: { description: string } }) => void) => void };
declare global { interface Window { Razorpay?: RazorpayCtor } }

export const inr = (p: number) => `₹${(p / 100).toLocaleString("en-IN")}`;

export function loadCheckout(): Promise<RazorpayCtor> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay failed to load")));
    s.onerror = () => reject(new Error("Couldn't load Razorpay Checkout — check your connection"));
    document.body.appendChild(s);
  });
}

/** Opens Checkout for a server-created order; resolves with the signed result, rejects on failure, null if closed. */
export async function payOrder(order: Order): Promise<CheckoutResult | null> {
  const Razorpay = await loadCheckout();
  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: order.key_id, amount: order.amount, currency: "INR", order_id: order.razorpay_order_id,
      name: order.checkout.name, description: order.checkout.description, prefill: order.checkout.prefill,
      notes: order.checkout.notes, theme: order.checkout.theme,
      handler: (resp: CheckoutResult) => resolve(resp),
      modal: { ondismiss: () => resolve(null) },
    });
    rzp.on("payment.failed", (r) => reject(Object.assign(new Error(r.error.description), { problem: { title: "Payment failed", detail: r.error.description } })));
    rzp.open();
  });
}
