"use client";

import { cx } from "./ui";
import { fmtDate } from "@/lib/labels";

export type Complaint = {
  complaint_id: string; uid: string; user_name?: string; category: string; subject: string; ref?: string; status: string;
  thread: { by: string; role: "user" | "admin"; text: string; at: string }[]; created_at: string; updated_at: string;
};

export const STATUS_TONE: Record<string, "primary" | "saffron" | "green" | "danger" | "neutral"> = {
  OPEN: "saffron", IN_PROGRESS: "primary", RESOLVED: "green", REJECTED: "danger",
};

export function Thread({ c, admin = false }: { c: Complaint; admin?: boolean }) {
  return (
    <ul className="space-y-2">
      {c.thread.map((m, i) => (
        <li key={i} className={cx("max-w-[85%] rounded-2xl p-3 text-sm", m.role === "admin" ? "ml-auto bg-primary-soft" : "bg-surface-2")}>
          <div className="mb-0.5 text-[10px] font-bold uppercase text-muted">{m.role === "admin" ? "TamGam support" : admin ? (c.user_name ?? "User") : "You"} · {fmtDate(m.at)}</div>
          <div className="whitespace-pre-wrap">{m.text}</div>
        </li>
      ))}
    </ul>
  );
}

