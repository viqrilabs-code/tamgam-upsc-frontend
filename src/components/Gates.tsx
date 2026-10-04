"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Crown, LogIn, Mail, ShieldCheck } from "lucide-react";
import { emailSignIn, getSession, sendEmailCode } from "@/lib/api";
import GoogleSignIn from "./GoogleSignIn";
import { Button, ErrorBox, Modal } from "./ui";

/** Email + 6-digit code → member session. The account (and its history) is the one tied to the email.
 *  A mobile number is optional and saved only with marketing consent. */
export function EmailSignInForm({ onDone, reason, name, avatar }:
  { onDone: (returning: boolean) => void; reason?: string; name?: string; avatar?: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<{ to: string; dev_code?: string } | null>(null);
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>();
  const field = "w-full rounded-2xl border-2 border-line bg-bg px-4 py-3 font-semibold outline-none focus:border-primary";
  const guest = getSession();

  async function send() {
    setBusy(true); setErr(undefined);
    try { setSent(await sendEmailCode(email)); setCode(""); } catch (e2) { setErr(e2); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      {reason && <p className="text-sm text-ink-2">{reason}</p>}
      {!sent && <GoogleSignIn onDone={onDone} name={name} avatar={avatar} />}
      {!sent ? (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <label className="block text-sm font-semibold">Email address
            <input className={`mt-1 ${field}`} type="email" inputMode="email" autoComplete="email" placeholder="you@gmail.com"
              value={email} maxLength={254} autoFocus onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {err ? <ErrorBox error={err} /> : null}
          <Button type="submit" loading={busy} className="w-full"><Mail size={16} /> Email me a code</Button>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault(); setBusy(true); setErr(undefined);
          try {
            const { returning } = await emailSignIn(email, code, { name: name || guest?.name, avatar: avatar || guest?.avatar,
              phone: phone.trim() || undefined, marketing_consent: consent });
            onDone(returning);
          } catch (e2) { setErr(e2); setBusy(false); }
        }}>
          <p className="text-sm text-ink-2">We sent a 6-digit code to <b>{sent.to}</b>. It expires in 10 minutes — check Spam or Promotions if you don&apos;t see it.</p>
          {sent.dev_code && <p className="rounded-xl bg-saffron-soft p-2 text-xs">Dev mode (Brevo not configured): use code <b className="font-mono">{sent.dev_code}</b></p>}
          <input className={`${field} text-center font-mono text-2xl tracking-[0.4em]`} inputMode="numeric" autoComplete="one-time-code"
            maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••" required />
          <details className="rounded-2xl border-2 border-line px-3 py-2 text-sm">
            <summary className="cursor-pointer font-semibold">Add your mobile number (optional)</summary>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded-2xl border-2 border-line bg-surface-2 px-3 py-2.5 font-mono font-semibold">+91</span>
                <input className={field} inputMode="tel" placeholder="98765 43210" value={phone} maxLength={14} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <label className="flex items-start gap-2 text-xs text-ink-2">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                TamGam may contact me on this number with study updates and offers. I can withdraw this any time in my profile.
              </label>
            </div>
          </details>
          {err ? <ErrorBox error={err} /> : null}
          <Button type="submit" loading={busy} className="w-full"><ShieldCheck size={16} /> Verify &amp; sign in</Button>
          <div className="flex justify-between text-xs font-semibold text-muted">
            <button type="button" onClick={() => { setSent(null); setCode(""); setErr(undefined); }}>Use a different email</button>
            <button type="button" onClick={send} disabled={busy}>Resend code</button>
          </div>
        </form>
      )}
      <p className="text-[11px] text-muted">Your email is your account: Google or email code, the same address opens the same account on any device.</p>
    </div>
  );
}

/** Opens on any 403 sign-in-required (guests) and on "Sign in" buttons. */
export function SignInGate() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<string>();
  useEffect(() => {
    const on = (e: Event) => { setDetail((e as CustomEvent).detail?.detail); setOpen(true); };
    window.addEventListener("tamgam:sign-in", on);
    return () => window.removeEventListener("tamgam:sign-in", on);
  }, []);
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Sign in to start prepping ✉️">
      <EmailSignInForm reason={detail ?? "Guests can look around. Sign in with your email to take tests, read notes and track progress."}
        onDone={() => window.location.reload()} />
    </Modal>
  );
}

/** Opens on 402 plan-required / quota. */
export function UpgradeGate() {
  const [problem, setProblem] = useState<{ title?: string; detail?: string; type?: string } | null>(null);
  useEffect(() => {
    const on = (e: Event) => setProblem((e as CustomEvent).detail);
    window.addEventListener("tamgam:upgrade", on);
    return () => window.removeEventListener("tamgam:upgrade", on);
  }, []);
  if (!problem) return null;
  return (
    <Modal open onClose={() => setProblem(null)} title={problem.type?.endsWith("quota") ? "You've used this up ⏳" : "Unlock with a pass 🔓"}>
      <p className="text-sm text-ink-2">{problem.detail}</p>
      <div className="mt-3 grid gap-2 text-sm">
        <div className="rounded-2xl bg-saffron-soft p-3"><b>Daily Pass</b> — every service once today, unlimited current affairs.</div>
        <div className="rounded-2xl bg-primary-soft p-3"><b>Monthly Pass</b> — 30 days of generous allowances for every service, unlimited current affairs, full analytics.</div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setProblem(null)}>Not now</Button>
        <Link href="/plans/" onClick={() => setProblem(null)} className="sticker sticker-hover inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-ink">
          <Crown size={16} /> See plans
        </Link>
      </div>
    </Modal>
  );
}

/** What a guest sees instead of a service page: what it offers + a sign-in button. */
export function GuestPreview({ emoji, title, points }: { emoji: string; title: string; points: string[] }) {
  return (
    <div className="grain rounded-3xl border-2 border-dashed border-line p-8">
      <div className="text-5xl">{emoji}</div>
      <h2 className="mt-3 font-display text-2xl font-extrabold">{title}</h2>
      <ul className="mt-3 space-y-1.5 text-ink-2">{points.map((p) => <li key={p} className="flex gap-2"><span className="text-saffron">✦</span>{p}</li>)}</ul>
      <Button className="mt-6 px-6 py-3 text-base" onClick={() => window.dispatchEvent(new CustomEvent("tamgam:sign-in", { detail: {} }))}>
        <LogIn size={18} /> Sign in with email to use this
      </Button>
      <p className="mt-2 text-xs text-muted">Free plan includes Prelims tests. <Link className="underline" href="/plans/">Compare plans</Link></p>
    </div>
  );
}
