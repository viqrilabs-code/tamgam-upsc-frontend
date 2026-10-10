"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button, Card, Empty, ErrorBox, Loading, PageHeader, cx } from "@/components/ui";
import { api } from "@/lib/api";
import { useAsync, useFeedbackStatus, useSession } from "@/lib/hooks";
import { fmtDate } from "@/lib/labels";

type Fb = { rating: number; review: string; improve: string; areas: string[]; allow_public: boolean; updated_at?: string };
type Me = { eligible: boolean; used: string[]; feedback: Fb | null; areas: Record<string, string> };
const WORDS = ["", "Poor", "Needs work", "Okay", "Good", "Loving it"];

export default function FeedbackPage() {
  const session = useSession();
  const me = useAsync(() => api<Me>("/api/v1/feedback/me"), []);
  const { refresh } = useFeedbackStatus(session);
  const [f, setF] = useState<Fb>({ rating: 0, review: "", improve: "", areas: [], allow_public: false });
  const [hover, setHover] = useState(0);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (me.data?.feedback) setF(me.data.feedback); }, [me.data]);
  if (!session) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.rating) { setErr(new Error("Pick a star rating first")); return; }
    setBusy(true); setErr(undefined);
    try {
      const out = await api<Me>("/api/v1/feedback/me", { method: "PUT", json: f });
      me.setData(out); setEditing(false); setSaved(true); refresh();
    } catch (e2) { setErr(e2); } finally { setBusy(false); }
  }

  const field = "mt-1 w-full rounded-2xl border-2 border-line bg-bg px-3 py-2 text-sm font-normal leading-relaxed outline-none focus:border-primary";
  const d = me.data;
  return (
    <AppShell guestPreview={{ emoji: "💬", title: "Feedback & reviews", points: [
      "Rate TamGam and tell us what to improve", "Open to every signed-in student, on any plan", "Sign in, try a feature, then share how it went"] }}>
      <div className="mx-auto max-w-2xl">
        <PageHeader kicker="Feedback" title="How is TamGam working for you?"
          sub="Your rating and suggestions go straight to the team building TamGam. You can update them any time." />
        {me.loading ? <Loading /> : me.error ? <ErrorBox error={me.error} /> : !d?.eligible ? (
          <Empty icon="🧪" title="Try a feature first">
            Feedback opens once you&apos;ve used TamGam — take a <Link href="/practice/" className="font-semibold text-primary">practice test</Link>,
            try the <Link href="/pyq/" className="font-semibold text-primary">PYQ Lab</Link> or open a <Link href="/revision/" className="font-semibold text-primary">revision card</Link>, then come back and tell us how it went.
          </Empty>
        ) : d.feedback && !editing ? (
          <Card sticker className="space-y-3">
            {saved && <p className="rounded-2xl bg-green-soft p-3 text-sm font-semibold text-green">Thank you! Your feedback reached the team. 🙏</p>}
            <div className="flex items-center gap-2"><Stars value={d.feedback.rating} /><span className="text-sm font-semibold">{WORDS[d.feedback.rating]}</span>
              {d.feedback.updated_at && <span className="ml-auto text-xs text-muted">{fmtDate(d.feedback.updated_at)}</span>}</div>
            {d.feedback.review && <Quote label="Your review" text={d.feedback.review} />}
            {d.feedback.improve && <Quote label="What we should improve" text={d.feedback.improve} />}
            {d.feedback.areas.length > 0 && <p className="text-xs text-muted">About: {d.feedback.areas.map((a) => d.areas[a] ?? a).join(", ")}</p>}
            <Button variant="outline" onClick={() => { setEditing(true); setSaved(false); }}>Edit my feedback</Button>
          </Card>
        ) : (
          <Card sticker>
            <form onSubmit={submit} className="space-y-5">
              <div>
                <div className="text-sm font-semibold">Your overall rating</div>
                <div className="mt-1 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} onMouseEnter={() => setHover(n)}
                      onClick={() => setF({ ...f, rating: n })} className="p-0.5">
                      <Star size={32} className={cx("transition", (hover || f.rating) >= n ? "fill-saffron text-saffron" : "text-line")} />
                    </button>))}
                  <span className="ml-2 text-sm font-semibold text-ink-2">{WORDS[hover || f.rating]}</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold">What did you use? <span className="font-normal text-muted">(optional)</span></div>
                <div className="mt-2 flex flex-wrap gap-2">{Object.entries(d.areas).map(([k, label]) => {
                  const on = f.areas.includes(k);
                  return <button key={k} type="button" onClick={() => setF({ ...f, areas: on ? f.areas.filter((a) => a !== k) : [...f.areas, k] })}
                    className={cx("rounded-full border-2 px-3 py-1 text-xs font-semibold", on ? "border-primary bg-primary text-primary-ink" : "border-line text-ink-2 hover:border-primary")}>{label}</button>;
                })}</div>
              </div>
              <label className="block text-sm font-semibold">Your review <span className="font-normal text-muted">(what&apos;s working for you?)</span>
                <textarea className={field} rows={4} maxLength={3000} value={f.review} onChange={(e) => setF({ ...f, review: e.target.value })} /></label>
              <label className="block text-sm font-semibold">What should we improve or add? <span className="font-normal text-muted">(only the team sees this)</span>
                <textarea className={field} rows={4} maxLength={3000} value={f.improve} onChange={(e) => setF({ ...f, improve: e.target.value })} /></label>
              <label className="flex items-start gap-2 text-sm text-ink-2">
                <input type="checkbox" className="mt-1" checked={f.allow_public} onChange={(e) => setF({ ...f, allow_public: e.target.checked })} />
                TamGam may show my review (with my first name) on the website.</label>
              {err ? <ErrorBox error={err} /> : null}
              <div className="flex gap-2">
                {d.feedback && <Button variant="ghost" type="button" onClick={() => { setEditing(false); setF(d.feedback!); }}>Cancel</Button>}
                <Button type="submit" loading={busy}>{d.feedback ? "Update feedback" : "Send feedback"}</Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function Stars({ value, size = 18 }: { value: number; size?: number }) {
  return <span className="inline-flex gap-0.5">{[1, 2, 3, 4, 5].map((n) =>
    <Star key={n} size={size} className={n <= value ? "fill-saffron text-saffron" : "text-line"} />)}</span>;
}

function Quote({ label, text }: { label: string; text: string }) {
  return <div><div className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</div>
    <p className="mt-1 whitespace-pre-line text-ink-2">{text}</p></div>;
}
