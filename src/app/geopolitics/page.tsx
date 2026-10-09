"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ExternalLink, Globe2, Search, Share2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import PublicShell from "@/components/PublicShell";
import RichText from "@/components/RichText";
import { Button, Card, Empty, ErrorBox, Loading, PageHeader } from "@/components/ui";
import { api, getSession } from "@/lib/api";
import { useAsync, useSearch } from "@/lib/hooks";
import { fmtDate } from "@/lib/labels";

type Summary = { id: string; slug: string; url: string; title: string; summary: string; published_at?: string; sources: number };
type Post = Omit<Summary, "sources"> & { body: string; conclusion: string; sources: { url: string; title: string }[] };

/** Public (no sign-in) blog on geopolitical events. Signed-in students read it inside the app shell. */
export default function Geopolitics() {
  const q = useSearch();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => { setSignedIn(!!getSession()); }, []);
  useEffect(() => { setOpen(q.get("post")); }, [q]);
  useEffect(() => {                                    // browser back/forward between the list and a post
    const on = () => setOpen(new URLSearchParams(window.location.search).get("post"));
    window.addEventListener("popstate", on); return () => window.removeEventListener("popstate", on);
  }, []);

  const list = useAsync(() => api<{ items: Summary[] }>(`/api/v1/blog/posts${query ? `?q=${encodeURIComponent(query)}` : ""}`), [query]);
  const post = useAsync(async () => (open ? api<Post>(`/api/v1/blog/posts/${open}`) : null), [open]);

  function go(id: string | null) {
    setOpen(id);
    history.pushState(null, "", id ? `/geopolitics/?post=${id}` : "/geopolitics/");
    window.scrollTo({ top: 0 });
  }
  if (signedIn === null) return null;

  if (open) {
    const p = post.data;
    return (
      <Frame signedIn={signedIn} kicker={p?.published_at ? `Geopolitics · ${fmtDate(p.published_at)}` : "Geopolitics"} title={p?.title ?? ""}>
        <button onClick={() => go(null)} className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary"><ArrowLeft size={16} /> All posts</button>
        {post.loading ? <Loading /> : post.error ? <ErrorBox error={post.error} /> : p && (
          <div className="space-y-7 text-[15px] text-ink-2">
            <p className="rounded-2xl bg-primary-soft p-4 text-base font-medium text-ink">{p.summary}</p>
            <Block title="The story"><RichText text={p.body} /></Block>
            <Block title="Conclusion"><RichText text={p.conclusion} /></Block>
            <SharePost title={p.title} url={p.url} />
            <Block title="Sources">
              <ul className="space-y-1.5">{p.sources.map((s) => (
                <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer nofollow"
                  className="inline-flex items-start gap-1.5 font-semibold text-primary hover:underline">
                  <ExternalLink size={14} className="mt-1 shrink-0" /><span className="break-all">{s.title}</span></a></li>))}</ul>
            </Block>
          </div>
        )}
      </Frame>
    );
  }

  return (
    <Frame signedIn={signedIn} kicker="Geopolitics" title="World events, explained for UPSC"
      intro="Plain-language posts on the geopolitical events that matter for GS II and the interview — what happened, why it matters for India, and where to read more.">
      <form onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()); }} className="relative mb-5 sm:max-w-sm">
        <Search size={16} className="absolute left-3 top-3 text-muted" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts"
          className="w-full rounded-2xl border-2 border-line bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" />
      </form>
      {list.loading ? <Loading /> : list.error ? <ErrorBox error={list.error} /> : !list.data?.items.length ? (
        <Empty icon="🌍" title={query ? "No posts match" : "First posts are on their way"}>{query ? "Try another search." : "Check back soon."}</Empty>
      ) : (
        <div className="space-y-4">
          {list.data.items.map((s) => (
            <button key={s.id} onClick={() => go(s.slug)} className="block w-full text-left">
              <Card className="transition hover:-translate-y-0.5">
                <div className="flex items-center gap-2 text-xs text-muted"><Globe2 size={14} className="text-primary" />{fmtDate(s.published_at)}
                  <span>· {s.sources} source{s.sources === 1 ? "" : "s"}</span></div>
                <div className="mt-1 font-display text-xl font-bold">{s.title}</div>
                <p className="mt-1 line-clamp-3 text-sm text-ink-2">{s.summary}</p>
              </Card>
            </button>
          ))}
        </div>
      )}
      {!signedIn && <p className="mt-8 text-sm text-ink-2">Preparing for UPSC? <Link href="/login/" className="font-semibold text-primary">Sign in free</Link> for Prelims mocks, PYQ Lab and revision cards.</p>}
    </Frame>
  );
}

function Frame({ signedIn, kicker, title, intro, children }: { signedIn: boolean; kicker: string; title: string; intro?: string; children: ReactNode }) {
  if (!signedIn) return <PublicShell kicker={kicker} title={title} intro={intro}>{children}</PublicShell>;
  return <AppShell><div className="mx-auto max-w-3xl"><PageHeader kicker={kicker} title={title} sub={intro} />{children}</div></AppShell>;
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="mb-2 font-display text-xl font-bold text-ink">{title}</h2>{children}</section>;
}

/** Share the post's permanent link (tamgam.in/geopolitics/<slug>/) — it opens with a proper preview card on social media. */
function SharePost({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent(url), t = encodeURIComponent(title);
  const links: [string, string][] = [
    ["WhatsApp", `https://wa.me/?text=${t}%20${enc}`], ["X", `https://twitter.com/intent/tweet?url=${enc}&text=${t}`],
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`], ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${enc}`],
    ["Telegram", `https://t.me/share/url?url=${enc}&text=${t}`],
  ];
  async function share() {
    if (navigator.share) { try { await navigator.share({ title, url }); return; } catch { /* cancelled */ } }
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { /* clipboard blocked */ }
  }
  return (
    <div className="rounded-2xl border-2 border-line p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={share}><Share2 size={14} /> {copied ? "Link copied ✓" : "Share"}</Button>
        {links.map(([name, href]) => <a key={name} href={href} target="_blank" rel="noopener noreferrer"
          className="rounded-full border-2 border-line px-3 py-1 text-xs font-semibold text-ink-2 hover:border-primary hover:text-primary">{name}</a>)}
      </div>
      <a href={url} className="break-all text-xs text-muted hover:text-primary">{url}</a>
    </div>
  );
}
