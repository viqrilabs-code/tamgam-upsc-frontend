export const PAPERS = [
  { scope: "gs1", paper: "GS1", label: "GS I", long: "History · Culture · Geography · Society", emoji: "🏛️", stages: ["PRELIMS", "MAINS"] },
  { scope: "gs2", paper: "GS2", label: "GS II", long: "Polity · Governance · Social Justice · IR", emoji: "⚖️", stages: ["PRELIMS", "MAINS"] },
  { scope: "gs3", paper: "GS3", label: "GS III", long: "Economy · Environment · S&T · Security", emoji: "🌱", stages: ["PRELIMS", "MAINS"] },
  { scope: "gs4", paper: "GS4", label: "GS IV", long: "Ethics · Integrity · Aptitude", emoji: "🧭", stages: ["PRELIMS", "MAINS"] },
  { scope: "psir", paper: "PSIR", label: "PSIR", long: "Optional · Papers I & II", emoji: "🌐", stages: ["MAINS"] },
] as const;

export const SCOPE_LABEL: Record<string, string> = {
  gs1: "GS I", gs2: "GS II", gs3: "GS III", gs4: "GS IV", psir: "PSIR", pyq: "PYQ",
  current_affairs: "Current Affairs", mocks: "Full mock",
};

export const FORMAT_LABEL: Record<string, string> = {
  MULTI_STATEMENT: "Multi-statement", PAIR_MATCH: "Pair match", STATEMENT_I_II: "Statement I/II",
  DIRECT: "Direct", DESCRIPTIVE: "Descriptive", CASE_STUDY: "Case study",
};

export const BUCKET_LABEL: Record<string, string> = { PYQ: "PYQ", NEW: "Fresh", CA: "Current affairs", RANDOM: "Wildcard" };

export const DIM_LABEL: Record<string, string> = {
  demand: "Demand of question", content: "Content depth", evidence: "Evidence", structure: "Structure",
  conclusion: "Conclusion", presentation: "Presentation",
};

export function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const h = Math.floor(m / 60);
  return h ? `${h}:${String(m % 60).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

export function todayIST() {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** Paper-level GS tags ("GS1"…"GS4") from whatever an article carries — older cards hold syllabus ids like "GS2.POL.CON". */
export function gsPapers(tags: string[] | undefined): string[] {
  const out = new Set<string>();
  for (const t of tags ?? []) {
    const m = /^\s*GS\s*-?\s*([1-4])/i.exec(t);
    if (m) out.add(`GS${m[1]}`);
  }
  return [...out].sort();
}
