"use client";

import PublicShell, { Bullets, COMPANY, EMAIL, Section, Updated } from "@/components/PublicShell";

export default function Privacy() {
  return (
    <PublicShell kicker="Privacy policy" title="Your data, explained"
      intro={`How ${COMPANY} ("we") collects, uses and protects personal data on TamGam, in line with India's Digital Personal Data Protection Act, 2023 (DPDP Act).`}>
      <Updated />

      <Section title="1. What we collect">
        <Bullets items={[
          <><b>Name and avatar</b> you choose when you start.</>,
          <><b>Email address</b> when you sign in. It identifies your account (we also keep a one-way hash of it) and is used to send sign-in codes, receipts and important account messages. Sign-in codes are delivered by Brevo. If you choose <b>Continue with Google</b>, Google shares your name and verified email address with us — we don&apos;t receive your Google password, contacts or any other Google data.</>,
          <><b>Mobile number (optional)</b>, only if you choose to give it and tick the box to receive study updates and offers. You can remove it any time in Profile, which also withdraws that consent.</>,
          <><b>Learning data:</b> tests taken, answers, time per question, confidence marks, Mains answers (typed text or photos of handwritten pages), scores, evaluations, notes and analytics derived from them.</>,
          <><b>Files you upload</b> (study material for notes or tests) and text extracted from them.</>,
          <><b>Payment records:</b> plan, amount, order and payment ids and status. Card, UPI and bank details are handled by Razorpay and never reach us.</>,
          <><b>Support messages</b> you send us, and <b>technical data</b> (IP address, browser type, request logs) used for security and reliability.</>,
          <>Profile details you add, such as target year, attempt number and category (used only for the cutoff model).</>,
        ]} />
      </Section>

      <Section title="2. Why we use it (purposes)">
        <Bullets items={[
          "To run the service: sign-in, tests, evaluations, notes, current affairs, analytics and your history.",
          "To personalise practice: weak-topic emphasis in notes, adaptive tests, recommendations.",
          "To process payments and grant passes, and to handle refunds and complaints.",
          "To keep the platform safe: abuse prevention, rate limits, fraud checks, content-safety screening.",
          "To improve question quality, using reports and aggregated, de-identified statistics.",
        ]} />
        <p>We process personal data on the basis of your consent, given when you start using TamGam, and for the legitimate uses permitted by the DPDP Act. We do <b>not</b> sell personal data and do not use it for third-party advertising.</p>
      </Section>

      <Section title="3. Who processes data for us">
        <p>We use a small number of service providers (data processors), each bound by contract to use data only to provide their service:</p>
        <Bullets items={[
          <><b>Google Cloud</b> — hosting, database (Mumbai, India region) and file storage (United States region).</>,
          <><b>OpenAI</b> — AI generation of questions and notes, evaluation of Mains answers, reading uploaded files and content-safety checks. Your answers and uploaded material are sent for these purposes. Under OpenAI&apos;s API terms, data sent through the API is not used to train their models.</>,
          <><b>Razorpay</b> — payment processing (receives payment details you enter in its checkout).</>,
        ]} />
        <p>Some of these providers process data outside India. We transfer data only as permitted under the DPDP Act and the rules notified under it.</p>
      </Section>

      <Section title="4. How long we keep data">
        <Bullets items={[
          "Account and learning history: while your account is active. Delete it any time from Profile → Delete my account.",
          "Files uploaded for notes or tests: automatically deleted 90 days after upload. Text extracted from them: deleted after 180 days without use.",
          "AI request and response logs (used for quality and safety audits): up to 12 months.",
          "Payment and invoice records: as long as tax and accounting law requires (typically 8 years).",
          "After you delete your account, personal data is erased within 30 days. Aggregated statistics that can no longer identify you may be kept.",
        ]} />
      </Section>

      <Section title="5. Your rights">
        <Bullets items={[
          <><b>Access and portability:</b> download everything we hold from Profile → Export my data.</>,
          <><b>Correction:</b> edit your profile, or ask us to correct anything else.</>,
          <><b>Erasure:</b> Profile → Delete my account, or email us.</>,
          <><b>Withdraw consent:</b> stop using TamGam and delete your account. Withdrawal does not affect processing already done.</>,
          <><b>Grievance redressal:</b> write to the Grievance Officer at {EMAIL} (subject “Grievance”). If you are not satisfied, you may approach the Data Protection Board of India.</>,
          <><b>Nominate</b> a person to exercise your rights in case of death or incapacity, by writing to us.</>,
        ]} />
      </Section>

      <Section title="6. Children">
        <p>TamGam is meant for adults preparing for the Civil Services Examination. If you are under 18, use TamGam only with the verifiable consent of a parent or lawful guardian, as the DPDP Act requires. We do not track, profile or show targeted advertising to children.</p>
      </Section>

      <Section title="7. Security">
        <p>Data is encrypted in transit (HTTPS) and at rest by our cloud provider. Access is limited to people who need it and is logged. Account ids are derived from one-way hashes, and uploaded files are private and served only through short-lived links. No system is perfectly secure; if a breach affects you, we will notify you and the Data Protection Board as the law requires.</p>
      </Section>

      <Section title="8. Cookies and local storage">
        <p>We don&apos;t use advertising cookies. Your browser&apos;s local storage keeps your sign-in session and theme preference; clearing it signs you out.</p>
      </Section>

      <Section title="9. Changes and contact">
        <p>We will post changes on this page and, for material changes, notify you in the app. Questions: <a className="font-semibold text-primary" href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p>
      </Section>
    </PublicShell>
  );
}
