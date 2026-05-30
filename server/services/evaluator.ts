import OpenAI from "openai";

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

export interface EvaluationResult {
  mentioned_brand: boolean;
  mentioned_product: string[];
  top_recommendation: boolean;
  top_3_recommendation: boolean;
  proposition_hits: string[];
  competitor_mentions: string[];
  sentiment_score: number;
  source_urls: string[];
  fingerprint_hits: string[];
  rank_position: number;
  summary: string;
}

export async function evaluateResponse(
  prompt: string,
  responseText: string,
  expectedPropositions: string[],
  fingerprints: string[]
): Promise<EvaluationResult> {
  const systemMessage = `
    You are an expert GEO (Generative Engine Optimization) Analyst.
    Your task is to analyze an AI's response to a specific prompt and extract structured data for brand attribution analysis.

    Target Brand: STMicroelectronics (ST)
    Target Products: STM32, STM32C5, STM32U5, STM32L4, etc.

    Analyze the response for:
    1. Mention of the target brand/products.
    2. Whether the target brand is the #1 recommendation or in the top 3.
    3. Sentiment score (1-10). 10 is extremely positive/leader, 1 is extremely negative.
    4. Mention of competitors (TI, NXP, ESP32, Renesas, etc.).
    5. Hits on specific value propositions (e.g., "Industry leading power efficiency").
    6. **SOURCE URLS — THIS IS CRITICAL**: Carefully scan the entire AI response for ANY URLs.
       Look for:
       - Markdown links: [text](https://...)
       - Bare URLs: https://...
       - Citation markers like [1], [2] followed by URLs
       - Reference sections at the bottom of the response
       - Inline hyperlinks
       Extract EVERY URL you find into the source_urls array. Do NOT skip any.
       This is the most important field — users need to see all referenced sources.
    7. Fingerprint hits: Check if specific campaign-unique phrases or data points are used.
    8. Rank position: The numerical rank of ST in the list of recommendations (1 if first).

    Return ONLY valid JSON matching this schema:
    {
      "mentioned_brand": boolean,
      "mentioned_product": string[],
      "top_recommendation": boolean,
      "top_3_recommendation": boolean,
      "proposition_hits": string[],
      "competitor_mentions": string[],
      "sentiment_score": number,
      "source_urls": string[],
      "fingerprint_hits": string[],
      "rank_position": number,
      "summary": string
    }
  `;

  const userMessage = `
    Prompt: ${prompt}
    AI Response: ${responseText}
    Expected Propositions: ${expectedPropositions.join(", ")}
    Campaign Fingerprints: ${fingerprints.join(", ")}

    Return a structured JSON evaluation.
  `;

  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    });

    const text = response.choices?.[0]?.message?.content || "{}";
    return JSON.parse(text) as EvaluationResult;
  } catch (error) {
    console.error("Evaluation failed:", error);
    throw error;
  }
}

// ─── CSV import: auto-classify intent + extract anchor fingerprints ──────────

/** The fixed set of monitoring intents the classifier must choose from. */
export const INTENT_CATEGORIES = [
  "产品发现",
  "竞品对比",
  "技术咨询",
  "品牌口碑",
  "成本优化",
  "选型迁移",
  "方案设计",
  "生态工具",
] as const;

export interface CsvRowInput {
  strategic_pillar: string;
  core_proposition: string;
  monitoring_prompt: string;
  expected_anchor: string;
}

export interface ClassifiedRow {
  intent: string;
  fingerprints: string[];
}

/**
 * Batch-classify CSV rows: assign each a monitoring intent (from INTENT_CATEGORIES)
 * and extract atomic fingerprint keywords (part numbers, prices, specs) from its
 * Expected AI Anchor. One LLM call for the whole batch.
 */
export async function classifyAndExtract(rows: CsvRowInput[]): Promise<ClassifiedRow[]> {
  if (rows.length === 0) return [];

  const systemMessage = `
    You are a GEO monitoring data processor. For each input row you receive:
    - strategic_pillar, core_proposition, monitoring_prompt, expected_anchor

    Do two things per row:
    1. intent: classify the monitoring_prompt into EXACTLY ONE of these categories:
       ${INTENT_CATEGORIES.join("、")}
       Choose the single best fit.
    2. fingerprints: extract ATOMIC, verifiable keywords from expected_anchor —
       part numbers (e.g. STM32C5), prices (e.g. 0.64美元, $0.64), numeric specs
       (e.g. 593, 125°C, 144MHz, 64KB), and core feature names (e.g. 以太网MAC, EEPROM仿真).
       Do NOT return whole sentences. Return short discrete tokens only.

    Return ONLY valid JSON: { "rows": [ { "intent": string, "fingerprints": string[] }, ... ] }
    The rows array MUST be in the same order and same length as the input.
  `;

  const userMessage = `Input rows (JSON):\n${JSON.stringify(rows)}\n\nReturn the classified JSON.`;

  const response = await deepseek.chat.completions.create({
    model: "deepseek-v4-pro",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
  });

  const text = response.choices?.[0]?.message?.content || '{"rows":[]}';
  const parsed = JSON.parse(text) as { rows?: ClassifiedRow[] };
  const out = parsed.rows || [];

  // Defensive: ensure 1:1 alignment; fall back to a safe default per missing row.
  return rows.map((_, i) => {
    const r = out[i];
    const intent = r && INTENT_CATEGORIES.includes(r.intent as any) ? r.intent : "产品发现";
    const fingerprints = Array.isArray(r?.fingerprints) ? r!.fingerprints : [];
    return { intent, fingerprints };
  });
}
