"use client";

import { useEffect, useRef, useState } from "react";
import { api, getSession, store, type AuthResponse } from "@/lib/api";
import { ErrorBox } from "./ui";

/**
 * "Continue with Google" (Google Identity Services). Google returns a signed ID token in the browser; our
 * backend verifies it and signs in the member who owns that email — the same account as email-code sign-in.
 * Renders nothing when the server has no Google client id configured.
 */
type Gis = { accounts: { id: {
  initialize: (o: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
} } };
declare global { interface Window { google?: Gis } }

let clientIdPromise: Promise<string | null> | null = null;
function clientId(): Promise<string | null> {
  clientIdPromise ??= api<{ google_client_id: string | null }>("/api/v1/auth/config")
    .then((c) => c.google_client_id).catch(() => null);
  return clientIdPromise;
}

function loadGis(): Promise<Gis> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => (window.google ? resolve(window.google) : reject(new Error("Google sign-in failed to load")));
    s.onerror = () => reject(new Error("Couldn't reach Google — check your connection"));
    document.head.appendChild(s);
  });
}

export default function GoogleSignIn({ onDone, name, avatar }:
  { onDone: (returning: boolean) => void; name?: string; avatar?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [err, setErr] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const cb = useRef<(c: string) => void>(() => {});
  cb.current = async (credential: string) => {
    setBusy(true); setErr(undefined);
    try {
      const guest = getSession();
      const r = await api<AuthResponse>("/api/v1/auth/google", { method: "POST",
        json: { credential, name: name || guest?.name, avatar: avatar || guest?.avatar } });
      store(r, avatar || guest?.avatar);
      onDone(!!r.returning);
    } catch (e) { setErr(e); setBusy(false); }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const id = await clientId();
      if (!alive) return;
      setEnabled(!!id);
      if (!id || !box.current) return;
      try {
        const g = await loadGis();
        if (!alive || !box.current) return;
        g.accounts.id.initialize({ client_id: id, callback: (r: { credential: string }) => cb.current(r.credential),
          ux_mode: "popup", auto_select: false, cancel_on_tap_outside: true, context: "signin", itp_support: true });
        const dark = document.documentElement.classList.contains("dark");
        g.accounts.id.renderButton(box.current, { type: "standard", theme: dark ? "filled_black" : "outline", size: "large",
          text: "continue_with", shape: "pill", logo_alignment: "left", width: Math.min(box.current.offsetWidth || 320, 400) });
      } catch (e) { if (alive) setErr(e); }
    })();
    return () => { alive = false; };
  }, []);

  if (enabled === false) return null;
  return (
    <div className="space-y-2">
      <div ref={box} className={busy ? "pointer-events-none opacity-60" : ""} style={{ minHeight: 44 }} />
      {err ? <ErrorBox error={err} /> : null}
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted">
        <span className="h-px flex-1 bg-line" /> or get a code by email <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
