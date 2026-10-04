"use client";

import type { LaunchState } from "@/lib/tests";
import Link from "next/link";
import { Button, ErrorBox, Modal } from "./ui";
import WaitingRoom from "./WaitingRoom";

/** Progress / bank-exhausted / error UI for test launches. */
export default function LaunchOverlay({ state, onClose }: { state: LaunchState; onClose: () => void }) {
  if (state.kind === "idle") return null;
  if (state.kind === "creating" || state.kind === "job") {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4">
        <div className="pop w-full max-w-xl rounded-3xl bg-surface p-6 sticker">
          <WaitingRoom title={state.label}
            message={state.kind === "job" ? state.message : "Picking questions you haven't seen yet…"}
            progress={state.kind === "job" ? state.progress : null} compact />
          {state.kind === "job" && (
            <p className="mt-4 text-xs text-muted">
              You&apos;ve cleared the bank for this selection, so fresh questions are being written and checked for quality.
              You can leave this page — your test keeps building and appears under <b>Live test</b> when it&apos;s ready.{" "}
              <Link href="/dashboard/" className="font-semibold text-primary">Go to Home</Link>
            </p>
          )}
        </div>
      </div>
    );
  }
  if (state.kind === "exhausted") {
    return (
      <Modal open onClose={onClose} title="You've seen every matching question 🏁">
        <p className="text-sm text-ink-2">
          We never repeat a question you&apos;ve already been asked. Only <b>{state.available}</b> unseen question(s) are left
          for this selection, and fresh AI generation isn&apos;t available right now.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Pick something else</Button>
          {state.available > 0 && <Button onClick={state.retryPartial}>Take {state.available} questions</Button>}
        </div>
      </Modal>
    );
  }
  return (
    <Modal open onClose={onClose} title="Something went wrong">
      <ErrorBox error={state.error} />
      <div className="mt-4 flex justify-end"><Button variant="outline" onClick={onClose}>Close</Button></div>
    </Modal>
  );
}
