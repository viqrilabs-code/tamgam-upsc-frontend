"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import { Button, Card, Chip, Empty, ErrorBox, Loading, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useAsync, useSession } from "@/lib/hooks";
import { SCOPE_LABEL, fmtDate } from "@/lib/labels";
import { attemptUrl, resultUrl } from "@/lib/tests";
import type { Attempt } from "@/lib/types";

type Page = { items: Attempt[]; next_cursor: string | null };

export default function HistoryPage() {
  const session = useSession();
  const first = useAsync(() => api<Page>("/api/v1/attempts?limit=20"), []);
  const [more, setMore] = useState<Attempt[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>();
  const [busy, setBusy] = useState(false);

  if (!session) return null;
  const items = [...(first.data?.items ?? []), ...more];
  const next = cursor === undefined ? first.data?.next_cursor : cursor;

  return (
    <AppShell guestPreview={{ emoji: "🗂️", title: "Every attempt, saved to your account", points: [
      "Resume unfinished tests", "Review explanations any time", "Sign in on any device with the same number to get it all back"] }}>
      <PageHeader kicker="History" title="Every attempt, receipts included" />
      {first.loading ? <Loading /> : first.error ? <ErrorBox error={first.error} /> : items.length === 0 ? (
        <Empty icon="🗂️" title="No attempts yet"><Link className="font-bold text-primary" href="/practice/">Start practising →</Link></Empty>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted">
                <tr><th className="p-4">Test</th><th className="p-4">Section</th><th className="p-4">Date</th><th className="p-4 text-right">Score</th><th className="p-4" /></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((a) => (
                  <tr key={a.attempt_id} className="hover:bg-surface-2">
                    <td className="p-4 font-semibold">{a.title}</td>
                    <td className="p-4"><Chip tone="primary">{SCOPE_LABEL[a.scope] ?? a.scope}</Chip></td>
                    <td className="p-4 text-ink-2">{fmtDate(a.started_at)}</td>
                    <td className="p-4 text-right font-mono font-bold">
                      {a.max_score ? `${a.score} / ${a.max_score}` : a.status === "IN_PROGRESS" ? "—" : a.status.toLowerCase()}
                    </td>
                    <td className="p-4 text-right">
                      <Link className="font-bold text-primary" href={a.status === "IN_PROGRESS" ? attemptUrl(a.scope, a.test_id) : resultUrl(a.scope, a.attempt_id)}>
                        {a.status === "IN_PROGRESS" ? "Resume" : "Review"} →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {next && (
            <div className="border-t border-line p-4 text-center">
              <Button variant="outline" loading={busy} onClick={async () => {
                setBusy(true);
                const p = await api<Page>(`/api/v1/attempts?limit=20&cursor=${encodeURIComponent(next)}`);
                setMore([...more, ...p.items]);
                setCursor(p.next_cursor);
                setBusy(false);
              }}>Load more</Button>
            </div>
          )}
        </Card>
      )}
    </AppShell>
  );
}
