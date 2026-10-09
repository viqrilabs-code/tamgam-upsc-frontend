"use client";

import Link from "next/link";
import PublicShell, { Bullets, EMAIL, Section, Updated, WHATSAPP_DISPLAY } from "@/components/PublicShell";

export default function Refunds() {
  return (
    <PublicShell kicker="Refund policy" title="Refunds, plainly" intro="Short version: try everything on the Free plan first. Once a paid pass has been used, it isn't refundable.">
      <Updated />
      <div className="mb-8 rounded-3xl border-2 border-saffron bg-saffron-soft p-5">
        <div className="font-display text-lg font-extrabold">The one rule</div>
        <p className="mt-1">
          You are <b>not eligible for a refund if any service on your pass has been used</b> — for example a test was started,
          a Mains answer was evaluated, a note was opened or generated, or a mock was taken. Each of these uses paid
          resources (including AI processing) the moment it starts.
        </p>
        <p className="mt-2">
          To evaluate TamGam before paying, use the <Link className="font-semibold text-primary" href="/plans/">Free plan</Link>: Prelims tests
          (5 questions each) and the full 100-question Prelims mock, free, for as long as you like.
        </p>
      </div>

      <Section title="When you are eligible">
        <Bullets items={[
          <><b>Unused pass:</b> you bought a Daily or Monthly Pass and have not used any service on it. Ask before the pass expires.</>,
          <><b>Duplicate payment:</b> you were charged twice for the same order.</>,
          <><b>Payment taken, pass not activated:</b> money was debited but your pass did not activate within 24 hours.</>,
          <><b>Our failure:</b> a significant outage or defect on our side stopped you from using what you paid for. These are reviewed case by case.</>,
        ]} />
      </Section>

      <Section title="When you are not eligible">
        <Bullets items={[
          "Any service on the pass has been used (see the rule above), even once.",
          "The pass has expired.",
          "You changed your mind about the exam, your preparation strategy or your target year after using the pass.",
          "Your account was suspended for breaking the Terms of Service.",
        ]} />
      </Section>

      <Section title="How to request a refund">
        <Bullets items={[
          <>Write to <a className="font-semibold text-primary" href={`mailto:${EMAIL}`}>{EMAIL}</a> or WhatsApp {WHATSAPP_DISPLAY}, or raise a complaint under <i>Payment</i> on the Help page.</>,
          "Include your order id and the email address you signed in with.",
          "We confirm eligibility from your account's usage record and reply within three working days.",
        ]} />
      </Section>

      <Section title="How refunds are paid">
        <p>Approved refunds go back to the original payment method through Razorpay. Banks usually show the credit within 5–7 working days. The pass is deactivated when the refund is issued.</p>
      </Section>

      <Section title="Good to know">
        <Bullets items={[
          "Passes never auto-renew — you are only charged when you buy.",
          "Price changes never affect a pass you have already bought.",
          "Buying a new pass while one is active starts a fresh pass with fresh allowances; the old pass ends.",
        ]} />
      </Section>
    </PublicShell>
  );
}
