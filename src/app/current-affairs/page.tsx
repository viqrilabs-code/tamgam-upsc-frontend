"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button, Card, Chip, Empty, ErrorBox, Loading, PageHeader, Segmented, cx } from "@/components/ui";
import { content } from "@/lib/api";
import { useAsync, useSearch, useSession } from "@/lib/hooks";
import { fmtDate, gsPapers } from "@/lib/labels";
import LaunchOverlay from "@/components/LaunchOverlay";
import { type LaunchState, dailyQuiz } from "@/lib/tests";
import type { CACard } from "@/lib/types";

export default function CurrentAffairs() {
  const session = useSession();
  const q = useSearch();
  const [date, setDate] = useState<string>("");
  const [gs, setGs] = useState("ALL");
  const [launchState, setLaunch] = useState<LaunchState>({ kind: "idle" });

  const manifest = useAsync(() => content<{ versions: Record<string, string> }>("manifest.json"), []);
  useEffect(() => {
    const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);   // IST
    const d = q.get("date") || manifest.data?.versions["ca/latest"] || (manifest.loading ? "" : today);
    if (d) setDate(d);
  }, [q, manifest.data, manifest.loading]);

  const month = date.slice(0, 7);
  const index = useAsync(async () => (month ? content<{ days: string[] }>(`ca/index-${month}.json`) : null), [month]);
  // Never show an empty brief: if the chosen day has no cards yet (today's paper not processed), fall back to
  // the newest earlier day that has them — looking back across month boundaries if needed.
  const day = useAsync(async () => (date ? latestBrief(date) : null), [date]);
  const shownDate = day.data?.date ?? date;

  if (!session) return null;
  const arts = (day.data?.articles ?? []).filter((a) => gs === "ALL" || gsPapers(a.gs_tags).includes(gs));

  return (
    <AppShell guestPreview={{ emoji: "📰", title: "The daily newspaper, distilled", points: [
      "The day's most important stories for UPSC, in our own words", "Static facts plus Prelims and Mains angles for every story",
      "A daily CA quiz built from the same paper", "Unlimited with a Daily or Monthly Pass"] }}>
      <PageHeader kicker="Current affairs" title="The daily brief"
        sub="The day's newspaper, distilled for UPSC — our own summaries with static facts, Prelims and Mains angles. Each day's stories also feed the quiz and the question bank."
        action={<Button variant="lime" onClick={() => dailyQuiz(setLaunch, shownDate || undefined)}>
          <Play size={16} /> Take {shownDate ? fmtDate(shownDate) : "today's"} quiz</Button>} />
      <LaunchOverlay state={launchState} onClose={() => setLaunch({ kind: "idle" })} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(index.data?.days ?? []).map((d) => (
            <button key={d} onClick={() => setDate(d)}
              className={cx("shrink-0 rounded-2xl border-2 px-3 py-1.5 text-sm font-semibold",
                d === shownDate ? "border-ink bg-ink text-bg dark:border-primary dark:bg-primary" : "border-line hover:border-ink")}>
              {new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Segmented value={gs} onChange={setGs} options={["ALL", "GS1", "GS2", "GS3", "GS4"].map((v) => ({ value: v, label: v === "ALL" ? "All" : v }))} />
        </div>
      </div>

      {day.loading || manifest.loading ? <Loading /> : day.error || manifest.error ? <ErrorBox error={day.error ?? manifest.error} /> :
        !day.data ? <Empty icon="📰" title="The first brief is on its way">Cards appear as soon as a newspaper is processed.</Empty> :
        arts.length === 0 ? <Empty icon="📰" title={`No ${gs} stories in this brief`}>Pick “All” or another paper to see the rest.</Empty> : (
          <>
          {day.data.date !== date && (
            <p className="mb-4 rounded-2xl bg-surface-2 px-4 py-2.5 text-sm text-ink-2">
              The brief for {fmtDate(date)} isn&apos;t in yet — showing the latest one, from <b>{fmtDate(day.data.date)}</b>.</p>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            {arts.map((a, i) => (
              <Card key={a.id} sticker={i === 0} className={cx(i === 0 && "md:col-span-2")}>
                <article id={a.id}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {gsPapers(a.gs_tags).map((g) => <Chip key={g} tone="primary">{g}</Chip>)}
                    {a.demo && <Chip>demo card</Chip>}
                    {!!a.linked_pyq?.length && <Chip tone="saffron">PYQ theme: {a.linked_pyq.join(", ")}</Chip>}
                  {a.source && <Chip>{a.source}{a.page ? ` · p.${a.page}` : ""}</Chip>}
                  </div>
                  <h2 className={cx("mt-3 font-display font-extrabold leading-tight", i === 0 ? "text-2xl md:text-3xl" : "text-xl")}>{a.headline}</h2>
                  <p className="mt-2 text-ink-2">{a.summary}</p>
                  {!!a.facts?.length && (
                    <div className="mt-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted">Static facts</div>
                      <ul className="mt-1.5 space-y-1 text-sm">
                        {a.facts.map((f) => <li key={f} className="flex gap-2"><span className="text-saffron">▸</span>{f}</li>)}
                      </ul>
                    </div>
                  )}
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {a.prelims_angle && <div className="rounded-2xl bg-saffron-soft p-3 text-sm"><b className="text-saffron">Prelims angle · </b>{a.prelims_angle}</div>}
                    {a.mains_angle && <div className="rounded-2xl bg-primary-soft p-3 text-sm"><b className="text-primary">Mains angle · </b>{a.mains_angle}</div>}
                  </div>
                  {a.url && (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                      Read the source <ExternalLink size={13} />
                    </a>
                  )}
                </article>
              </Card>
            ))}
          </div>
          </>
        )}
      <p className="mt-8 text-xs text-muted">Summaries are TamGam&apos;s own words written from licensed newspaper editions; we never republish article text. Not affiliated with any newspaper.</p>
    </AppShell>
  );
}


type Brief = { date: string; articles: CACard[] };

function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return mo > 1 ? `${y}-${String(mo - 1).padStart(2, "0")}` : `${y - 1}-12`;
}

/** The brief for `target`, or — if that day has no cards yet — the newest earlier day that does (up to 3 months back). */
async function latestBrief(target: string): Promise<Brief | null> {
  const exact = await content<Brief>(`ca/${target}.json`).catch(() => null);
  if (exact?.articles.length) return exact;
  let m = target.slice(0, 7);
  for (let k = 0; k < 3; k++, m = prevMonth(m)) {
    const idx = await content<{ days: string[] }>(`ca/index-${m}.json`).catch(() => null);
    for (const d of (idx?.days ?? []).filter((d) => d < target).sort().reverse()) {
      const b = await content<Brief>(`ca/${d}.json`).catch(() => null);
      if (b?.articles.length) return b;
    }
  }
  return null;
}
