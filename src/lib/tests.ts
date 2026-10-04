"use client";

import { ApiError, BANK_EXHAUSTED, PLAN_REQUIRED, QUOTA, SIGN_IN_REQUIRED, api, apiWithStatus, sleep } from "./api";
import { todayIST } from "./labels";

export function attemptUrl(scope: string, testId: string) {
  return `/attempt/?scope=${scope}&test=${testId}`;
}

export function resultUrl(scope: string, attemptId: string) {
  return `/result/?scope=${scope}&attempt=${attemptId}`;
}

export type LaunchState =
  | { kind: "idle" }
  | { kind: "creating"; label: string }
  | { kind: "job"; label: string; progress: number; message: string }
  | { kind: "exhausted"; available: number; requested: number; retryPartial: () => void }
  | { kind: "error"; error: unknown };

type Job = { job_id: string; status: string; progress: number; message: string; test_id?: string; error?: string };
type Created = { test_id?: string; attempt_id?: string; job_id?: string; status?: string; existing?: boolean };

/**
 * Creates a test and navigates to it. Handles the three server answers:
 * 201 (bank had enough unseen questions) · 202 (fresh questions being generated → poll the job) ·
 * 409 bank-exhausted (offer a shorter test). Sign-in 403s open the email sign-in modal via the API client.
 */
export async function launch(scope: string, path: string, body: Record<string, unknown> | undefined,
                             label: string, onState: (s: LaunchState) => void, jobScope = scope) {
  onState({ kind: "creating", label });
  try {
    const { status, data } = await apiWithStatus<Created>(path, { method: "POST", json: body });
    if (status === 202 && data.job_id) {
      for (let i = 0; i < 600; i++) {
        const job = await api<Job>(`/api/v1/${jobScope}/jobs/${data.job_id}`);
        if (job.status === "DONE" && job.test_id) { window.location.href = attemptUrl(jobScope, job.test_id); return; }
        if (job.status === "FAILED") throw new ApiError(500, { title: "Couldn't prepare your test", detail: job.error });
        onState({ kind: "job", label, progress: job.progress, message: job.message });
        await sleep(1500);
      }
      throw new ApiError(504, { title: "Still preparing", detail: "Check History in a minute — your test will be there." });
    }
    if (data.existing && data.status && data.status !== "IN_PROGRESS" && data.attempt_id) {
      window.location.href = resultUrl(scope, data.attempt_id);
    } else if (data.test_id) {
      window.location.href = attemptUrl(scope, data.test_id);
    }
  } catch (e) {
    const err = e as ApiError;
    if (err.problem?.type === BANK_EXHAUSTED) {
      const available = Number(err.problem.available ?? 0);
      onState({
        kind: "exhausted", available, requested: Number(err.problem.requested ?? 0),
        retryPartial: () => {
          const partialPath = path.includes("?") ? `${path}&allow_partial=true` : `${path}?allow_partial=true`;
          const isMock = path.includes("/mocks/");
          launch(scope, isMock && !body ? partialPath : path, isMock && !body ? undefined : { ...(body ?? {}), allow_partial: true },
                 label, onState, jobScope);
        },
      });
      return;
    }
    const handled = [SIGN_IN_REQUIRED, PLAN_REQUIRED, QUOTA].includes(String(err.problem?.type));
    onState(handled ? { kind: "idle" } : { kind: "error", error: e });     // those open their own modals
  }
}

export const bankTest = (scope: string, body: Record<string, unknown>, onState: (s: LaunchState) => void) =>
  launch(scope, `/api/v1/${scope}/tests`, body, "Assembling your test", onState);

export const fullPrelimsMock = (onState: (s: LaunchState) => void) =>
  launch("mocks", "/api/v1/platform/mocks/prelims-full", undefined, "Building a 100-question Prelims mock", onState);

export const fullMainsMock = (paper: string, onState: (s: LaunchState) => void) =>
  launch("mocks", "/api/v1/platform/mocks/mains-full", { paper }, "Building a full Mains paper", onState);

export const pyqTest = (body: Record<string, unknown>, onState: (s: LaunchState) => void) =>
  launch("pyq", "/api/v1/pyq/tests", body, "Loading PYQs", onState);

export const dailyQuiz = (onState: (s: LaunchState) => void, date = todayIST()) =>
  launch("current_affairs", `/api/v1/current_affairs/daily/${date}/quiz`, undefined, "Loading today's quiz", onState);
