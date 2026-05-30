import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { AIScraper } from "./server/services/scraper.ts";
import { evaluateResponse } from "./server/services/evaluator.ts";
import { DEFAULT_PROPOSITIONS, DEFAULT_FINGERPRINTS } from "./server/services/mocks.ts";
import {
  getObservations,
  getObservationsSince,
  getObservationsByCampaign,
  addObservation,
  deleteObservation,
  getStrategies,
  getStrategiesByCampaign,
  addStrategy,
  updateStrategy,
  deleteStrategy,
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  addTaskLog,
  getTaskLogs,
} from "./server/db.ts";
import { requireAuth, registerAuthRoutes, type AuthRequest } from "./server/auth.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, "data");
const SCREENSHOTS_DIR = path.join(DATA_DIR, "screenshots");
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const scraper = new AIScraper();

process.on("SIGINT", async () => {
  console.log("[Server] Shutting down...");
  await scraper.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[Server] Shutting down...");
  await scraper.close();
  process.exit(0);
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8080;

  app.use(express.json());

  // ─── Public endpoints ───────────────────────────────────────────────────

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth routes (login, register, me, logout — see server/auth.ts)
  registerAuthRoutes(app);

  // Screenshot serving (public paths, no auth required)
  app.get("/api/screenshots/:year/:month/:filename", (req, res) => {
    const { year, month, filename } = req.params;
    const filePath = path.resolve(SCREENSHOTS_DIR, year, month, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Screenshot not found" });
    }
    res.type("jpg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`[Screenshot] Failed to send ${filePath}:`, err);
        if (!res.headersSent) res.status(500).json({ error: "Failed to serve screenshot" });
      }
    });
  });

  // ─── Observations (auth required) ───────────────────────────────────────

  app.get("/api/observations", requireAuth, (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const campaignId = req.query.campaign_id as string;
    const observations = campaignId
      ? getObservationsByCampaign(campaignId)
      : getObservations(userId);
    res.json(observations);
  });

  app.get("/api/observations/poll", requireAuth, (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const since = (req.query.since as string) || new Date(0).toISOString();
    const items = getObservationsSince(userId, since);
    res.json(items);
  });

  app.delete("/api/observations/:id", requireAuth, (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const deleted = deleteObservation(req.params.id, userId);
    if (!deleted) {
      return res.status(404).json({ error: "记录不存在或无权删除" });
    }
    res.json({ success: true });
  });

  // ─── Strategies (auth required) ─────────────────────────────────────────

  app.get("/api/strategies", requireAuth, (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const campaignId = req.query.campaign_id as string;
    const strategies = campaignId
      ? getStrategiesByCampaign(campaignId)
      : getStrategies(userId);
    res.json(strategies);
  });

  app.post("/api/strategies", requireAuth, (req, res) => {
    const { campaign_id, prompt, intent, frequency, platforms } = req.body;
    if (!prompt?.trim() || !intent || !frequency || !campaign_id) {
      return res.status(400).json({ error: "campaign_id, prompt, intent, frequency 不能为空" });
    }
    const selectedPlatforms = Array.isArray(platforms) && platforms.length > 0
      ? platforms
      : ["Kimi", "豆包", "DeepSeek", "通义千问", "文心一言", "元宝"];
    const strategy = addStrategy((req as AuthRequest).user!.id, campaign_id, prompt.trim(), intent, frequency, selectedPlatforms);
    res.json(strategy);
  });

  app.put("/api/strategies/:id", requireAuth, (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const { prompt, intent, frequency, platforms, campaign_id } = req.body;
    if (!prompt?.trim() || !intent || !frequency) {
      return res.status(400).json({ error: "prompt, intent, frequency 不能为空" });
    }
    const selectedPlatforms = Array.isArray(platforms) && platforms.length > 0
      ? platforms
      : ["Kimi", "豆包", "DeepSeek", "通义千问", "文心一言", "元宝"];
    const ok = updateStrategy(req.params.id, userId, prompt.trim(), intent, frequency, selectedPlatforms, campaign_id || "");
    if (!ok) return res.status(404).json({ error: "策略不存在或无权修改" });
    res.json({ success: true });
  });

  app.delete("/api/strategies/:id", requireAuth, (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const deleted = deleteStrategy(req.params.id, userId);
    if (!deleted) {
      return res.status(404).json({ error: "策略不存在或无权删除" });
    }
    res.json({ success: true });
  });

  // ─── Campaigns (auth required) ──────────────────────────────────────────

  app.get("/api/campaigns", requireAuth, (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const campaigns = getCampaigns(userId);
    res.json(campaigns);
  });

  app.post("/api/campaigns", requireAuth, (req, res) => {
    const { name, description, target_visibility } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: "name 不能为空" });
    }
    const campaign = createCampaign(
      (req as AuthRequest).user!.id,
      name.trim(),
      description || "",
      target_visibility || 50
    );
    res.json(campaign);
  });

  app.put("/api/campaigns/:id", requireAuth, (req, res) => {
    const { name, description, target_visibility } = req.body;
    const ok = updateCampaign(
      req.params.id,
      (req as AuthRequest).user!.id,
      name || "",
      description || "",
      target_visibility || 50
    );
    if (!ok) return res.status(404).json({ error: "Campaign 不存在或无权修改" });
    res.json({ success: true });
  });

  app.delete("/api/campaigns/:id", requireAuth, (req, res) => {
    const ok = deleteCampaign(req.params.id, (req as AuthRequest).user!.id);
    if (!ok) return res.status(404).json({ error: "Campaign 不存在或无权删除" });
    res.json({ success: true });
  });

  // ─── Task Logs (auth required) ──────────────────────────────────────────

  app.get("/api/logs", requireAuth, (req, res) => {
    const userId = (req as AuthRequest).user!.id;
    const logs = getTaskLogs(userId);
    res.json(logs);
  });

  // ─── Task Execution (scrape + evaluate + save to SQLite + screenshot file) ──

  app.post("/api/run-task", requireAuth, async (req, res) => {
    const { platform, prompt, propositions, fingerprints, intent, intentId, campaignId, campaign_id } = req.body;
    const userId = (req as AuthRequest).user!.id;

    if (!platform || !prompt) {
      return res.status(400).json({ error: "Platform and prompt are required" });
    }

    const defaultPropositions = propositions || DEFAULT_PROPOSITIONS;
    const defaultFingerprints = fingerprints || DEFAULT_FINGERPRINTS;

    try {
      console.log(`[Task] ${userId} @ ${platform}: ${prompt}`);

      // Step 1: Scrape — no mock fallback; fail loudly on error
      const scrapeResult = await scraper.scrape(platform, prompt);
      if (scrapeResult.status === "failed") {
        addTaskLog(userId, platform, prompt, "scrape_failed", scrapeResult.error || "未知错误");
        return res.status(502).json({ error: `抓取失败: ${scrapeResult.error || "未知错误"}` });
      }

      // Step 2: Evaluate — allow save even if eval fails
      let evaluation: any = null;
      let evalError: string | null = null;
      try {
        evaluation = await evaluateResponse(
          prompt,
          scrapeResult.responseText,
          defaultPropositions,
          defaultFingerprints
        );
      } catch (err: any) {
        evalError = err.message || String(err);
        console.error(`[Evaluator] ${platform} failed:`, evalError);
      }

      // Step 3: Save screenshot to filesystem
      let screenshotPath = "";
      if (scrapeResult.screenshotUrl && scrapeResult.screenshotUrl.startsWith("data:image")) {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const filename = `${Date.now()}.jpg`;
        const dir = path.join(SCREENSHOTS_DIR, yearMonth);
        fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(dir, filename);
        const base64Data = scrapeResult.screenshotUrl.split(",")[1];
        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
        screenshotPath = `/api/screenshots/${yearMonth}/${filename}`;
      }

      // Step 4: Write to SQLite
      const observationId = addObservation({
        userId,
        timestamp: new Date().toISOString(),
        platform: scrapeResult.platform,
        intent: intent || "产品发现",
        intent_id: intentId || "product_discovery",
        campaign_id: campaignId || "default_campaign",
        session_type: "anonymous",
        prompt_text: prompt,
        mentioned: evaluation?.mentioned_brand || false,
        top_rec: evaluation?.top_recommendation || false,
        top_3_rec: evaluation?.top_3_recommendation || false,
        sentiment: evaluation?.sentiment_score ?? 0,
        rank_position: evaluation?.rank_position ?? 0,
        proposition_hits: evaluation?.proposition_hits || [],
        fingerprint_matches: evaluation?.fingerprint_hits || [],
        source_urls: [
          ...(evaluation?.source_urls || []),
          // Regex fallback: extract bare URLs from raw response text
          ...((evaluation?.source_urls?.length ? [] : (scrapeResult.responseText.match(/https?:\/\/[^\s<>"']+/g) || []))),
        ],
        competitor_mentions: evaluation?.competitor_mentions || [],
        status: evaluation ? "success" : "eval_failed",
        is_mock: false,
        screenshot_path: screenshotPath,
        raw_response: scrapeResult.responseText,
      });

      console.log(`[Task] Saved: ${observationId}`);

      // Log result
      const logStatus = evaluation ? "success" : "eval_failed";
      const logMsg = evalError || "OK";
      addTaskLog(userId, platform, prompt, logStatus, logMsg, observationId);

      res.json({
        success: true,
        observationId,
        platform: scrapeResult.platform,
        is_mock: false,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "未知错误";
      console.error("Task failed:", errMsg);
      addTaskLog(userId, platform, prompt, "error", errMsg);
      res.status(500).json({ error: `执行失败: ${errMsg}` });
    }
  });

  // ─── Frontend serving ───────────────────────────────────────────────────

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[Server] Fatal startup error:", err);
  process.exit(1);
});
