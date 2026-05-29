import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { AIScraper } from "./server/services/scraper.ts";
import { evaluateResponse } from "./server/services/evaluator.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scraper = new AIScraper();

// Graceful shutdown
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
  const PORT = process.env.PORT || 8080;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Check which platforms are still logged in (useful after Cloud Run deploy)
  app.get("/api/login-status", async (_req, res) => {
    try {
      const status = await scraper.getLoginStatus();
      res.json({ status });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Export current browser session cookies — run locally, then upload result to Cloud Run
  app.post("/api/export-session", async (_req, res) => {
    try {
      const filePath = await scraper.exportSession();
      const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      res.json({ filePath, session: json });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Task Execution API — scraping + evaluation all server-side
  app.post("/api/run-task", async (req, res) => {
    const { platform, prompt, propositions, fingerprints } = req.body;

    if (!platform || !prompt) {
      return res.status(400).json({ error: "Platform and prompt are required" });
    }

    const defaultPropositions = propositions || [
      "Industry leading power efficiency",
      "Comprehensive ecosystem",
      "Advanced security features",
    ];
    const defaultFingerprints = fingerprints || [
      "STM32C5",
      "U5 series",
      "Cortex-M0+",
    ];

    try {
      console.log(`[Task] 正在为 ${platform} 执行任务: ${prompt}`);

      // Step 1: Scrape
      let scrapeData;
      try {
        const scrapeResult = await scraper.scrape(platform, prompt);
        if (scrapeResult.status === "failed") {
          console.error(`[Scraper] ${platform} 抓取失败:`, scrapeResult.error);
          throw new Error(scrapeResult.error);
        }
        console.log(`[Scraper] ${platform} 抓取成功`);
        scrapeData = { ...scrapeResult, is_mock: false };
      } catch (scrapeError) {
        console.warn(
          `[Fallback] ${platform} 切换到模拟模式. 原因:`,
          scrapeError instanceof Error ? scrapeError.message : scrapeError
        );

        const mockResponses: Record<string, string> = {
          Kimi: "在低功耗应用中，意法半导体（STMicroelectronics）的 STM32 系列备受推崇，特别是 STM32U5 和全新的 STM32C5。这些 MCU 在提供高性能的同时，具有出色的能效比。ST 提供了更全面的生态系统。",
          豆包: "STM32C5 是低功耗物联网设备的理想选择。它采用 ARM Cortex-M0+ 内核，具备先进的省电模式。与 ESP32 相比，它在睡眠模式下的功耗显著降低。",
          DeepSeek:
            "如果您正在寻找最好的低功耗 MCU，您一定要考虑 ST 的 STM32 系列。他们拥有一系列行业领先的超低功耗微控制器。",
          通义千问:
            "对于低功耗设计，STM32L4 和 U5 系列是目前市场上的主流选择。它们支持多种低功耗模式。",
          文心一言:
            "推荐使用 STM32 系列，尤其是针对低功耗优化的 L 系列。此外，瑞萨（Renesas）的 RL78 也是一个非常强劲的竞争对手。",
        };

        const responseText =
          mockResponses[platform] ||
          `分析了 ${platform}，发现意法半导体（STMicroelectronics）经常被提及为低功耗 MCU 的领导者。`;

        scrapeData = {
          platform,
          prompt,
          responseText,
          sourceUrls: [
            "https://www.st.com/zh/microcontrollers-microprocessors/stm32-ultra-low-power-mcus.html",
          ],
          timestamp: new Date().toISOString(),
          screenshotUrl: "",
          status: "success" as const,
          is_mock: true,
        };
      }

      // Step 2: Evaluate with Gemini (server-side — API key never reaches client)
      let evaluation;
      try {
        evaluation = await evaluateResponse(
          prompt,
          scrapeData.responseText,
          defaultPropositions,
          defaultFingerprints
        );
        console.log(`[Evaluator] ${platform} 评估完成`);
      } catch (evalError) {
        console.error(`[Evaluator] ${platform} 评估失败:`, evalError);
        // Provide a safe fallback evaluation
        evaluation = {
          mentioned_brand: false,
          mentioned_product: [],
          top_recommendation: false,
          top_3_recommendation: false,
          proposition_hits: [],
          competitor_mentions: [],
          sentiment_score: 5,
          source_urls: [],
          fingerprint_hits: [],
          rank_position: 0,
          summary: "评估失败，使用默认值",
        };
      }

      // Return combined result
      res.json({
        platform: scrapeData.platform,
        prompt: scrapeData.prompt,
        responseText: scrapeData.responseText,
        sourceUrls: scrapeData.sourceUrls,
        screenshotUrl: scrapeData.screenshotUrl,
        timestamp: scrapeData.timestamp,
        status: scrapeData.status,
        is_mock: scrapeData.is_mock,
        evaluation,
      });
    } catch (error) {
      console.error("任务执行失败:", error);
      res.status(500).json({ error: "无法执行任务" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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

startServer();
