/** Plain text written by admins: "- " / "• " lines become bullet lists, everything else paragraphs. No HTML is
 *  ever interpreted, so admin content can't inject markup. */
export default function RichText({ text, className = "" }: { text?: string | null; className?: string }) {
  const blocks: ({ kind: "p"; text: string } | { kind: "ul"; items: string[] })[] = [];
  for (const raw of (text ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { blocks.push({ kind: "p", text: "" }); continue; }
    const m = /^[-•*]\s+(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];
    if (m) {
      if (last?.kind === "ul") last.items.push(m[1]);
      else blocks.push({ kind: "ul", items: [m[1]] });
    } else if (last?.kind === "p" && last.text) {
      last.text += " " + line;
    } else {
      blocks.push({ kind: "p", text: line });
    }
  }
  return (
    <div className={`space-y-2 leading-relaxed ${className}`}>
      {blocks.filter((b) => b.kind === "ul" || b.text).map((b, i) => b.kind === "ul"
        ? <ul key={i} className="list-disc space-y-1 pl-5">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
        : <p key={i}>{b.text}</p>)}
    </div>
  );
}
