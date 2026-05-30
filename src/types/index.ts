export interface Observation {
  id: string;
  user_id?: string;  // SQLite-backed: owner user ID
  timestamp: string;
  platform: string;
  intent: string;
  intent_id?: string;
  campaign_id?: string;
  session_type: "anonymous" | "logged_in";
  prompt_text: string;
  mentioned: boolean;
  top_rec: boolean;
  top_3_rec?: boolean;
  sentiment: number;
  rank_position?: number;
  proposition_hits?: string[];
  fingerprint_matches?: string[];
  source_urls?: string[];
  competitor_mentions?: string[];
  status: string;
  screenshot_url?: string;
  raw_response?: string;
  is_mock?: boolean;
}

export interface PromptStrategy {
  id: string;
  campaign_id?: string;
  prompt: string;
  intent: string;
  frequency: string;
  platforms: string[];  // selected AI platforms to monitor
  createdAt: string;
}

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

export interface TaskResult {
  platform: string;
  prompt: string;
  responseText: string;
  sourceUrls: string[];
  screenshotUrl: string;
  timestamp: string;
  status: "success" | "failed";
  is_mock: boolean;
  evaluation: EvaluationResult;
  error?: string;
}
