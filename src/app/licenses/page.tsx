"use client";

import PublicShell, { COMPANY, Section, Updated } from "@/components/PublicShell";

const SOFTWARE: [string, string, string][] = [
  ["Next.js", "MIT", "Web framework"], ["React / React DOM", "MIT", "User interface"],
  ["Tailwind CSS", "MIT", "Styling"], ["Lucide icons", "ISC", "Icons"],
  ["FastAPI", "MIT", "API framework"], ["Starlette", "BSD-3-Clause", "Web toolkit"],
  ["Uvicorn", "BSD-3-Clause", "Application server"], ["Pydantic / pydantic-settings", "MIT", "Data validation and settings"],
  ["HTTPX", "BSD-3-Clause", "HTTP client"], ["OpenAI Python SDK", "Apache-2.0", "AI API client"],
  ["Jinja2", "BSD-3-Clause", "Prompt templates"], ["pypdf", "BSD-3-Clause", "PDF text extraction"],
  ["pypdfium2 (PDFium)", "Apache-2.0 / BSD-3-Clause", "PDF page rendering"], ["Pillow", "MIT-CMU (HPND)", "Image processing"],
  ["ReportLab", "BSD", "PDF note generation"], ["Google Cloud client libraries, Firebase Admin", "Apache-2.0", "Cloud services"],
];

const FONTS: [string, string][] = [
  ["Bricolage Grotesque", "SIL Open Font License 1.1"], ["Inter", "SIL Open Font License 1.1"],
  ["JetBrains Mono", "SIL Open Font License 1.1"],
];

export default function Licenses() {
  return (
    <PublicShell kicker="Licenses" title="Credits & licenses" intro={`TamGam is built by ${COMPANY} on excellent open-source work. Thank you to every maintainer below.`}>
      <Updated />
      <Section title="Open-source software">
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase text-muted"><tr><th className="p-3">Component</th><th className="p-3">License</th><th className="p-3">Used for</th></tr></thead>
            <tbody className="divide-y divide-line">
              {SOFTWARE.map(([n, l, u]) => <tr key={n}><td className="p-3 font-semibold text-ink">{n}</td><td className="p-3 font-mono text-xs">{l}</td><td className="p-3">{u}</td></tr>)}
            </tbody>
          </table>
        </div>
        <p>Full license texts ship with each package and are available from the respective projects. Transitive dependencies carry their own compatible licenses.</p>
      </Section>
      <Section title="Fonts">
        <ul className="list-disc space-y-1 pl-5">{FONTS.map(([n, l]) => <li key={n}><b>{n}</b> — {l}, via Google Fonts</li>)}</ul>
      </Section>
      <Section title="Services">
        <p>AI features use the OpenAI API. Payments are processed by Razorpay and the platform runs on Google Cloud. These are used under their commercial terms of service.</p>
      </Section>
      <Section title="Content">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><b>Previous-year questions</b> are reproduced from question papers published by the Union Public Service Commission, for educational purposes and with credit. Items marked “sample” are TamGam&apos;s own practice questions written in the PYQ format.</li>
          <li><b>Current-affairs cards</b> are original summaries written by TamGam from licensed newspaper editions. Article text is not reproduced, and copyright in the original articles remains with their publishers.</li>
          <li><b>Questions, explanations, notes and the TamGam brand</b> are © {COMPANY}. All rights reserved.</li>
        </ul>
      </Section>
    </PublicShell>
  );
}
