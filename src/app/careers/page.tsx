"use client";

import PublicShell, { EMAIL, Section } from "@/components/PublicShell";
import { Card, Chip } from "@/components/ui";

const TEAMS = [
  ["Subject experts (GS I–IV, PSIR)", "Content", "Review AI-generated questions and explanations, write model-answer outlines and rubrics, and keep facts exam-accurate. Ideal for those who have cleared Prelims/Mains or taught at a reputed institute."],
  ["Current-affairs editors", "Content", "Pick the stories that matter for UPSC each morning, check the static facts and sharpen Prelims and Mains angles."],
  ["Mains evaluators", "Content · part-time", "Grade an anchor set of answers each week so our automated evaluation stays calibrated against expert judgement."],
  ["Full-stack and AI engineers", "Engineering", "Python/FastAPI, Next.js, Google Cloud and LLM pipelines — quality systems, evaluation and performance at scale."],
  ["Product designers", "Design", "Make serious preparation feel light: clear flows, honest data and fast mobile experiences."],
  ["Community & student success", "Growth", "Help aspirants get the most out of TamGam through WhatsApp, Telegram and campus communities."],
];

export default function Careers() {
  return (
    <PublicShell kicker="Careers" title="Build the prep you wish you had" intro="We are a small team that cares about students, accuracy and craft.">
      <Section title="How we work">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><b>Accuracy first.</b> One wrong answer key costs a student real marks. We review, measure and fix.</li>
          <li><b>Honesty with students.</b> No hype, no guaranteed-selection claims.</li>
          <li><b>Small, senior, remote-friendly.</b> Clear ownership, written communication and flexible hours.</li>
        </ul>
      </Section>
      <Section title="Teams we hire for">
        <p>We hire continuously across these areas. If you&apos;d be great at one of them, we would like to hear from you even if no specific role is advertised.</p>
        <div className="grid gap-3">
          {TEAMS.map(([t, team, d]) => (
            <Card key={t}>
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-display text-lg font-bold">{t}</div><Chip tone="primary">{team}</Chip></div>
              <p className="mt-1 text-sm text-ink-2">{d}</p>
            </Card>
          ))}
        </div>
      </Section>
      <Section title="How to apply">
        <p>Email <a className="font-semibold text-primary" href={`mailto:${EMAIL}?subject=Careers`}>{EMAIL}</a> with the subject <b>“Careers — role name”</b>. Include your CV or LinkedIn, a few lines on why TamGam, and one piece of work you&apos;re proud of: an answer you wrote, notes you made, code or a design. We reply to every application within two weeks.</p>
        <p className="text-sm">TamGam is an equal-opportunity employer. We never charge candidates any fee.</p>
      </Section>
    </PublicShell>
  );
}
