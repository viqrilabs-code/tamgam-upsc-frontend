"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, BookOpenCheck, Landmark, Search } from "lucide-react";
import AppShell from "@/components/AppShell";
import RichText from "@/components/RichText";
import { Button, Card, Chip, Empty, ErrorBox, Loading, PageHeader, Segmented } from "@/components/ui";
import { api } from "@/lib/api";
import { useAsync, useSearch, useSession } from "@/lib/hooks";
import { fmtDate } from "@/lib/labels";

type Summary = { id: string; paper: string; topic: string; topic_name?: string | null; intro_preview: string; updated_at?: string };
type FullCard = Summary & { introduction: string; body: string; initiatives?: string; conclusion: string };
const PAPERS = ["ALL", "GS1", "GS2", "GS3", "GS4", "PSIR"] as const;

export default function Revision() {
  const session = useSession();
  const q = useSearch();
  const [paper, setPaper] = useState<(typeof PAPERS)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { const id = q.get("card"); if (id) setOpen(id); }, [q]);

  const list = useAsync(() => api<{ items: Summary[] }>(`/api/v1/revision/cards?${new URLSearchParams({
    ...(paper !== "ALL" ? { paper } : {}), ...(query ? { q: query } : {}) })}`), [paper, query]);
  const card = useAsync(async () => (open ? api<FullCard>(`/api/v1/revision/cards/${open}`) : null), [open]);
  if (!session) return null;

  return (
    <AppShell guestPreview={{ emoji: "📗", title: "Revision cards", points: [
      "One topic per card: introduction, main body, recent government initiatives, conclusion",
      "Written by the TamGam team for quick last-mile revision", "Free for every signed-in student"] }}>
      {open ? (
        card.loading ? <Loading /> : card.error ? <ErrorBox error={card.error} /> : card.data && (
          <article className="mx-auto max-w-3xl">
            <Button variant="ghost" onClick={() => setOpen(null)} className="mb-3"><ArrowLeft size={16} /> All cards</Button>
            <Card sticker className="space-y-6">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Chip tone="primary">{card.data.paper}</Chip>
                  {card.data.topic_name && <Chip>{card.data.topic_name}</Chip>}
                  {card.data.updated_at && <span className="ml-auto text-xs text-muted">Updated {fmtDate(card.data.updated_at)}</span>}
                </div>
                <h1 className="mt-3 font-display text-3xl font-extrabold">{card.data.topic}</h1>
              </div>
              <Section title="Introduction"><RichText text={card.data.introduction} /></Section>
              <Section title="Main body"><RichText text={card.data.body} /></Section>
              {card.data.initiatives?.trim() && (
                <Section title="Recent government initiatives" icon={<Landmark size={16} />} tone="bg-primary-soft">
                  <RichText text={card.data.initiatives} />
                </Section>
              )}
              <Section title="Conclusion"><RichText text={card.data.conclusion} /></Section>
            </Card>
          </article>
        )
      ) : (
        <>
          <PageHeader kicker="Revision" title="Revise a topic in five minutes"
            sub="Each card covers one topic: an introduction, the main body, recent government initiatives and a conclusion — written by the TamGam team." />
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Segmented value={paper} onChange={setPaper} options={PAPERS.map((p) => ({ value: p, label: p === "ALL" ? "All" : p }))} />
            <form onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()); }} className="relative ml-auto min-w-0 flex-1 sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-3 text-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search topics"
                className="w-full rounded-2xl border-2 border-line bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" />
            </form>
          </div>
          {list.loading ? <Loading /> : list.error ? <ErrorBox error={list.error} /> : !list.data?.items.length ? (
            <Empty icon="📗" title={query || paper !== "ALL" ? "No cards match" : "Revision cards are on their way"}>
              {query || paper !== "ALL" ? "Try another paper or search." : "The TamGam team is writing them — check back soon."}
            </Empty>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.data.items.map((c) => (
                <button key={c.id} onClick={() => setOpen(c.id)} className="text-left">
                  <Card className="h-full transition hover:-translate-y-0.5">
                    <div className="flex flex-wrap gap-1.5"><Chip tone="primary">{c.paper}</Chip>{c.topic_name && <Chip>{c.topic_name}</Chip>}</div>
                    <div className="mt-2 flex items-start gap-2 font-display text-lg font-bold"><BookOpenCheck size={18} className="mt-1 shrink-0 text-primary" />{c.topic}</div>
                    <p className="mt-1 line-clamp-3 text-sm text-ink-2">{c.intro_preview}</p>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

function Section({ title, icon, tone = "", children }: { title: string; icon?: React.ReactNode; tone?: string; children: React.ReactNode }) {
  return (
    <section className={tone ? `rounded-2xl p-4 ${tone}` : ""}>
      <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">{icon}{title}</h2>
      <div className="text-[15px] text-ink-2">{children}</div>
    </section>
  );
}
