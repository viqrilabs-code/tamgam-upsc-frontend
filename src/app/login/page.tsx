"use client";

import { useEffect, useState } from "react";
import { Eye, Lock, Mail, Shield } from "lucide-react";
import { EmailSignInForm } from "@/components/Gates";
import { Button, Card, ErrorBox, Logo, Segmented } from "@/components/ui";
import { adminSignIn, getSession, guestSignIn } from "@/lib/api";

const AVATARS = ["🦁", "🐯", "🦚", "🐘", "🦅", "🪷"];
type Mode = "explore" | "email" | "admin";

export default function Login() {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [mode, setMode] = useState<Mode>("email");      // sign-up first; "explore" (guest) is a choice, not the default
  const [consent, setConsent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "explore") setMode("explore");
    const s = getSession();
    if (s && s.kind !== "guest") window.location.href = s.admin ? "/admin/" : "/dashboard/";
  }, []);

  async function explore(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(undefined);
    try { await guestSignIn(name, avatar); window.location.href = "/dashboard/"; }
    catch (e2) { setErr(e2); setBusy(false); }
  }

  async function admin(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(undefined);
    try { await adminSignIn(email, password, name, avatar); window.location.href = "/admin/"; }
    catch (e2) { setErr(e2); setBusy(false); }
  }

  const field = "mt-1 w-full rounded-2xl border-2 border-line bg-bg px-4 py-3 font-semibold outline-none focus:border-primary";
  const identity = (
    <>
      <label className="block">
        <span className="text-sm font-semibold">Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={40}
          placeholder="e.g. Ananya" className={field} />
      </label>
      <div>
        <span className="text-sm font-semibold">Avatar</span>
        <div className="mt-1 flex gap-2">
          {AVATARS.map((a) => (
            <button type="button" key={a} onClick={() => setAvatar(a)} aria-label={`Avatar ${a}`}
              className={`grid h-11 w-11 place-items-center rounded-2xl border-2 text-xl ${avatar === a ? "border-primary bg-primary-soft" : "border-line"}`}>{a}</button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="grain grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo className="text-2xl" /></div>
        <Card sticker className="p-7">
          <h1 className="font-display text-3xl font-extrabold">{mode === "admin" ? "Admin sign-in 🛡️" : mode === "email" ? "Start free in 30 seconds" : "Let's lock in 🔒"}</h1>
          <p className="mt-1 text-sm text-ink-2">
            {mode === "explore" && "Pick a name and an avatar to look around. Sign in with Google or your email when you're ready to start."}
            {mode === "email" && "Continue with Google or get a code by email. New or returning — the same email is the same account on any device."}
            {mode === "admin" && "Only the registered admin email can sign in here."}
          </p>
          {mode !== "admin" && (
            <div className="mt-5">
              <Segmented value={mode} onChange={(m) => { setMode(m); setErr(undefined); }} options={[
                { value: "email", label: <span className="inline-flex items-center gap-1"><Mail size={14} /> Sign up / sign in</span> },
                { value: "explore", label: <span className="inline-flex items-center gap-1"><Eye size={14} /> Just look around</span> }]} />
            </div>
          )}

          {mode === "explore" && (
            <form onSubmit={explore} className="mt-5 space-y-4">
              {identity}
              <label className="flex items-start gap-2 text-xs text-ink-2">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" required />
                I agree to TamGam processing my data to personalise practice (DPDP Act, 2023). I can export or delete it any time.
              </label>
              {err ? <ErrorBox error={err} /> : null}
              <Button type="submit" loading={busy} className="w-full py-3 text-base">Explore TamGam</Button>
              <p className="text-center text-xs text-muted">Guests can see everything TamGam offers. Using any service needs sign-in with Google or your email.</p>
            </form>
          )}

          {mode === "email" && (
            <div className="mt-5 space-y-4">
              <ul className="space-y-1 rounded-2xl bg-green-soft p-3 text-sm text-ink-2">
                {["Full 100-question Prelims mocks", "13+ years of real UPSC papers in PYQ Lab", "Revision cards and progress tracking"].map((t) => (
                  <li key={t} className="flex gap-2"><span className="font-bold text-green">✓</span>{t}</li>))}
                <li className="pt-1 text-xs text-muted">Free with sign-up — no card, no trial timer.</li>
              </ul>
              <details className="rounded-2xl border-2 border-line px-3 py-2">
                <summary className="cursor-pointer text-sm font-semibold text-ink-2">Pick a display name &amp; avatar (optional)</summary>
                <div className="mt-3 space-y-4">{identity}</div>
              </details>
              <EmailSignInForm name={name} avatar={avatar} onDone={() => { window.location.href = "/dashboard/"; }} />
            </div>
          )}

          {mode === "admin" && (
            <form onSubmit={admin} className="mt-5 space-y-4">
              {identity}
              <label className="block"><span className="text-sm font-semibold">Admin email</span>
                <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@…" className={field} /></label>
              <label className="block"><span className="text-sm font-semibold">Password</span>
                <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={field} /></label>
              {err ? <ErrorBox error={err} /> : null}
              <Button type="submit" loading={busy} className="w-full py-3 text-base"><Lock size={16} /> Sign in as admin</Button>
            </form>
          )}

          <button onClick={() => { setMode(mode === "admin" ? "explore" : "admin"); setErr(undefined); }}
            className="mt-5 flex w-full items-center justify-center gap-2 text-xs font-semibold text-muted hover:text-ink">
            <Shield size={14} /> {mode === "admin" ? "Back to student sign-in" : "Login as Admin"}
          </button>
        </Card>
      </div>
    </div>
  );
}
