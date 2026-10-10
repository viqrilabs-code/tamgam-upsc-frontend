"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquareHeart, X } from "lucide-react";
import { useFeedbackStatus, useSession } from "@/lib/hooks";

const KEY = "tamgam.feedback.dismissed";

/** A gentle, dismissible nudge for members who've used a feature but haven't reviewed yet. */
export default function FeedbackPrompt({ className = "" }: { className?: string }) {
  const session = useSession(false);
  const { status } = useFeedbackStatus(session);
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => { try { setDismissed(localStorage.getItem(KEY) === "1"); } catch { setDismissed(false); } }, []);
  if (!status?.eligible || status.reviewed || dismissed) return null;
  return (
    <div className={`flex items-center gap-3 rounded-2xl border-2 border-line bg-surface p-3 ${className}`}>
      <MessageSquareHeart size={22} className="shrink-0 text-primary" />
      <p className="flex-1 text-sm text-ink-2"><b className="text-ink">How&apos;s TamGam working for you?</b> A 30-second rating helps us improve.</p>
      <Link href="/feedback/" className="rounded-xl bg-primary px-3 py-1.5 text-sm font-bold text-primary-ink">Give feedback</Link>
      <button aria-label="Dismiss" onClick={() => { setDismissed(true); try { localStorage.setItem(KEY, "1"); } catch { /* blocked */ } }}
        className="text-muted hover:text-ink"><X size={16} /></button>
    </div>
  );
}

/** Always-there link (once unlocked) — e.g. on Profile, since phones have no sidebar. */
export function FeedbackLink() {
  const session = useSession(false);
  const { status } = useFeedbackStatus(session);
  if (!status?.eligible) return null;
  return (
    <Link href="/feedback/" className="mb-4 inline-flex items-center gap-2 rounded-2xl border-2 border-line px-3 py-2 text-sm font-semibold text-ink-2 hover:border-primary hover:text-primary">
      <MessageSquareHeart size={16} /> {status.reviewed ? "Edit your feedback & review" : "Give feedback & review"}
    </Link>
  );
}
