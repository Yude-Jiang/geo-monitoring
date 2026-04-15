import type { TaskResult } from "../types";

/**
 * Frontend API client — all server calls go through here.
 * API keys never leave the server.
 */

export async function runTaskOnServer(
  platform: string,
  prompt: string,
  propositions: string[],
  fingerprints: string[]
): Promise<TaskResult> {
  const response = await fetch("/api/run-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform, prompt, propositions, fingerprints }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Network error" }));
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  return response.json();
}
