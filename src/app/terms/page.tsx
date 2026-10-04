"use client";

import Link from "next/link";
import PublicShell, { Bullets, COMPANY, EMAIL, Section, Updated } from "@/components/PublicShell";

export default function Terms() {
  return (
    <PublicShell kicker="Terms & conditions" title="Terms of Service"
      intro={`These terms are an agreement between you and ${COMPANY} for using TamGam. By using TamGam you accept them.`}>
      <Updated />

      <Section title="1. The service">
        <p>TamGam is an online preparation platform for the UPSC Civil Services Examination: practice tests, full-length mocks, Mains answer evaluation, current-affairs digests, previous-year-question analysis, notes and analytics. TamGam is independent and is <b>not affiliated with, endorsed by or connected to the Union Public Service Commission</b> or any newspaper.</p>
      </Section>

      <Section title="2. Accounts">
        <Bullets items={[
          "You can explore TamGam as a guest. To use member services you must sign in with your own email address, verified by a code we email to it. Your email is your account identity — do not share it or use someone else's.",
          "One account per person. Keep access to your email secure; anyone who can read it can sign in to your account.",
          "You must give accurate information. You are responsible for activity on your account.",
          "If you are under 18, you may use TamGam only with a parent's or guardian's consent.",
        ]} />
      </Section>

      <Section title="3. Plans, payments and refunds">
        <Bullets items={[
          <>The <b>Free</b> plan includes Prelims tests with limits shown on the <Link className="text-primary" href="/plans/">Plans</Link> page. <b>Daily</b> and <b>Monthly Passes</b> unlock more services with the allowances shown there.</>,
          "Prices are in Indian Rupees and include applicable taxes unless stated otherwise. Payments are processed by Razorpay.",
          "Passes are valid for the period shown, do not auto-renew and cannot be transferred.",
          "We may change prices or plan contents for future purchases; an active pass keeps what it was sold with.",
          <>Refunds follow the <Link className="text-primary" href="/refunds/">Refund Policy</Link>. In particular, <b>a pass on which any service has been used is not refundable</b>; use the Free plan to evaluate TamGam first.</>,
        ]} />
      </Section>

      <Section title="4. Acceptable use">
        <p>You agree not to:</p>
        <Bullets items={[
          "share, resell or publish TamGam questions, explanations, notes or evaluations in bulk, or scrape the service;",
          "upload material you don't have the right to use, or material that is unlawful, obscene, hateful or harmful;",
          "attempt to break security, overload the service, reverse-engineer it or misuse other people's accounts;",
          "use automated tools to create accounts, receive codes or take tests;",
          "use TamGam to harass anyone or to impersonate any person or organisation.",
        ]} />
        <p>We may suspend or close accounts that break these rules.</p>
      </Section>

      <Section title="5. Your content">
        <p>You keep ownership of what you upload or write (answers, notes, files). You give {COMPANY} a limited licence to store and process it only to provide the service to you, including sending it to our AI and infrastructure providers as described in the <Link className="text-primary" href="/privacy/">Privacy Policy</Link>. Your uploads are private to you and are never used to build the shared question bank.</p>
      </Section>

      <Section title="6. AI-generated content">
        <p>Questions, explanations, notes and evaluations may be produced or assisted by AI and checked by automated quality and safety filters and by human review. They can still contain mistakes. Verify important facts against standard sources, and use the Report button when something looks wrong. Mains evaluations are indicative feedback, not a prediction of UPSC marks.</p>
      </Section>

      <Section title="7. No guarantee of results">
        <p>Scores, analytics and any chance estimate reflect your performance on TamGam only. They are <b>not</b> a prediction or guarantee of your result in any UPSC examination.</p>
      </Section>

      <Section title="8. Intellectual property">
        <p>The TamGam platform, design, software and original content (including questions, explanations, summaries and notes we create) belong to {COMPANY} or its licensors. Previous-year questions are reproduced from papers published by UPSC for educational purposes, with credit. Current-affairs cards are our own summaries; the original articles belong to their publishers.</p>
      </Section>

      <Section title="9. Availability and changes">
        <p>We work hard to keep TamGam available but don't guarantee it will be uninterrupted or error-free. We may add, change or remove features. We will notify you of material changes to these terms; continued use after that means you accept them.</p>
      </Section>

      <Section title="10. Liability">
        <p>To the extent permitted by law, TamGam is provided “as is”. {COMPANY}&apos;s total liability for any claim relating to the service is limited to the amount you paid us in the three months before the claim. We are not liable for indirect or consequential losses, including any examination outcome.</p>
      </Section>

      <Section title="11. Termination">
        <p>You can stop using TamGam and delete your account at any time. We may suspend or end access for breach of these terms or where required by law. Refunds on termination follow the Refund Policy.</p>
      </Section>

      <Section title="12. Law and disputes">
        <p>These terms are governed by the laws of India. Please contact us first — most issues are resolved quickly. Unresolved disputes are subject to the jurisdiction of the competent courts of India.</p>
      </Section>

      <Section title="13. Contact">
        <p><a className="font-semibold text-primary" href={`mailto:${EMAIL}`}>{EMAIL}</a> · see also the <Link className="text-primary" href="/contact/">Contact</Link> page.</p>
      </Section>
    </PublicShell>
  );
}
