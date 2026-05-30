// ─────────────────────────────────────────────────────────────────────────────
// Agent-mode forwarder: a mainland node pushes its locally-scraped observations
// up to the central aggregation server (Cloud Run). Nodes are behind NAT, so the
// central server cannot reach them — the flow is always node → central (push).
//
// Activated when CENTRAL_URL + INGEST_TOKEN + NODE_LOCATION are all set.
// Offline-resilient: failed pushes are retried by a periodic flush (see server.ts),
// driven by the observations.synced column.
// ─────────────────────────────────────────────────────────────────────────────
import type { Observation } from "../../src/types/index.ts";

const CENTRAL_URL = (process.env.CENTRAL_URL || "").replace(/\/$/, "");
const INGEST_TOKEN = process.env.INGEST_TOKEN || "";
export const NODE_LOCATION = process.env.NODE_LOCATION || "";

export function isAgentMode(): boolean {
  return Boolean(CENTRAL_URL && INGEST_TOKEN && NODE_LOCATION);
}

// Push one observation to central. Screenshots stay on the node (local files,
// not reachable from central), so they are intentionally dropped here.
export async function forwardObservation(obs: Observation): Promise<boolean> {
  if (!isAgentMode()) return false;
  try {
    const res = await fetch(`${CENTRAL_URL}/api/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INGEST_TOKEN}`,
      },
      body: JSON.stringify({
        timestamp: obs.timestamp,
        platform: obs.platform,
        intent: obs.intent,
        intent_id: obs.intent_id,
        campaign_id: obs.campaign_id,
        session_type: obs.session_type,
        prompt_text: obs.prompt_text,
        mentioned: obs.mentioned,
        top_rec: obs.top_rec,
        top_3_rec: obs.top_3_rec,
        sentiment: obs.sentiment,
        rank_position: obs.rank_position,
        proposition_hits: obs.proposition_hits,
        fingerprint_matches: obs.fingerprint_matches,
        source_urls: obs.source_urls,
        competitor_mentions: obs.competitor_mentions,
        status: obs.status,
        is_mock: obs.is_mock,
        raw_response: obs.raw_response,
        run_batch_id: obs.run_batch_id,
        location: obs.location || NODE_LOCATION,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[Forwarder] push failed:", err instanceof Error ? err.message : err);
    return false;
  }
}
