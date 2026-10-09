import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cx } from "./ui";

/** Shown to Free-plan users: their tests mix real PYQs with our ready question bank; paid plans adapt. */
export default function FreeMixNote({ className }: { className?: string }) {
  return (
    <p className={cx("flex items-start gap-2 rounded-2xl bg-saffron-soft p-3 text-xs text-ink-2", className)}>
      <Sparkles size={14} className="mt-0.5 shrink-0 text-saffron" />
      <span>Free tests mix real UPSC PYQs with questions from our ready question bank. For more advanced questions that adapt to
        your preparation, <Link href="/plans/" className="font-semibold text-primary underline">pick a paid plan</Link> — it lets
        us learn your preparation level and frame fresh questions around your weak areas.</span>
    </p>
  );
}
