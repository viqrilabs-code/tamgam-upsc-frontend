"use client";

import { BookOpenCheck, CreditCard, LogIn, MessageSquareHeart, NotebookPen, PenLine, Send, Star, Target, UserPlus } from "lucide-react";

export type ActivityItem = { id: string; uid: string; action: string; label: string; at: string; detail: Record<string, string | number | boolean>;
  name?: string | null; email?: string | null };

const ICON: Record<string, typeof Target> = {
  signup: UserPlus, signin: LogIn, test_started: Target, test_submitted: Send, mains_submitted: PenLine, mains_evaluated: Star,
  note_opened: NotebookPen, note_uploaded: NotebookPen, revision_read: BookOpenCheck, purchase: CreditCard, feedback: MessageSquareHeart,
};

/** One line of detail per action, e.g. "GS II sectional · 32/50". */
export function describe(a: ActivityItem): string {
  const d = a.detail ?? {};
  switch (a.action) {
    case "test_started": return [d.title, d.questions ? `${d.questions} questions` : ""].filter(Boolean).join(" · ");
    case "test_submitted": return [d.title, d.max_score !== undefined ? `score ${d.score}/${d.max_score}` : "", d.attempted !== undefined ? `${d.correct}/${d.attempted} correct` : ""].filter(Boolean).join(" · ");
    case "mains_submitted": return [d.title, `${d.answers} answer${d.answers === 1 ? "" : "s"}`, d.handwritten ? `${d.handwritten} handwritten` : ""].filter(Boolean).join(" · ");
    case "mains_evaluated": return [d.title, d.marks !== undefined ? `${d.marks} marks` : ""].filter(Boolean).join(" · ");
    case "note_opened": case "note_uploaded": return String(d.item ?? "");
    case "revision_read": return [d.topic, d.paper].filter(Boolean).join(" · ");
    case "purchase": return `${String(d.plan ?? "").replace(/_/g, " ").toLowerCase()} · ₹${d.amount_inr}`;
    case "feedback": return `${d.rating}★${d.edited ? " (edited)" : ""}`;
    case "signin": case "signup": return d.method ? `via ${d.method}` : "";
    default: return "";
  }
}

export function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function ActivityList({ items, showUser = false, onUser }: { items: ActivityItem[]; showUser?: boolean; onUser?: (uid: string) => void }) {
  if (!items.length) return <p className="text-sm text-muted">No activity yet.</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((a) => {
        const Icon = ICON[a.action] ?? Target;
        const detail = describe(a);
        return (
          <li key={a.id} className="flex items-start gap-3 py-2.5">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-surface-2 text-primary"><Icon size={14} /></span>
            <div className="min-w-0 flex-1 text-sm">
              <div>
                {showUser && (
                  <button onClick={() => onUser?.(a.uid)} className="mr-1.5 font-semibold text-primary hover:underline">{a.name || a.email || a.uid}</button>)}
                <span className="font-semibold">{a.label}</span>
              </div>
              {detail && <div className="truncate text-xs text-ink-2">{detail}</div>}
            </div>
            <span className="shrink-0 text-xs text-muted">{when(a.at)}</span>
          </li>);
      })}
    </ul>
  );
}
