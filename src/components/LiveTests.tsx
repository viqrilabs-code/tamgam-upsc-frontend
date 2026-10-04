"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Hourglass, PauseCircle, Play, Radio, X } from "lucide-react";
import { api, getSession } from "@/lib/api";
import { SCOPE_LABEL, fmtDuration } from "@/lib/labels";
import { attemptUrl } from "@/lib/tests";
import { cx } from "./ui";

type LiveTest = { attempt_id: string; test_id: string; scope: string; stage: string; title?: string; n: number;
  answered: number; paused: boolean; seconds_left: number };
type LiveJob = { job_id: string; scope: string; kind: string; status: string; progress: number; message?: string };
type Active = { tests: LiveTest[]; jobs: LiveJob[] };

/** Floating "Live test" button: jump back into a test after Back, a logout or a pause; follow tests being built. */
export default function LiveTests() {
  const path = usePathname();
  const [active, setActive] = useState<Active>({ tests: [], jobs: [] });
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState<LiveTest | null>(null);
  const jobsSeen = useRef<number>(0);
  const fetchedAt = useRef<number>(Date.now());
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    const s = getSession();
    if (!s || s.kind === "guest") return;
    try {
      const a = await api<Active>("/api/v1/attempts/active");
      if (jobsSeen.current > a.jobs.length && a.tests.length) {
        setReady(a.tests[0]);                     // a test that was being prepared is now ready
      }
      jobsSeen.current = a.jobs.length;
      fetchedAt.current = Date.now();
      setActive(a);
    } catch { /* offline or signed out: keep the last state */ }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, active.jobs.length ? 5000 : 20000);
    const clock = setInterval(() => tick((x) => x + 1), 1000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [load, active.jobs.length, path]);

  if (path?.startsWith("/attempt")) return null;      // already inside a test
  const count = active.tests.length + active.jobs.length;
  if (!count && !ready) return null;
  const elapsed = Math.floor((Date.now() - fetchedAt.current) / 1000);
  const first = active.tests[0];

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2 lg:bottom-6 lg:right-6">
      {ready && (
        <div className="pop flex items-center gap-3 rounded-2xl bg-green-soft px-4 py-3 text-sm shadow-lg ring-2 ring-green">
          <span>✅ <b>{ready.title ?? "Your test"}</b> is ready.</span>
          <Link href={attemptUrl(ready.scope, ready.test_id)} className="rounded-xl bg-green px-3 py-1.5 font-bold text-white">Start</Link>
          <button aria-label="Dismiss" onClick={() => setReady(null)} className="text-muted"><X size={14} /></button>
        </div>
      )}
      {open && (
        <div className="pop w-80 rounded-3xl bg-surface p-3 sticker">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-display font-bold">Live</span>
            <button aria-label="Close" onClick={() => setOpen(false)} className="text-muted hover:text-ink"><X size={16} /></button>
          </div>
          <ul className="space-y-1.5">
            {active.tests.map((t) => (
              <li key={t.attempt_id}>
                <Link href={attemptUrl(t.scope, t.test_id)} className="flex items-center justify-between gap-2 rounded-2xl bg-surface-2 px-3 py-2 hover:ring-2 hover:ring-primary">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{t.title ?? SCOPE_LABEL[t.scope]}</div>
                    <div className="text-xs text-muted">{t.answered}/{t.n} answered · {t.paused ? "paused" : `${fmtDuration(Math.max(t.seconds_left - elapsed, 0))} left`}</div>
                  </div>
                  <span className="shrink-0 rounded-xl bg-primary px-2.5 py-1 text-xs font-bold text-primary-ink">{t.paused ? "Resume" : "Continue"}</span>
                </Link>
              </li>
            ))}
            {active.jobs.map((j) => (
              <li key={j.job_id} className="rounded-2xl bg-surface-2 px-3 py-2">
                <div className="flex items-center gap-2 text-sm font-semibold"><Hourglass size={14} className="text-saffron" /> Preparing {SCOPE_LABEL[j.scope] ?? "your"} test…</div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(5, j.progress)}%` }} /></div>
                {j.message && <div className="mt-1 truncate text-xs text-muted">{j.message}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {count > 0 && (
        <button onClick={() => setOpen(!open)}
          className={cx("sticker sticker-hover flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold",
            first?.paused ? "bg-saffron text-white" : "bg-danger text-white")}>
          {first ? (first.paused ? <PauseCircle size={16} /> : <Radio size={16} className="animate-pulse" />) : <Hourglass size={16} />}
          {first ? (first.paused ? "Paused test" : "Live test") : "Preparing test"}
          {first && !first.paused && <span className="font-mono">{fmtDuration(Math.max(first.seconds_left - elapsed, 0))}</span>}
          {count > 1 && <span className="rounded-full bg-white/25 px-1.5 text-xs">{count}</span>}
          {!open && first && <Play size={14} />}
        </button>
      )}
    </div>
  );
}
