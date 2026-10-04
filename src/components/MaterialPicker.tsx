"use client";

import { useEffect, useState } from "react";
import { FileText, Library } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/labels";
import { cx } from "./ui";

export type Material = { material_id: string; kind: "notes" | "source"; title: string; files: string[];
  pages?: number | null; created_at?: string; topic_name?: string | null };

/**
 * Shown next to every study-material upload button: reuse anything uploaded earlier in any service
 * (notes or own-source tests) instead of uploading it again.
 */
export default function MaterialPicker({ onPick, disabled, label = "Use material you've already uploaded" }:
  { onPick: (m: Material) => void; disabled?: boolean; label?: string }) {
  const [items, setItems] = useState<Material[] | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    api<{ items: Material[] }>("/api/v1/library/my-materials").then((r) => setItems(r.items)).catch(() => setItems([]));
  }, []);

  if (!items?.length) return null;
  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-primary-soft/60 p-3">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 text-left text-sm font-bold">
        <span className="inline-flex items-center gap-2"><Library size={16} className="text-primary" /> {label}</span>
        <span className="text-xs font-semibold text-muted">{open ? "hide" : `${items.length} available`}</span>
      </button>
      {open && (
        <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {items.map((m) => (
            <li key={m.material_id} className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate text-sm font-semibold"><FileText size={14} className="shrink-0 text-muted" />
                  <span className="truncate">{m.files.length > 1 ? `${m.files[0]} + ${m.files.length - 1} more` : m.files[0] ?? m.title}</span></div>
                <div className="text-xs text-muted">
                  {m.kind === "notes" ? "Used for notes" : `Used for a test${m.topic_name ? ` · ${m.topic_name}` : ""}`}
                  {m.pages ? ` · ${m.pages} pages` : ""} · {fmtDate(m.created_at)}
                </div>
              </div>
              <button type="button" disabled={disabled} onClick={() => onPick(m)}
                className={cx("shrink-0 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-ink", disabled && "opacity-50")}>
                Use this
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted">Or upload something new below. Uploads are private to you and kept for 90 days.</p>
    </div>
  );
}
