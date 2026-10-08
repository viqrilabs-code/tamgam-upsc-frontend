"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { API_BASE } from "@/lib/api";

/** Counts one page view per route change for the admin's Visitors tab. Fire-and-forget; never blocks or breaks a page. */
export default function VisitTracker() {
  const path = usePathname();
  useEffect(() => {
    if (!path || path.startsWith("/admin")) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = localStorage.getItem("tamgam.token");
      if (token) headers.Authorization = `Bearer ${token}`;
      const ref = document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer.slice(0, 500) : null;
      fetch(`${API_BASE}/api/v1/platform/visit`, { method: "POST", headers, body: JSON.stringify({ path: path.slice(0, 300), ref }) })
        .catch(() => {});
    } catch { /* storage blocked — skip */ }
  }, [path]);
  return null;
}
