"use client";

import Link from "next/link";
import { Mail, MessageCircle, Clock, ShieldCheck } from "lucide-react";
import PublicShell, { EMAIL, Section, WHATSAPP_DISPLAY, WHATSAPP_LINK } from "@/components/PublicShell";
import { Card } from "@/components/ui";

export default function Contact() {
  return (
    <PublicShell kicker="Contact" title="Talk to a human" intro="Questions, feedback, a wrong answer key, a payment issue — we read everything.">
      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="sticker sticker-hover block rounded-3xl bg-green-soft p-5">
          <MessageCircle className="text-green" />
          <div className="mt-3 font-display text-xl font-extrabold">WhatsApp</div>
          <div className="font-mono text-lg font-semibold">{WHATSAPP_DISPLAY}</div>
          <p className="mt-1 text-sm text-ink-2">Fastest for quick questions and payment help.</p>
        </a>
        <a href={`mailto:${EMAIL}`} className="sticker sticker-hover block rounded-3xl bg-primary-soft p-5">
          <Mail className="text-primary" />
          <div className="mt-3 font-display text-xl font-extrabold">Email</div>
          <div className="font-mono text-lg font-semibold">{EMAIL}</div>
          <p className="mt-1 text-sm text-ink-2">Best for detailed issues, partnerships and careers.</p>
        </a>
      </div>

      <Section title="When we reply">
        <Card className="flex items-start gap-3"><Clock className="mt-0.5 shrink-0 text-saffron" size={20} />
          <p className="text-sm">Monday to Saturday, 10:00–19:00 IST. We aim to reply within one working day, and to resolve payment issues within three working days.</p>
        </Card>
      </Section>

      <Section title="Help us help you faster">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><b>Payments:</b> include your order id (shown on the Plans page and in your Razorpay receipt) and the email address you signed in with.</li>
          <li><b>Wrong or unclear question:</b> use the <i>Report</i> button under the explanation — it reaches our reviewers directly with the question id.</li>
          <li><b>Evaluation or notes issues:</b> mention the test name or note title and the date.</li>
          <li>Signed in? The <Link href="/help/" className="font-semibold text-primary">Help &amp; complaints</Link> page keeps a tracked thread with replies from our team.</li>
        </ul>
      </Section>

      <Section title="Grievance officer">
        <Card className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-green" size={20} />
          <p className="text-sm">
            For privacy requests or complaints under India&apos;s Digital Personal Data Protection Act, 2023 and the IT Rules, 2021,
            write to the Grievance Officer at <a className="font-semibold text-primary" href={`mailto:${EMAIL}`}>{EMAIL}</a> with the subject
            line “Grievance”. We acknowledge within 24 hours and resolve within 15 days.
          </p>
        </Card>
      </Section>
    </PublicShell>
  );
}
