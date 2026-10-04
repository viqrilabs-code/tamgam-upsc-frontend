"use client";

import Link from "next/link";
import PublicShell, { COMPANY, Section } from "@/components/PublicShell";
import { Card } from "@/components/ui";

const PILLARS = [
  ["🎯", "Real-pattern practice", "Prelims tests mixed like recent papers — mostly multi-statement, a real current-affairs share, PYQs and wildcards — scored +2 / −0.66. Mains answers evaluated on a transparent rubric, with marks computed by code."],
  ["📰", "The newspaper, distilled", "Every day's paper read for UPSC relevance and turned into own-words cards with static facts, Prelims and Mains angles, plus a quiz."],
  ["📜", "How UPSC actually asks", "The PYQ Lab maps what keeps coming back, topic by topic, and tests option-pattern heuristics against held-out years before we publish them."],
  ["📘", "Notes that adapt", "Cornell notes that expand where you're weak and collapse where you're strong — or upload a book, pick a chapter and get a 1–4 page note with the key maps and diagrams."],
];

export default function About() {
  return (
    <PublicShell kicker="About" title="Serious prep. Zero noise." intro={`TamGam is a UPSC Civil Services preparation platform built by ${COMPANY}.`}>
      <Section title="Why we built TamGam">
        <p>Most aspirants spend more time hunting for material than practising with it. Test series are expensive, feedback on Mains answers is slow, and “analytics” too often means a big percentage with nothing behind it.</p>
        <p>TamGam puts practice, current affairs, previous-year analysis, notes and feedback in one place, at a price a student can afford — and tells you the truth about where you stand.</p>
      </Section>
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {PILLARS.map(([e, t, d]) => (
          <Card key={t}><div className="text-3xl">{e}</div><div className="mt-2 font-display text-lg font-bold">{t}</div><p className="mt-1 text-sm text-ink-2">{d}</p></Card>
        ))}
      </div>
      <Section title="How we use AI — carefully">
        <p>AI helps us write fresh questions, read your uploads and evaluate answers. Every generated question is checked by a second AI that answers it blind, screened for safety, and judged against UPSC standards. Anything uncertain goes to a human reviewer, and you can report any question in one tap. We never repeat a question you have already seen.</p>
      </Section>
      <Section title="What we promise">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Honest analytics: estimates appear only when there is enough data, always as a range, with the reasoning shown.</li>
          <li>No guaranteed-selection claims, ever.</li>
          <li>Your data stays yours: export or delete it any time.</li>
          <li>Simple pricing: a free plan for Prelims practice, and passes that never auto-renew.</li>
        </ul>
      </Section>
      <Section title="Independent">
        <p>TamGam is not affiliated with the Union Public Service Commission or any newspaper. Questions? <Link className="font-semibold text-primary" href="/contact/">Contact us</Link>.</p>
      </Section>
    </PublicShell>
  );
}
