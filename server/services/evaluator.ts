import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
  rank_position: number; // 1 for top, 2 for second, etc. 0 if not mentioned
  summary: string;
}

export async function evaluateResponse(prompt: string, responseText: string, expectedPropositions: string[], fingerprints: string[]): Promise<EvaluationResult> {
  const systemInstruction = `
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
  `;

  const userPrompt = `
    Prompt: ${prompt}
    AI Response: ${responseText}
    Expected Propositions: ${expectedPropositions.join(", ")}
    Campaign Fingerprints: ${fingerprints.join(", ")}
    
    Return a structured JSON evaluation.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mentioned_brand: { type: Type.BOOLEAN },
            mentioned_product: { type: Type.ARRAY, items: { type: Type.STRING } },
            top_recommendation: { type: Type.BOOLEAN },
            top_3_recommendation: { type: Type.BOOLEAN },
            proposition_hits: { type: Type.ARRAY, items: { type: Type.STRING } },
            competitor_mentions: { type: Type.ARRAY, items: { type: Type.STRING } },
            sentiment_score: { type: Type.NUMBER },
            source_urls: { type: Type.ARRAY, items: { type: Type.STRING } },
            fingerprint_hits: { type: Type.ARRAY, items: { type: Type.STRING } },
            rank_position: { type: Type.NUMBER },
            summary: { type: Type.STRING }
          },
          required: ["mentioned_brand", "sentiment_score", "summary", "rank_position"]
        }
      }
    });

    return JSON.parse(response.text || "{}") as EvaluationResult;
  } catch (error) {
    console.error("Evaluation failed:", error);
    throw error;
  }
}
