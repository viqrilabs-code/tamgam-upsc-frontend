"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import PublicShell, { EMAIL, Section, WHATSAPP_DISPLAY } from "@/components/PublicShell";
import { api } from "@/lib/api";

type Plans = { plans: Record<string, { name: string; price_paise: number; days: number }> };
const inr = (p?: number) => (p === undefined ? "—" : `₹${(p / 100).toLocaleString("en-IN")}`);

function Q({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-line bg-surface p-4 open:shadow-sm">
      <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden">
        <span className="mr-2 inline-block text-primary transition group-open:rotate-90">›</span>{q}
      </summary>
      <div className="mt-2 space-y-2 pl-5 text-ink-2">{children}</div>
    </details>
  );
}

export default function Faqs() {
  const [plans, setPlans] = useState<Plans | null>(null);
  useEffect(() => { api<Plans>("/api/v1/platform/plans").then(setPlans).catch(() => setPlans(null)); }, []);
  const p = plans?.plans ?? {};

  return (
    <PublicShell kicker="FAQs" title="Questions, answered" intro="Can't find yours? Ask us on WhatsApp or email — links at the bottom.">
      <Section title="Getting started">
        <div className="space-y-2">
          <Q q="Do I need to sign up?">You can explore TamGam as a guest with just a name and an avatar. To take tests or use any other service, sign in with Google or with your email (we email you a 6-digit code) — no passwords. Use the same email on any device to get your history and passes back.</Q>
          <Q q="I changed phones. Will I lose my progress?">No. Your account is tied to your email. Sign in with the same email on any device and your history, analytics and notes come back.</Q>
          <Q q="Which exams and papers are covered?">UPSC Civil Services Prelims (GS Paper I) and Mains GS I–IV, plus the PSIR optional (Papers I and II). CSAT and Essay are planned.</Q>
          <Q q="Is TamGam connected to UPSC?">No. TamGam is independent and not affiliated with the Union Public Service Commission.</Q>
        </div>
      </Section>

      <Section title="Plans and payments">
        <div className="space-y-2">
          <Q q="What does the Free plan include?">Prelims practice tests (5 questions per sectional test) and a 10-question full-length mock, as often as you like. It&apos;s the best way to try TamGam before paying.</Q>
          <Q q="What do the member passes include?">
            <p><b>{p.DAILY_PASS?.name ?? "Daily Pass"}</b> ({inr(p.DAILY_PASS?.price_paise)} for 24 hours): every service once, plus unlimited current affairs, with your history and analytics saved to your number.</p>
            <p><b>{p.MONTHLY_PASS?.name ?? "Monthly Pass"}</b> ({inr(p.MONTHLY_PASS?.price_paise)} for 30 days): generous fair-use allowances for every service (e.g. 60 Prelims tests, 10 full mocks, 20 Mains practices, 4 full Mains mocks, 20 notes from uploads) plus unlimited current affairs and full analytics. See the full table on the <Link className="text-primary" href="/plans/">Plans</Link> page.</p>
          </Q>
          <Q q="Does a pass renew automatically?">Never. You pay only when you buy, and nothing is charged afterwards.</Q>
          <Q q="How can I pay?">UPI, debit and credit cards, netbanking and wallets through Razorpay&apos;s secure checkout. We never see your card or bank details.</Q>
          <Q q="Can I get a refund?">Only if you haven&apos;t used any service on the pass (or for a duplicate charge, or a payment that didn&apos;t activate your pass). Once a service has been used, the pass isn&apos;t refundable — so please try the Free plan first. Details are in the <Link className="text-primary" href="/refunds/">Refund Policy</Link>.</Q>
          <Q q="Money was debited but my pass isn't active.">It usually activates within a minute. If it hasn&apos;t after 30 minutes, message us with your order id — we&apos;ll activate it or refund you.</Q>
        </div>
      </Section>

      <Section title="Tests and questions">
        <div className="space-y-2">
          <Q q="Will I see the same question twice?">No. We record every question you&apos;ve been shown and never serve it to you again. When you&apos;ve cleared the bank for a topic, fresh questions are written for you.</Q>
          <Q q="Who writes the questions? Are AI questions reliable?">Our bank mixes human-written questions, previous-year questions and AI-written questions. Each AI question is answered blind by a second AI, screened for safety and checked against UPSC standards; anything uncertain goes to a human reviewer. If you spot a mistake, tap <i>Report</i> — three independent reports pull a question until it&apos;s reviewed.</Q>
          <Q q="How does negative marking work?">Exactly like Prelims: +2 for a correct answer, −0.66 for a wrong one, 0 if skipped.</Q>
          <Q q="Can I practise from my own notes?">Yes, on a pass. Upload your notes or a chapter for a topic. We check it&apos;s really about that topic, then write questions only from it. Those questions stay private to you.</Q>
          <Q q="Is there a full-length mock?">Yes. Prelims: 100 questions in 2 hours (10 questions on the Free plan). Mains: a full 250-mark paper in 3 hours, with evaluation.</Q>
        </div>
      </Section>

      <Section title="Mains evaluation, notes and current affairs">
        <div className="space-y-2">
          <Q q="How are Mains answers evaluated?">Against a rubric keyed to the directive word: demand of the question, content depth, evidence, structure, conclusion and presentation. Marks are calculated from those scores by code, so they&apos;re consistent. You get strengths, improvements, missed dimensions and a model-answer outline. You can type answers or upload photos of handwritten pages.</Q>
          <Q q="Are the evaluation marks what UPSC would give?">They&apos;re indicative feedback to improve your writing, not a prediction of UPSC marks.</Q>
          <Q q="What notes do you provide?">Cornell-style notes for syllabus topics that expand where you&apos;re weak, and notes from your own uploads: upload a whole book, pick a chapter, choose 1–4 pages, and download a light PDF that includes key maps and diagrams.</Q>
          <Q q="Where does the current-affairs content come from?">From each day&apos;s newspaper, summarised in our own words for UPSC relevance, with static facts and exam angles. A daily quiz is built from the same stories.</Q>
        </div>
      </Section>

      <Section title="Privacy and account">
        <div className="space-y-2">
          <Q q="What do you do with my email and phone number?">Your email signs you in and is used for receipts and account messages. A mobile number is optional: we save it only if you tick the box to receive study updates and offers, and you can remove it any time in Profile. We never sell or share either.</Q>
          <Q q="Can I sign in with Google?">Yes — tap “Continue with Google”. It opens the same TamGam account as signing in with that email address by code, so you can use either.</Q>
          <Q q="I didn't get the sign-in code.">Codes arrive within a minute from no-reply@tamgam.in. Check Spam and Promotions, make sure the email is spelled right, and use “Resend code” after 30 seconds. Each code works for 10 minutes.</Q>
          <Q q="Can I download or delete my data?">Yes, from Profile: Export my data, or Delete my account. Read the <Link className="text-primary" href="/privacy/">Privacy Policy</Link> for details.</Q>
          <Q q="How do I contact you?">WhatsApp {WHATSAPP_DISPLAY} or email <a className="text-primary" href={`mailto:${EMAIL}`}>{EMAIL}</a>. Signed-in users can also use the Help page.</Q>
        </div>
      </Section>
    </PublicShell>
  );
}
