/** Upload limits — mirror backend/tamgam/common/limits.py so students see the message before uploading. */
const MB = 1024 * 1024;
export const SOURCE_MAX_PAGES = 30;
export const SOURCE_PDF_MAX_BYTES = 15 * MB;
export const SOURCE_TOTAL_MAX_BYTES = 40 * MB;
export const SOURCE_HINT = `One topic at a time: a PDF of up to ${SOURCE_MAX_PAGES} pages (max 15 MB), or up to ${SOURCE_MAX_PAGES} photos.`;
export const NOTES_TOO_LONG = `Notes are made from one topic at a time — upload up to ${SOURCE_MAX_PAGES} pages (a single chapter or topic handout). Split a book or long module into topics and upload just the one you want notes for.`;
const TOO_LONG = `Own-source tests work on one topic at a time — upload up to ${SOURCE_MAX_PAGES} pages (a single chapter or topic handout). Split a book or long module into topics and upload just the one you want to practise.`;

/** null when the files are fine; otherwise a message to show instead of uploading. */
export function sourceFilesProblem(files: File[], tooLong: string = TOO_LONG): string | null {
  if (files.length > SOURCE_MAX_PAGES) return `That's ${files.length} files. ${tooLong}`;
  const bigPdf = files.find((f) => (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) && f.size > SOURCE_PDF_MAX_BYTES);
  if (bigPdf) return `${bigPdf.name} is ${Math.round(bigPdf.size / MB)} MB — topic PDFs can be up to 15 MB. ${tooLong}`;
  const total = files.reduce((s, f) => s + f.size, 0);
  if (total > SOURCE_TOTAL_MAX_BYTES) return `These files add up to ${Math.round(total / MB)} MB — the limit is 40 MB. ${tooLong}`;
  return null;
}

/** Mains: handwritten pages per answer — 150 words → 3 pages; 200/250 words and case studies → 4. */
export const mainsPageLimit = (wordLimit?: number | null) => ((wordLimit ?? 150) <= 150 ? 3 : 4);
