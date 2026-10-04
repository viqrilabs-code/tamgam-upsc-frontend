export type Question = {
  qid: string;
  stage: "PRELIMS" | "MAINS";
  format: string;
  bucket?: string;
  topic_ids: string[];
  stem: string;
  statements?: string[];
  tail?: string | null;      // official closing line of a PYQ ("How many of the above are correct?")
  options?: string[];
  word_limit?: number;
  marks?: number;
  directive?: string;
  sample?: boolean;
  pyq_ref?: { year: number; paper: string; qno?: number };
  paper?: string;
};

export type Answer = { choice?: number | null; time_ms?: number; flagged?: boolean; confidence?: "LOW" | "MEDIUM" | "HIGH" | null };

export type TestView = {
  test_id: string;
  attempt_id: string;
  scope: string;
  stage: "PRELIMS" | "MAINS";
  mode: string;
  status: string;
  title?: string;
  questions: Question[];
  answers: Record<string, Answer>;
  mains_answers: Record<string, { text?: string; image_paths?: string[]; source?: "typed" | "photos" | "pdf" | null;
    pdf_pages?: number[] | null; transcript_preview?: string | null }>;
  mains_pdf?: MainsPdfState | null;
  time_limit_s: number;
  expires_at: string;
  started_at: string;
  paused_at?: string | null;
};

export type Created = { test_id: string; attempt_id: string; scope: string };

export type RowStat = { key: string; total: number; attempted: number; correct: number; accuracy: number | null; name?: string };

export type Explanation = {
  qid: string; stem: string; statements: string[]; tail?: string | null; options: string[]; answer_key: number; explanation: string;
  elimination_hint?: string; format: string; bucket: string; topic_ids: string[]; topic_name?: string;
  your_choice: number | null; correct: boolean | null; flagged?: boolean; sample?: boolean;
  pyq_ref?: { year: number; paper: string };
};

export type MainsEval = {
  marks: number; max_marks: number; dims: Record<string, number>; comments: Record<string, string>;
  strengths: string[]; improvements: string[]; model_outline: string[]; missed_dimensions: string[];
  doubtful_claims: string[]; confidence: number; model: string; dev_heuristic?: boolean; word_count: number;
};

export type Result = {
  attempt_id: string; test_id: string; scope: string; stage: string; mode: string; status: string; title?: string;
  submitted_at?: string; started_at: string;
  score?: number; max_score?: number; accuracy?: number; attempted?: number; correct?: number; wrong?: number; n?: number;
  per_topic?: RowStat[]; per_format?: RowStat[]; per_bucket?: RowStat[]; explanations?: Explanation[];
  answers?: { qid: string; stem: string; max_marks: number; word_limit: number; answered: boolean; status: string;
    evaluation: MainsEval | null; your_text?: string; transcript?: string; model_outline?: string[] }[];
  marks?: number; max_marks?: number; evaluation_eta?: string; eval_mode?: string;
};

export type Attempt = {
  attempt_id: string; test_id: string; scope: string; paper: string; stage: string; mode: string; status: string;
  score?: number; max_score?: number; accuracy?: number; n?: number; started_at: string; submitted_at?: string; title?: string;
};

export type CACard = {
  id: string; headline: string; url: string; published_at?: string; summary: string; gs_tags: string[]; facts: string[];
  mains_angle?: string; prelims_angle?: string; linked_topics: string[]; linked_pyq?: number[]; date: string; demo?: boolean;
  source?: string; page?: number; importance?: number;
};

export type SyllabusNode = { node_id: string; parent: string | null; name: string; stage: string; pyq_weight: number;
  study_hours: number; leaf: boolean; children: string[] };

export type CornellRow = { cue: string; tag: "P" | "M"; points: string[]; pyq: number[]; pinned?: boolean };
export type NoteTable = { caption: string; columns: string[]; rows: string[][] };
export type CornellSection = { id: string; heading: string; weight?: number; rows: CornellRow[]; tables?: NoteTable[];
  callout: string; recall: string;
  focus?: boolean; collapsed?: boolean; condensed?: boolean };
export type Cornell = {
  title: string;
  figures?: { url: string; caption: string; kind: string; page: number; branch_label?: string }[];
  pyq_strategy: string[];
  sections: CornellSection[];
  questions: { label: string; question: string; answer: string }[];
  summary: string; mains_angle: string; prelims_traps: string[];
};

export type NoteStyle = "revision" | "detailed";
export type NoteView = {
  note_id: string; kind: "TOPIC" | "UPLOAD"; status?: string; title?: string; topic_id?: string; topic_name?: string;
  version?: number; generated_by?: string; cornell?: Cornell; style?: NoteStyle; error?: string; pages?: number; source_pages?: [number, number];
};

export type MainsPdfState = { upload_id: string; status: "QUEUED" | "PROCESSING" | "DONE" | "FAILED"; progress: number;
  message?: string; pages?: number; assignments: Record<string, { qno: number; pages: number[]; words: number }>;
  unassigned_pages: number[]; error?: string | null };
