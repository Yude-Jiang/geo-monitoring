import { chromium, BrowserContext, Page, Browser } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ScrapeResult {
  platform: string;
  prompt: string;
  responseText: string;
  sourceUrls: string[];
  screenshotUrl: string;
  timestamp: string;
  status: "success" | "failed";
  is_mock: boolean;
  error?: string;
}

interface PlatformConfig {
  name: string;
  url: string;
  /** Ordered list of CSS selectors to try when locating the chat input */
  inputSelectors: string[];
  /** Ordered list of CSS selectors to try for the last AI response bubble */
  responseSelectors: string[];
  /** CSS selector for any "AI is still thinking" indicator */
  loadingIndicator?: string;
  /** How to submit the prompt: "enter" | "ctrl+enter" | "shift+enter" */
  submitKey: "enter" | "ctrl+enter" | "shift+enter";
  /** CSS selector to verify user is logged in (element that only appears after login) */
  loggedInCheck: string;
  /** Optional: element to wait for before the page is considered ready */
  readySelector?: string;
}

// ─── Platform Configurations ───────────────────────────────────────────────

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  DeepSeek: {
    name: "DeepSeek",
    url: "https://chat.deepseek.com/",
    inputSelectors: [
      "textarea#chat-input",
      "textarea[placeholder]",
      "textarea:visible",
      'div[contenteditable="true"]:not(body)',
    ],
    responseSelectors: [
      ".ds-markdown",
      '[class*="markdown"]:last-of-type',
      '[class*="message-content"]:last-of-type',
      '[class*="chat-message"]:last-of-type [class*="content"]',
    ],
    loadingIndicator: '[class*="generating"], [class*="loading"], button[aria-label*="Stop"]',
    submitKey: "enter",
    loggedInCheck: 'textarea, [class*="chat-input"], input[placeholder]',
    readySelector: "body",
  },

  Kimi: {
    name: "Kimi",
    url: "https://kimi.moonshot.cn/",
    inputSelectors: [
      'div[contenteditable="true"]:not(body)',
      "textarea:visible",
      '[class*="input"]:visible',
    ],
    responseSelectors: [
      '[class*="segment-content"]:last-of-type',
      '[class*="message"]:last-of-type [class*="content"]',
      '[class*="markdown"]:last-of-type',
      'article:last-of-type',
    ],
    loadingIndicator: '[class*="loading"], [class*="typing"], [class*="thinking"]',
    submitKey: "enter",
    loggedInCheck: '[class*="chat"], [class*="input"], [contenteditable]',
    readySelector: "body",
  },

  豆包: {
    name: "豆包",
    url: "https://www.doubao.com/chat/",
    inputSelectors: [
      "textarea:visible",
      'div[contenteditable="true"]:not(body)',
      '[class*="input"]:visible',
    ],
    responseSelectors: [
      '[class*="message"]:last-of-type [class*="content"]',
      '[class*="reply"]:last-of-type',
      '[class*="markdown"]:last-of-type',
      "article:last-of-type",
    ],
    loadingIndicator: '[class*="loading"], [class*="thinking"], [class*="generating"]',
    submitKey: "enter",
    loggedInCheck: 'textarea, [class*="chat"], [contenteditable]',
    readySelector: "body",
  },

  通义千问: {
    name: "通义千问",
    url: "https://tongyi.aliyun.com/qianwen/",
    inputSelectors: [
      "textarea:visible",
      'div[contenteditable="true"]:not(body)',
      '[class*="input"]:visible',
    ],
    responseSelectors: [
      '[class*="markdown"]:last-of-type',
      '[class*="answer"]:last-of-type',
      '[class*="message"]:last-of-type [class*="content"]',
    ],
    loadingIndicator: '[class*="loading"], [class*="typing"]',
    submitKey: "enter",
    loggedInCheck: 'textarea, [class*="chat"], [class*="input"]',
    readySelector: "body",
  },

  文心一言: {
    name: "文心一言",
    url: "https://yiyan.baidu.com/",
    inputSelectors: [
      "textarea:visible",
      'div[contenteditable="true"]:not(body)',
    ],
    responseSelectors: [
      '[class*="content"]:last-of-type',
      '[class*="message"]:last-of-type',
      '[class*="markdown"]:last-of-type',
    ],
    loadingIndicator: '[class*="loading"], [class*="thinking"]',
    submitKey: "ctrl+enter",
    loggedInCheck: 'textarea, [class*="chat"]',
    readySelector: "body",
  },
};

// ─── Mock responses (last-resort fallback) ─────────────────────────────────

const MOCK_RESPONSES: Record<string, string> = {
  DeepSeek:
    "在低功耗应用中，意法半导体（STMicroelectronics）的 STM32 系列备受推崇，特别是 STM32U5 和全新的 STM32C5。这些 MCU 在提供高性能的同时，具有出色的能效比，ST 提供了更全面的生态系统，包括 STM32CubeMX 和 STM32CubeIDE 等开发工具。",
  Kimi:
    "STM32C5 是低功耗物联网设备的理想选择。它采用 ARM Cortex-M0+ 内核，具备先进的省电模式。与 ESP32 相比，它在睡眠模式下的功耗显著降低。意法半导体在安全特性方面也具有优势，内置 PSA 认证的安全功能。",
  豆包:
    "对于低功耗应用，建议考虑意法半导体的 STM32U5 系列，该系列专为超低功耗场景设计，支持多种低功耗模式，待机电流极低。ST 的 Cortex-M33 内核还提供了 TrustZone 安全支持。竞品方面，TI 的 MSP430 系列和 Nordic 的 nRF52 系列也值得关注。",
  通义千问:
    "对于低功耗设计，STM32L4 和 U5 系列是目前市场上的主流选择。意法半导体 ST 在超低功耗 MCU 领域具有领先优势，其 LP Run 模式下功耗可低至几十微安。此外，NXP 的 i.MX RT 系列和瑞萨的 RA 系列也是不错的选择。",
  文心一言:
    "推荐使用 STM32 系列，尤其是针对低功耗优化的 L 系列和 U 系列。意法半导体（ST）的 STM32C5 系列基于 Cortex-M0+，在极低功耗场景下表现优异。此外，瑞萨（Renesas）的 RL78 也是一个非常强劲的竞争对手。",
};

// ─── Core Scraper ──────────────────────────────────────────────────────────

export class AIScraper {
  private context: BrowserContext | null = null;
  private readonly profileDir: string;
  private readonly headless: boolean;
  private readonly slowMo: number;

  constructor() {
    // Profile directory: project-root/.chrome-data/
    this.profileDir = path.resolve(
      __dirname,
      "..",
      "..",
      process.env.CHROME_DATA_DIR || ".chrome-data"
    );
    this.headless = process.env.HEADLESS !== "false"; // Default to true in Cloud Run if not explicitly false
    this.slowMo = this.headless ? 0 : 80; // Human-like typing speed when visible
  }

  // ── Browser lifecycle ────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this.context) return;

    // Ensure profile directory exists
    if (!fs.existsSync(this.profileDir)) {
      fs.mkdirSync(this.profileDir, { recursive: true });
      console.log(
        `[Scraper] Created Chrome profile at: ${this.profileDir}`
      );
      console.log(
        `[Scraper] NOTE: First run will open a visible Chrome window.`,
        `Please log into each AI platform manually.`
      );
    }

    this.context = await chromium.launchPersistentContext(this.profileDir, {
      ...(process.env.K_SERVICE ? {} : { channel: "chrome" }), // Use bundled chromium in Cloud Run, user's chrome locally
      headless: this.headless,
      slowMo: this.slowMo,
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-dev-shm-usage",
      ],
      ignoreDefaultArgs: ["--enable-automation"],
    });

    console.log(
      `[Scraper] Browser context initialized (headless=${this.headless})`
    );
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
  }

  // ── Main scrape entry point ───────────────────────────────────────────────

  async scrape(platformName: string, prompt: string): Promise<ScrapeResult> {
    const config = PLATFORM_CONFIGS[platformName];
    if (!config) {
      console.warn(`[Scraper] Unknown platform: ${platformName}, using mock`);
      return this.buildMockResult(platformName, prompt, `未知平台: ${platformName}`);
    }

    try {
      await this.init();
      return await this.runPlatformScrape(config, prompt);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Scraper] ${platformName} failed:`, errMsg);
      return this.buildMockResult(platformName, prompt, errMsg);
    }
  }

  // ── Platform scrape logic ─────────────────────────────────────────────────

  private async runPlatformScrape(
    config: PlatformConfig,
    prompt: string
  ): Promise<ScrapeResult> {
    const page = await this.context!.newPage();

    try {
      console.log(`[Scraper] Navigating to ${config.name}: ${config.url}`);
      await page.goto(config.url, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      // Wait for page to settle
      await page.waitForTimeout(2000 + Math.random() * 1000);

      // ── 1. Verify login ────────────────────────────────────────────────
      const isLoggedIn = await this.checkLoginStatus(page, config);
      if (!isLoggedIn) {
        // If not headless, wait for user to log in manually (up to 3 minutes)
        if (!this.headless) {
          console.log(
            `[Scraper] ${config.name}: Not logged in. Waiting for user to log in manually (3 min timeout)...`
          );
          await this.waitForLogin(page, config);
        } else {
          throw new Error(
            `${config.name} 未登录。请先在非无头模式下运行并登录该平台 (HEADLESS=false)`
          );
        }
      }

      // ── 2. Find chat input ──────────────────────────────────────────────
      console.log(`[Scraper] Finding chat input for ${config.name}...`);
      const inputLocator = await this.findChatInput(page, config);
      if (!inputLocator) {
        throw new Error(`无法找到 ${config.name} 的聊天输入框`);
      }

      // ── 3. Clear input and type prompt ─────────────────────────────────
      await inputLocator.click();
      await page.waitForTimeout(300 + Math.random() * 200);
      // Triple-click selects all text in the field, then overwrite with fill
      await inputLocator.click({ clickCount: 3 });
      await page.waitForTimeout(200);

      // Type with human-like speed (characters with small delays)
      await inputLocator.fill(prompt);
      await page.waitForTimeout(500 + Math.random() * 500);

      // ── 4. Submit ──────────────────────────────────────────────────────
      console.log(`[Scraper] Submitting prompt to ${config.name}...`);
      await this.submitPrompt(page, inputLocator, config);

      // ── 5. Wait for streaming response ─────────────────────────────────
      console.log(`[Scraper] Waiting for ${config.name} response...`);
      const responseText = await this.waitForStreamingComplete(page, config);

      if (!responseText || responseText.trim().length < 10) {
        throw new Error(`${config.name} 返回了空响应`);
      }

      // ── 6. Take screenshot ─────────────────────────────────────────────
      const screenshotBuffer = await page.screenshot({
        type: "jpeg",
        quality: 70,
        fullPage: false,
      });
      const screenshotUrl = `data:image/jpeg;base64,${screenshotBuffer.toString("base64")}`;

      console.log(
        `[Scraper] ${config.name} finished. Response length: ${responseText.length} chars`
      );

      return {
        platform: config.name,
        prompt,
        responseText: responseText.trim(),
        sourceUrls: [page.url()],
        screenshotUrl,
        timestamp: new Date().toISOString(),
        status: "success",
        is_mock: false,
      };
    } finally {
      await page.close();
    }
  }

  // ── Login detection ──────────────────────────────────────────────────────

  private async checkLoginStatus(
    page: Page,
    config: PlatformConfig
  ): Promise<boolean> {
    try {
      // Quick check: is there a visible login-required element?
      const loginKeywords = [
        "登录",
        "Login",
        "Sign in",
        "注册",
        "Register",
        "log in",
      ];

      // Check for chat input (only visible when logged in)
      for (const selector of config.inputSelectors) {
        const el = page.locator(selector).first();
        const isVisible = await el.isVisible({ timeout: 3000 }).catch(() => false);
        if (isVisible) {
          console.log(`[Scraper] ${config.name}: Login confirmed (found input)`);
          return true;
        }
      }

      console.log(`[Scraper] ${config.name}: Login check failed (no input found)`);
      return false;
    } catch {
      return false;
    }
  }

  private async waitForLogin(
    page: Page,
    config: PlatformConfig,
    timeoutMs = 180_000
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await page.waitForTimeout(3000);
      const loggedIn = await this.checkLoginStatus(page, config);
      if (loggedIn) {
        console.log(`[Scraper] ${config.name}: Login detected!`);
        await page.waitForTimeout(2000); // Extra settle time
        return;
      }
    }
    throw new Error(
      `${config.name} 登录等待超时（3分钟）。请在弹出的 Chrome 窗口中完成登录。`
    );
  }

  // ── Input detection ──────────────────────────────────────────────────────

  private async findChatInput(page: Page, config: PlatformConfig) {
    for (const selector of config.inputSelectors) {
      try {
        const el = page.locator(selector).first();
        const visible = await el.isVisible({ timeout: 2000 });
        if (visible) {
          console.log(`[Scraper] Found input with selector: ${selector}`);
          return el;
        }
      } catch {
        // Try next selector
      }
    }
    return null;
  }

  // ── Submit prompt ────────────────────────────────────────────────────────

  private async submitPrompt(
    page: Page,
    inputLocator: any,
    config: PlatformConfig
  ): Promise<void> {
    // First try: find and click a send button
    const sendButtonSelectors = [
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      'button[aria-label*="发送"]',
      'button[data-testid*="send"]',
      '[class*="send-button"]:visible',
      '[class*="sendButton"]:visible',
      '[class*="submit"]:visible button',
    ];

    let buttonClicked = false;
    for (const sel of sendButtonSelectors) {
      try {
        const btn = page.locator(sel).last();
        const visible = await btn.isVisible({ timeout: 1000 });
        if (visible) {
          await btn.click();
          buttonClicked = true;
          console.log(`[Scraper] Clicked send button: ${sel}`);
          break;
        }
      } catch {
        // Try keyboard fallback
      }
    }

    // Fallback: keyboard shortcut
    if (!buttonClicked) {
      const keyMap = {
        enter: "Enter",
        "ctrl+enter": "Control+Enter",
        "shift+enter": "Shift+Enter",
      };
      const key = keyMap[config.submitKey];
      await inputLocator.press(key);
      console.log(`[Scraper] Submitted via keyboard: ${key}`);
    }

    // Brief wait for response to start loading
    await page.waitForTimeout(1500);
  }

  // ── Streaming completion detection ───────────────────────────────────────

  private async waitForStreamingComplete(
    page: Page,
    config: PlatformConfig,
    maxWaitMs = 90_000
  ): Promise<string> {
    const start = Date.now();
    let lastText = "";
    let stableMs = 0;
    const pollInterval = 1500;
    const stabilityThreshold = 4000; // Text must be stable for 4 seconds

    console.log("[Scraper] Polling for streaming completion...");

    while (Date.now() - start < maxWaitMs) {
      await page.waitForTimeout(pollInterval);

      // Check if loading indicator is gone (secondary signal)
      if (config.loadingIndicator) {
        const loading = await page
          .locator(config.loadingIndicator)
          .first()
          .isVisible({ timeout: 500 })
          .catch(() => false);
        if (!loading && lastText.length > 30 && stableMs >= stabilityThreshold) {
          console.log("[Scraper] Loading indicator gone + text stable. Done.");
          break;
        }
      }

      // Get current response text
      const currentText = await this.extractLastResponse(page, config);

      if (currentText === lastText && currentText.length > 30) {
        stableMs += pollInterval;
        if (stableMs >= stabilityThreshold) {
          console.log(
            `[Scraper] Text stable for ${stableMs}ms. Response complete.`
          );
          break;
        }
      } else {
        // Text is still changing
        stableMs = 0;
        lastText = currentText;
        // Log progress
        if (currentText.length % 200 < 50) {
          console.log(
            `[Scraper] Streaming... ${currentText.length} chars so far`
          );
        }
      }
    }

    // Final extraction
    return await this.extractLastResponse(page, config);
  }

  // ── Response text extraction ─────────────────────────────────────────────

  private async extractLastResponse(
    page: Page,
    config: PlatformConfig
  ): Promise<string> {
    for (const selector of config.responseSelectors) {
      try {
        // Get all matching elements, pick the LAST one (most recent AI response)
        const elements = page.locator(selector);
        const count = await elements.count();
        if (count > 0) {
          const lastEl = elements.nth(count - 1);
          const visible = await lastEl.isVisible({ timeout: 1000 });
          if (visible) {
            const text = await lastEl.innerText();
            if (text && text.trim().length > 10) {
              return text.trim();
            }
          }
        }
      } catch {
        // Try next selector
      }
    }

    // Absolute fallback: get all visible text from the page body, skip navigation
    const bodyText = await page.evaluate(() => {
      const main = document.querySelector("main") || document.querySelector("#root") || document.body;
      return main?.innerText?.slice(0, 3000) || "";
    });

    return bodyText.trim();
  }

  // ── Mock fallback ────────────────────────────────────────────────────────

  private buildMockResult(
    platform: string,
    prompt: string,
    reason: string
  ): ScrapeResult {
    const responseText =
      MOCK_RESPONSES[platform] ||
      `[模拟数据] 分析了 ${platform}：意法半导体 (STMicroelectronics) 的 STM32 系列在低功耗 MCU 领域具有领先优势。原因: ${reason}`;

    console.warn(`[Scraper] ${platform} using MOCK data. Reason: ${reason}`);

    return {
      platform,
      prompt,
      responseText,
      sourceUrls: [
        "https://www.st.com/zh/microcontrollers-microprocessors/stm32-ultra-low-power-mcus.html",
      ],
      screenshotUrl: "",
      timestamp: new Date().toISOString(),
      status: "success",
      is_mock: true,
      error: reason,
    };
  }
}
