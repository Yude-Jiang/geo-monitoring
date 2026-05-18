import type { Observation, PromptStrategy } from "../types";

const TOKEN_KEY = "geo_monitoring_token";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  const base: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  if (token) base["Authorization"] = `Bearer ${token}`;
  return base;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers as Record<string, string> || {}) },
  });

  // Check Content-Type to avoid trying to parse HTML/octet-stream as JSON
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let errMsg = `Server error: ${res.status}`;
    if (ct.includes("application/json")) {
      const err = await res.json();
      errMsg = err.error || errMsg;
    }
    throw new Error(errMsg);
  }
  if (!ct.includes("application/json")) {
    throw new Error(`Unexpected response type: ${ct}`);
  }
  return res.json();
}

// ─── Observations ────────────────────────────────────────────────────────

export async function fetchObservations(): Promise<Observation[]> {
  return request<Observation[]>("/api/observations");
}

export async function fetchObservationsByCampaign(campaignId: string): Promise<Observation[]> {
  return request<Observation[]>(`/api/observations?campaign_id=${encodeURIComponent(campaignId)}`);
}

export async function pollObservations(since: string): Promise<Observation[]> {
  return request<Observation[]>(`/api/observations/poll?since=${encodeURIComponent(since)}`);
}

export async function deleteObs(id: string): Promise<void> {
  await request(`/api/observations/${id}`, { method: "DELETE" });
}

// ─── Campaigns ───────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description: string;
  target_visibility: number;
  created_at: string;
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  return request<Campaign[]>("/api/campaigns");
}

export async function createCampaign(name: string, description: string, targetVisibility?: number): Promise<Campaign> {
  return request<Campaign>("/api/campaigns", {
    method: "POST",
    body: JSON.stringify({ name, description, target_visibility: targetVisibility }),
  });
}

export async function updateCampaign(id: string, name: string, description: string, targetVisibility: number): Promise<void> {
  await request(`/api/campaigns/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, description, target_visibility: targetVisibility }),
  });
}

export async function deleteCampaign(id: string): Promise<void> {
  await request(`/api/campaigns/${id}`, { method: "DELETE" });
}

// ─── Strategies ──────────────────────────────────────────────────────────

export async function fetchStrategies(): Promise<PromptStrategy[]> {
  return request<PromptStrategy[]>("/api/strategies");
}

export async function fetchStrategiesByCampaign(campaignId: string): Promise<PromptStrategy[]> {
  return request<PromptStrategy[]>(`/api/strategies?campaign_id=${encodeURIComponent(campaignId)}`);
}

export async function createStrategy(
  campaignId: string,
  prompt: string,
  intent: string,
  frequency: string,
  platforms: string[]
): Promise<PromptStrategy> {
  return request<PromptStrategy>("/api/strategies", {
    method: "POST",
    body: JSON.stringify({ campaign_id: campaignId, prompt, intent, frequency, platforms }),
  });
}

export async function updateStrat(
  id: string,
  data: { prompt: string; intent: string; frequency: string; platforms: string[]; campaign_id: string }
): Promise<void> {
  await request(`/api/strategies/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteStrat(id: string): Promise<void> {
  await request(`/api/strategies/${id}`, { method: "DELETE" });
}

// ─── Task Logs ──────────────────────────────────────────────────────────

export interface TaskLogEntry {
  id: string;
  user_id: string;
  timestamp: string;
  platform: string;
  prompt: string;
  status: string;
  message: string;
  observation_id: string;
}

export async function fetchLogs(): Promise<TaskLogEntry[]> {
  return request<TaskLogEntry[]>("/api/logs");
}

// ─── Task Execution ──────────────────────────────────────────────────────

export interface RunTaskParams {
  platform: string;
  prompt: string;
  propositions: string[];
  fingerprints: string[];
  intent: string;
  intentId: string;
  campaignId: string;
  campaign_id: string;  // UUID of the campaign
}

export interface RunTaskResponse {
  success: boolean;
  observationId: string;
  platform: string;
  is_mock: boolean;
}

export async function runTaskOnServer(params: RunTaskParams): Promise<RunTaskResponse> {
  return request<RunTaskResponse>("/api/run-task", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
