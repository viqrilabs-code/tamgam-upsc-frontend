"use client";

import { useEffect, useState } from "react";
import { Download, FileUp, Layers, Target } from "lucide-react";
import AppShell from "@/components/AppShell";
import MaterialPicker, { type Material } from "@/components/MaterialPicker";
import { Button, Card, Chip, Empty, ErrorBox, Modal, PageHeader, Segmented, cx } from "@/components/ui";
import WaitingRoom from "@/components/WaitingRoom";
import { api, apiWithStatus, content, downloadFile, putSigned, sleep } from "@/lib/api";
import { useAsync, useSearch, useSession } from "@/lib/hooks";
import { fmtDate } from "@/lib/labels";
import type { Cornell, NoteStyle, NoteView, SyllabusNode } from "@/lib/types";

const STYLE_OPTIONS: { value: NoteStyle; label: string }[] = [
  { value: "detailed", label: "📚 Detailed" }, { value: "revision", label: "⚡ Revision" }];
const STYLE_HINT: Record<NoteStyle, string> = {
  detailed: "Comprehensive study note — every concept explained crisply with examples and comparison tables (4–12 pages).",
  revision: "Crisp recap for quick revision — cues, key facts and traps (1–4 pages).",
};

const PAPERS = ["GS1", "GS2", "GS3", "GS4", "PSIR"];
type DetectedTopic = { title: string; start_page: number; end_page: number; summary: string; words: number; suggested_pages: number;
  suggested_detailed_pages?: number };
type Upload = { upload_id: string; filename: string; status: string; pages?: number; files?: number; topics?: DetectedTopic[]; error?: string };

export default function Notes() {
  const session = useSession();
  const q = useSearch();
  const [paper, setPaper] = useState("GS3");
  const [view, setView] = useState<NoteView | null>(null);
  const [status, setStatus] = useState<string>("");
  const [err, setErr] = useState<unknown>();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [picker, setPicker] = useState<Upload | null>(null);
  const [topicStyle, setTopicStyle] = useState<NoteStyle>("detailed");

  const syllabus = useAsync(() => content<{ nodes: SyllabusNode[] }>(`syllabus/${paper}.json`), [paper]);
  const list = useAsync(() => api<{ items: { note_id: string; kind: string; title: string; status: string; topic_id?: string; updated_at: string; style?: NoteStyle }[];
    uploads: Upload[] }>("/api/v1/notes?limit=20"), []);

  async function openTopic(topic: string, style: NoteStyle = topicStyle) {
    setErr(undefined);
    setStatus("loading");
    try {
      for (let i = 0; i < 80; i++) {
        const { status: s, data } = await apiWithStatus<NoteView>(`/api/v1/notes/topics/${topic}?style=${style}`);
        if (s === 200) { setView(data); setStatus(""); return; }
        setStatus("generating");
        await sleep(3000);
      }
      setStatus("");
    } catch (e) { setErr(e); setStatus(""); }
  }

  async function openNote(id: string) {
    setErr(undefined);
    setStatus("building");
    try {
      for (let i = 0; i < 120; i++) {
        const n = await api<NoteView>(`/api/v1/notes/${id}`);
        if (n.cornell || n.status === "FAILED") { setView(n); setStatus(""); list.reload(); return; }
        await sleep(2500);
      }
    } catch (e) { setErr(e); setStatus(""); }
  }

  useEffect(() => {
    const t = q.get("topic");
    if (t) { setPaper(t.split(".")[0]); openTopic(t); }
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pollUpload(id: string) {
    for (let i = 0; i < 200; i++) {
      const u = await api<Upload>(`/api/v1/notes/uploads/${id}`);
      if (u.status === "TOPICS_READY") { setStatus(""); setPicker(u); return; }
      if (u.status === "FAILED") throw { problem: { title: "Couldn't read this file", detail: u.error } };
      await sleep(2000);
    }
  }

  async function upload(files: File[]) {
    setErr(undefined);
    try {
      const up = await api<{ upload_id: string; uploads: { upload_url: string; content_type: string }[] }>("/api/v1/notes/uploads", {
        method: "POST", json: { files: files.map((f) => ({ filename: f.name, content_type: f.type || "application/pdf", size: f.size })) } });
      setStatus("uploading");
      await Promise.all(up.uploads.map((u, i) => putSigned(u.upload_url, files[i], u.content_type)));
      setStatus("analyzing");
      await api(`/api/v1/notes/uploads/${up.upload_id}/analyze`, { method: "POST" });
      await pollUpload(up.upload_id);
    } catch (e) { setErr(e); setStatus(""); }
  }

  async function pickMaterial(m: Material) {
    setErr(undefined);
    try {
      setStatus("analyzing");
      const up = await api<Upload>("/api/v1/notes/uploads/from-material", { method: "POST", json: { material_id: m.material_id } });
      if (up.status === "TOPICS_READY") { setStatus(""); setPicker(up); return; }
      await api(`/api/v1/notes/uploads/${up.upload_id}/analyze`, { method: "POST" });
      await pollUpload(up.upload_id);
    } catch (e) { setErr(e); setStatus(""); }
  }

  async function build(u: Upload, topicIndex: number, pages: number | null, style: NoteStyle) {
    setPicker(null);
    setErr(undefined);
    try {
      const { data } = await apiWithStatus<{ note_id: string }>("/api/v1/notes", {
        method: "POST", json: { source: u.upload_id, topic_index: topicIndex, pages, style } });
      await openNote(data.note_id);
    } catch (e) { setErr(e); setStatus(""); }
  }

  async function pdf() {
    if (!view) return;
    setPdfBusy(true);
    try {
      for (let i = 0; i < 40; i++) {
        const { status: s, data } = await apiWithStatus<{ url?: string }>(`/api/v1/notes/${view.note_id}/pdf`);
        if (s === 200 && data.url) {
          const name = `TamGam - ${(view.cornell?.title ?? "note").replace(/[^\w\s-]/g, "_").slice(0, 60)}.pdf`;
          await downloadFile(data.url, name);
          return;
        }
        await sleep(1500);
      }
      throw new Error("The PDF is taking longer than usual. Please try the download again in a minute.");
    } catch (e) { setErr(e); } finally { setPdfBusy(false); }
  }

  if (!session) return null;
  const leaves = (syllabus.data?.nodes ?? []).filter((n) => n.leaf);
  const busyLabel = { generating: "Generating the topic note", building: "Writing your note and picking diagrams",
    uploading: "Uploading", analyzing: "Finding the chapters in your file", loading: "Opening" }[status];

  return (
    <AppShell wide guestPreview={{ emoji: "📘", title: "Cornell notes, your way", points: [
      "Syllabus topic notes that expand where you're weak", "Upload a whole book — pick a chapter — get a 1–4 page note",
      "Maps and diagrams cut from your pages into the note", "Download as a light PDF"] }}>
      <PageHeader kicker="Notes" title="Cornell notes, your way"
        sub="Topic notes expand where you're weak and collapse where you're strong. Upload a whole book or coaching module — we find its chapters, you pick one, and get a 1–4 page note with the key maps and diagrams, as a lite PDF." />

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card sticker className="bg-saffron-soft">
            <div className="flex items-center gap-2 font-display font-bold"><FileUp size={18} /> Your material → notes</div>
            <p className="mt-1 text-xs text-ink-2">PDF, JPG, PNG or HEIC · several files at once (e.g. photographed pages) · up to 50 MB / 300 pages. Multi-chapter files are fine. Private to you. Uses one upload-note allowance (Daily or Monthly Pass).</p>
            <div className="mt-3"><MaterialPicker onPick={pickMaterial} disabled={!!status} /></div>
            <label className={cx("mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/40 bg-surface px-3 py-4 text-sm font-semibold", status && "pointer-events-none opacity-50")}>
              {status ? "Working…" : "Upload new files (several OK)"}
              <input type="file" multiple disabled={!!status} accept="application/pdf,image/jpeg,image/png,image/heic" className="hidden"
                onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length) upload(fs); e.target.value = ""; }} />
            </label>
          </Card>

          <Card>
            <div className="mb-3 font-display font-bold">Syllabus topic notes</div>
            <Segmented value={paper} onChange={setPaper} options={PAPERS.map((p) => ({ value: p, label: p }))} />
            <div className="mt-3"><Segmented value={topicStyle} onChange={setTopicStyle} options={STYLE_OPTIONS} /></div>
            <p className="mt-1 text-xs text-muted">{STYLE_HINT[topicStyle]}</p>
            <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
              {leaves.map((t) => (
                <li key={t.node_id}>
                  <button onClick={() => openTopic(t.node_id)}
                    className={cx("w-full rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-surface-2",
                      view?.topic_id === t.node_id && "bg-primary-soft text-primary")}>
                    {t.name}{t.pyq_weight > 0 && <span className="ml-1 text-xs text-muted">· ~{t.pyq_weight} Q/yr</span>}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="mb-2 font-display font-bold">Your notes</div>
            <ul className="space-y-1">
              {(list.data?.items ?? []).map((n) => (
                <li key={n.note_id}>
                  <button onClick={() => openNote(n.note_id)} className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-sm hover:bg-surface-2">
                    <span className="truncate">{n.title ?? n.topic_id}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted">{n.style === "detailed" ? "📚" : "⚡"} {n.kind === "UPLOAD" ? "📄" : "📘"} {fmtDate(n.updated_at)}</span>
                  </button>
                </li>
              ))}
              {list.data?.items.length === 0 && <li className="text-sm text-muted">No notes yet.</li>}
            </ul>
          </Card>
        </div>

        <div>
          {err ? <div className="mb-4"><ErrorBox error={err} /></div> : null}
          {status ? <Card className="grid place-items-center py-8"><WaitingRoom title={busyLabel ?? "Working"}
              message={status === "building" ? "Reading your chapter, writing the note and cropping key diagrams…" : status === "generating" ? "Writing a fresh syllabus note — about a minute…" : status === "analyzing" ? "Finding the chapters in your file…" : undefined}
              progress={{ uploading: 15, analyzing: 40, generating: null, building: null, loading: null }[status] ?? null} /></Card>
            : view?.cornell ? <CornellView view={view} onPdf={pdf} pdfBusy={pdfBusy} />
            : view?.status === "FAILED" ? <ErrorBox error={{ problem: { title: "Couldn't build this note", detail: view.error } }} />
            : <Empty icon="📘" title="Pick a topic or upload your material">Seeded topics: Protected Areas & Wetlands, Federalism & Local Government, Modern India.</Empty>}
        </div>
      </div>

      <TopicPicker upload={picker} onClose={() => setPicker(null)} onPick={build} />
    </AppShell>
  );
}

function TopicPicker({ upload, onClose, onPick }: { upload: Upload | null; onClose: () => void;
  onPick: (u: Upload, i: number, pages: number | null, style: NoteStyle) => void }) {
  const [sel, setSel] = useState(0);
  const [pages, setPages] = useState<string>("auto");
  const [style, setStyle] = useState<NoteStyle>("detailed");
  useEffect(() => { setSel(0); setPages("auto"); }, [upload]);
  useEffect(() => { setPages("auto"); }, [style]);
  if (!upload) return null;
  const topics = upload.topics ?? [];
  const t = topics[sel];
  return (
    <Modal open onClose={onClose} title={topics.length > 1 ? `We found ${topics.length} topics` : "Ready to write your note"}>
      <p className="text-sm text-ink-2"><b>{upload.filename}</b> · {upload.pages} pages. One note covers one topic — pick the one you need.</p>
      <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
        {topics.map((tp, i) => (
          <li key={i}>
            <button onClick={() => setSel(i)} className={cx("w-full rounded-2xl border-2 px-3 py-2 text-left text-sm",
              sel === i ? "border-primary bg-primary-soft" : "border-line hover:border-ink")}>
              <div className="font-semibold">{tp.title}</div>
              <div className="text-xs text-muted">pages {tp.start_page}–{tp.end_page} · ~{tp.words} words · suggested {tp.suggested_pages} page{tp.suggested_pages > 1 ? "s" : ""}</div>
              {tp.summary && <div className="mt-0.5 text-xs text-ink-2">{tp.summary}</div>}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Note type</span>
        <Segmented value={style} onChange={setStyle} options={STYLE_OPTIONS} />
      </div>
      <p className="mt-1 text-xs text-muted">{STYLE_HINT[style]}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold"><Layers size={14} className="mr-1 inline" />Length</span>
        <Segmented value={pages} onChange={setPages} options={[
          { value: "auto", label: `Auto (${style === "detailed" ? (t?.suggested_detailed_pages ?? Math.max(4, Math.min(12, 2 * Math.ceil((t?.words ?? 0) / 1400)))) : (t?.suggested_pages ?? 1)})` },
          ...(style === "detailed" ? ["4", "6", "8", "10", "12"] : ["1", "2", "3", "4"]).map((p) => ({ value: p, label: `${p} pg` }))]} />
      </div>
      <p className="mt-2 text-xs text-muted">Maps, diagrams and tables worth keeping are cut from your pages into the note.{style === "detailed" ? " Detailed notes take about a minute." : ""}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onPick(upload, sel, pages === "auto" ? null : Number(pages), style)}>Make notes for this topic</Button>
      </div>
    </Modal>
  );
}

/** Inline highlights from the note writer: ==fact== (Prelims fact), **term** (key term), !!fact!! (often tested). */
function Marked({ text }: { text: string }) {
  const parts = text.split(/(==[^=]+==|\*\*[^*]+\*\*|!![^!]+!!)/g);
  return (
    <>
      {parts.map((p, i) => p.startsWith("==") ? <mark key={i} className="rounded bg-[#fbe38e] px-0.5 text-ink dark:bg-[#6b5a12] dark:text-ink">{p.slice(2, -2)}</mark>
        : p.startsWith("**") ? <b key={i} className="rounded bg-green-soft px-0.5">{p.slice(2, -2)}</b>
          : p.startsWith("!!") ? <b key={i} className="text-danger">{p.slice(2, -2)}</b>
            : <span key={i}>{p}</span>)}
    </>
  );
}

function CornellView({ view, onPdf, pdfBusy }: { view: NoteView; onPdf: () => void; pdfBusy: boolean }) {
  const c = view.cornell as Cornell;
  const [showAll, setShowAll] = useState(false);
  const figs = c.figures ?? [];
  const key = (s: string) => s.trim().toLowerCase();
  const figsFor = (heading: string) => figs.filter((f) => key(f.branch_label ?? "") === key(heading));
  const unplaced = figs.filter((f) => !c.sections.some((s) => key(s.heading) === key(f.branch_label ?? "")));
  return (
    <div className="note-watermark pop overflow-hidden rounded-3xl bg-surface sticker">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line bg-surface-2 px-6 py-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-saffron">
            {view.kind === "TOPIC" ? view.topic_name : `From your upload${view.source_pages ? ` · pages ${view.source_pages[0]}–${view.source_pages[1]}` : ""}`}
          </div>
          <h2 className="font-display text-2xl font-extrabold">{c.title}</h2>
          <div className="text-xs text-muted">{view.style === "detailed" ? "📚 Detailed" : "⚡ Revision"} · {view.pages ?? 2}-page note · {figs.length} figure{figs.length === 1 ? "" : "s"} · {view.generated_by}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAll(!showAll)}>{showAll ? "Personalised view" : "Expand all"}</Button>
          <Button onClick={onPdf} loading={pdfBusy}><Download size={16} /> Download PDF</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b-2 border-line px-6 py-2 text-xs text-muted">
        <span><b className="text-saffron">P</b> Prelims cue</span><span><b className="text-primary">M</b> Mains cue</span>
        <span><Marked text="==Prelims fact==" /></span><span><Marked text="**key term**" /></span><span><Marked text="!!often tested!!" /></span>
        <span className="ml-auto hidden md:inline">Cover the notes column and recall from the cue.</span>
      </div>

      <div className="space-y-5 p-4 md:p-6">
        {c.pyq_strategy?.length > 0 && (
          <div className="rounded-2xl border-2 border-danger/40 bg-danger-soft/50 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-danger">How UPSC asks this · from PYQ analysis</div>
            <ul className="mt-2 space-y-1 text-sm">{c.pyq_strategy.map((s, i) => <li key={i} className="flex gap-2"><span className="text-danger">▸</span><span><Marked text={s} /></span></li>)}</ul>
          </div>
        )}

        {c.sections.map((sec) => {
          const hidden = (sec.collapsed || sec.condensed) && !showAll;
          return (
            <section key={sec.id} className={cx("overflow-hidden rounded-2xl border-2", sec.focus ? "border-saffron" : "border-line")}>
              <div className={cx("flex flex-wrap items-center gap-2 border-l-4 px-4 py-2 font-display font-bold", sec.focus ? "border-saffron bg-saffron-soft" : "border-primary bg-primary-soft")}>
                {sec.heading}
                {sec.focus && <Chip tone="saffron"><Target size={11} /> focus</Chip>}
                {sec.collapsed && !showAll && <Chip tone="green">you&apos;re strong here</Chip>}
                {sec.condensed && !sec.collapsed && !showAll && <Chip>condensed</Chip>}
              </div>
              {hidden ? (
                <button onClick={() => setShowAll(true)} className="block w-full px-4 py-2 text-left text-sm text-ink-2 hover:bg-surface-2">
                  {sec.rows.map((r) => r.cue).join(" · ")} <span className="font-semibold text-primary">— show notes</span>
                </button>
              ) : (
                <>
                  <div className="divide-y divide-line">
                    {sec.rows.map((r, i) => (
                      <div key={i} className={cx("grid gap-x-4 gap-y-1 px-4 py-2.5 md:grid-cols-[minmax(150px,28%)_1fr]", r.pinned && "bg-danger-soft/60")}>
                        <div className="text-sm md:border-r-2 md:border-line md:pr-3">
                          <span className={cx("mr-1.5 inline-grid h-5 w-5 place-items-center rounded text-[10px] font-bold text-white", r.tag === "P" ? "bg-saffron" : "bg-primary")}>{r.tag}</span>
                          <span className="font-semibold"><Marked text={r.cue} /></span>
                          {r.pyq?.length > 0 && <div className="mt-1"><Chip tone="saffron">PYQ {r.pyq.join(", ")}</Chip></div>}
                          {r.pinned && <div className="mt-1 text-[10px] font-bold uppercase text-danger">You missed this PYQ</div>}
                        </div>
                        <ul className="space-y-1 text-sm text-ink-2">
                          {r.points.map((p, j) => <li key={j} className="flex gap-2"><span className="text-primary">•</span><span><Marked text={p} /></span></li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                  {sec.tables?.map((tb, ti) => (
                    <div key={ti} className="px-4 pt-3">
                      <div className="overflow-x-auto rounded-xl border border-line">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-ink text-bg dark:bg-surface-2 dark:text-ink"><tr>{tb.columns.map((c) => <th key={c} className="px-3 py-1.5 font-semibold">{c}</th>)}</tr></thead>
                          <tbody>{tb.rows.map((r, ri) => <tr key={ri} className={ri % 2 ? "bg-surface-2" : ""}>{r.map((x, ci) => <td key={ci} className="px-3 py-1.5 align-top text-ink-2"><Marked text={x} /></td>)}</tr>)}</tbody>
                        </table>
                      </div>
                      {tb.caption && <div className="mt-1 text-xs italic text-muted">{tb.caption}</div>}
                    </div>
                  ))}
                  <div className="px-4">{figsFor(sec.heading).map((f) => <Figure key={f.url} f={f} />)}</div>
                  {(sec.callout || sec.recall) && (
                    <div className="space-y-2 p-4 pt-3">
                      {sec.callout && <div className="rounded-xl border-l-4 border-primary bg-primary-soft px-3 py-2 text-sm"><b className="text-xs uppercase tracking-wider text-primary">Mains linkage · </b><Marked text={sec.callout} /></div>}
                      {sec.recall && <div className="rounded-xl border-l-4 border-saffron bg-saffron-soft px-3 py-2 text-sm"><b className="text-xs text-saffron">Recall in 10s · </b><Marked text={sec.recall} /></div>}
                    </div>
                  )}
                </>
              )}
            </section>
          );
        })}
        {unplaced.map((f) => <Figure key={f.url} f={f} />)}

        {c.questions?.map((q, i) => (
          <div key={i} className="rounded-2xl border-2 border-danger/50 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-danger">{q.label}</div>
            <p className="mt-1 text-sm"><Marked text={q.question} /></p>
            <p className="mt-2 text-sm font-semibold text-green"><Marked text={q.answer} /></p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 border-t-2 border-line p-5 md:grid-cols-3">
        <div className="md:col-span-3"><div className="text-xs font-bold uppercase tracking-wider text-muted">Summary</div><p className="mt-1"><Marked text={c.summary} /></p></div>
        <div className="rounded-2xl bg-primary-soft p-3 text-sm md:col-span-1"><b className="text-primary">Mains angle · </b><Marked text={c.mains_angle} /></div>
        <div className="rounded-2xl bg-danger-soft p-3 text-sm md:col-span-2"><b className="text-danger">Prelims traps · </b>{c.prelims_traps.join(" · ") || "—"}</div>
      </div>
      <div className="border-t-2 border-line px-5 py-2 text-right text-xs text-muted">
        TamGam UPSC · <a href="https://tamgam.in" target="_blank" rel="noreferrer" className="font-semibold text-primary">https://tamgam.in</a>
      </div>
    </div>
  );
}

function Figure({ f }: { f: { url: string; caption: string; kind: string; page: number } }) {
  return (
    <figure className="mt-3 overflow-hidden rounded-2xl border border-line bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={f.url} alt={f.caption} className="max-h-80 w-full object-contain" loading="lazy" />
      <figcaption className="border-t border-line px-3 py-1.5 text-xs text-muted">{f.kind} · {f.caption} · source p.{f.page}</figcaption>
    </figure>
  );
}
