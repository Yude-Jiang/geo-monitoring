import { EvaluationResult } from "./evaluator.ts";

const DEEPSEEK_URL =
  process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";

const SYSTEM_INSTRUCTION = `
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
6. Extracted source URLs if present in the response or citations.
7. Fingerprint hits: Check if specific campaign-unique phrases or data points are used.
8. Rank position: The numerical rank of ST in the list of recommendations (1 if first).

Return a JSON object with exactly these fields:
mentioned_brand (boolean), mentioned_product (string[]), top_recommendation (boolean),
top_3_recommendation (boolean), proposition_hits (string[]), competitor_mentions (string[]),
sentiment_score (number 1-10), source_urls (string[]), fingerprint_hits (string[]),
rank_position (number, 0 if not mentioned), summary (string).
`.trim();

export async function evaluateWithDeepSeek(
  prompt: string,
  responseText: string,
  expectedPropositions: string[],
  fingerprints: string[]
): Promise<EvaluationResult> {
  const userMessage = `
Prompt: ${prompt}
AI Response: ${responseText}
Expected Propositions: ${expectedPropositions.join(", ")}
Campaign Fingerprints: ${fingerprints.join(", ")}

Return a structured JSON evaluation.
`.trim();

  const body = {
    model: "deepseek-chat",
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  };

  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  console.log("[DeepSeek] raw response:", raw);

  const apiResponse = JSON.parse(raw);

  if (!res.ok) {
    throw new Error(`DeepSeek API error ${res.status}: ${apiResponse.error?.message ?? raw}`);
  }

  const content: string | undefined = apiResponse.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned empty content");

  // Try direct JSON parse first, then fenced-code extraction as fallback
  try {
    return JSON.parse(content) as EvaluationResult;
  } catch {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match) return JSON.parse(match[1]) as EvaluationResult;
    throw new Error("Cannot parse JSON from DeepSeek response");
  }
}
