"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, getSession, type Session } from "./api";

/** Runs `fn` on mount/deps change. Skipped for guest sessions unless `guestOk` — guests only see previews. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = [], guestOk = false) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<ApiError | Error | undefined>();
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    if (!guestOk && getSession()?.kind === "guest") { setLoading(false); return; }
    setLoading(true);
    setError(undefined);
    try {
      setData(await fnRef.current());
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}

export function useSession(redirect = true): Session | null {
  const [s, setS] = useState<Session | null>(null);
  useEffect(() => {
    const cur = getSession();
    if (!cur && redirect) window.location.href = "/login/";
    setS(cur);
  }, [redirect]);
  return s;
}

export type Entitlements = {
  plan: "FREE" | "DAILY_PASS" | "MONTHLY_PASS" | "ADMIN"; plan_name: string; valid_till?: string | null;
  services: Record<string, { label: string; allowed: boolean; limit: number | null; used: number; remaining: number | null }>;
  caps: { sectional_max_questions?: number; full_length_max_questions?: number };
};

/** The member's plan (null for guests / while loading). */
export function useEntitlements(session: Session | null) {
  const [ent, setEnt] = useState<Entitlements | null>(null);
  const load = useCallback(async () => {
    if (!session || session.kind === "guest") { setEnt(null); return; }
    try {
      setEnt(await api<Entitlements>("/api/v1/platform/entitlements"));
    } catch { setEnt(null); }
  }, [session]);
  useEffect(() => { load(); }, [load]);
  return { ent, reload: load };
}

export function useSearch(): URLSearchParams {
  const [p, setP] = useState<URLSearchParams>(() => new URLSearchParams());
  useEffect(() => setP(new URLSearchParams(window.location.search)), []);
  return p;
}

export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("tamgam.theme", next ? "dark" : "light");
    } catch {}
  };
  return { dark, toggle };
}

/** True while the page is visible — background tabs shouldn't poll the server. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(typeof document === "undefined" || document.visibilityState !== "hidden");
  useEffect(() => {
    const on = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return visible;
}
