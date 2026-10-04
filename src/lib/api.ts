"use client";

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000").replace(/\/$/, "");
export const CONTENT_BASE = (process.env.NEXT_PUBLIC_CONTENT_BASE ?? API_BASE).replace(/\/$/, "");

const TOKEN_KEY = "tamgam.token";
const USER_KEY = "tamgam.user";

export type SessionKind = "guest" | "member" | "admin";
export type Session = { uid: string; name: string; avatar?: string; kind: SessionKind; admin: boolean;
  phone?: string | null; email?: string | null; expires_at?: number };
export type AuthResponse = { token: string; uid: string; kind: SessionKind; name?: string; roles: string[]; email?: string;
  expires_at: number; profile: { name?: string; avatar?: string; email?: string | null; phone?: string | null }; returning?: boolean };

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    const s = raw ? (JSON.parse(raw) as Session) : null;
    if (s?.expires_at && s.expires_at * 1000 < Date.now()) { signOut(); return null; }
    return s;
  } catch {
    return null;
  }
}

export function store(r: AuthResponse, avatar?: string): Session {
  const s: Session = { uid: r.uid, name: r.profile?.name ?? r.name ?? "Aspirant", avatar: r.profile?.avatar ?? avatar,
    kind: r.kind, admin: r.roles?.includes("admin") ?? false, phone: r.profile?.phone, email: r.email, expires_at: r.expires_at };
  localStorage.setItem(TOKEN_KEY, r.token);
  localStorage.setItem(USER_KEY, JSON.stringify(s));
  return s;
}

/** Name + avatar → browse-only guest session. */
export async function guestSignIn(name: string, avatar: string) {
  return store(await api<AuthResponse>("/api/v1/auth/guest", { method: "POST", json: { name, avatar } }), avatar);
}

/** Step 1: email a 6-digit sign-in code (dev without Brevo returns dev_code). */
export async function sendEmailCode(email: string) {
  return api<{ to: string; expires_in: number; dev_code?: string }>("/api/v1/auth/email/start", { method: "POST", json: { email } });
}

/** Step 2: code → member session for the account that owns this email (replaces any guest session). */
export async function emailSignIn(email: string, code: string, opts: { name?: string; avatar?: string; phone?: string; marketing_consent?: boolean } = {}) {
  const r = await api<AuthResponse>("/api/v1/auth/email/verify", { method: "POST", json: { email, code, ...opts } });
  return { session: store(r, opts.avatar), returning: !!r.returning };
}

export async function adminSignIn(email: string, password: string, name: string, avatar: string) {
  return store(await api<AuthResponse>("/api/v1/auth/admin/login", { method: "POST", json: { email, password, name, avatar } }), avatar);
}

export function signOut() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function openSignIn(reason?: string) {
  window.dispatchEvent(new CustomEvent("tamgam:sign-in", { detail: { detail: reason } }));
}

export class ApiError extends Error {
  status: number;
  problem: { title?: string; detail?: string; type?: string; [k: string]: unknown };
  constructor(status: number, problem: ApiError["problem"]) {
    super(problem.detail || problem.title || `HTTP ${status}`);
    this.status = status;
    this.problem = problem;
  }
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  return request<T>(path, init);
}

async function request<T>(path: string, init: RequestInit & { json?: unknown }): Promise<T> {
  const headers = new Headers(init.headers);
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, body });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/v1/auth/")) {   // expired session
      signOut();
      window.location.href = "/login/";
    }
    const err = new ApiError(res.status, data ?? { title: res.statusText });
    announce(err);
    throw err;
  }
  return data as T;
}

export const SIGN_IN_REQUIRED = "/problems/sign-in-required";
export const PLAN_REQUIRED = "/problems/plan-required";
export const QUOTA = "/problems/quota";
export const BANK_EXHAUSTED = "/problems/bank-exhausted";

/** Guests get 403 sign-in-required (→ email sign-in modal); plan limits get 402 (→ upgrade modal). */
function announce(err: ApiError) {
  if (typeof window === "undefined") return;
  if (err.problem?.type === SIGN_IN_REQUIRED) {
    window.dispatchEvent(new CustomEvent("tamgam:sign-in", { detail: err.problem }));
  } else if (err.problem?.type === PLAN_REQUIRED || err.problem?.type === QUOTA) {
    window.dispatchEvent(new CustomEvent("tamgam:upgrade", { detail: err.problem }));
  }
}

/** Same as api() but also returns the HTTP status (for 200 vs 202 flows). */
export async function apiWithStatus<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}) {
  const headers = new Headers(init.headers);
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.json !== undefined) headers.set("Content-Type", "application/json");
  const res = await fetch(`${API_BASE}${path}`, {
    ...init, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new ApiError(res.status, data);
    announce(err);
    throw err;
  }
  return { status: res.status, data: data as T };
}

export async function content<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${CONTENT_BASE}/content/${path.replace(/^\//, "")}`);
  if (!res.ok) throw new ApiError(res.status, { title: "Content not published yet" });
  return res.json() as Promise<T>;
}

/** Upload straight to the signed URL (GCS in prod, /dev-storage locally). */
export async function putSigned(url: string, file: Blob, contentType: string) {
  const res = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": contentType } });
  if (!res.ok) throw new ApiError(res.status, { title: "Upload failed" });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch a signed URL and save it with a filename (works across origins, unlike <a download>). */
export async function downloadFile(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new ApiError(res.status, { title: "Download failed" });
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}
