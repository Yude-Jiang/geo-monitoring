import { useState, useEffect, useCallback, useRef } from "react";
import type { Observation, PromptStrategy } from "../types";
import type { AppUser } from "../components/AuthProvider";
import {
  fetchObservations,
  pollObservations,
  deleteObs,
  fetchStrategies,
  createStrategy,
  updateStrat,
  deleteStrat,
  runTaskOnServer,
  importStrategiesFromCSV,
  type CsvImportRow,
} from "../services/api";
import { useToast } from "../components/common/Toast";

export function useServerData(user: AppUser | null) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const { toast } = useToast();
  const [strategies, setStrategies] = useState<PromptStrategy[]>([]);
  const [isRunningTask, setIsRunningTask] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const lastPollRef = useRef<string | null>(null);

  // Initial load when user changes
  const loadAll = useCallback(async () => {
    if (!user) return;
    try {
      const [obs, strats] = await Promise.all([fetchObservations(), fetchStrategies()]);
      setObservations(obs);
      setLastSyncAt(new Date());
      if (obs.length > 0) {
        lastPollRef.current = obs[0].timestamp;
      }
      setStrategies(strats);
      setLastSyncAt(new Date());
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  }, [user]);

  // Poll for new observations every 30s
  useEffect(() => {
    if (!user) return;
    loadAll();

    const interval = setInterval(async () => {
      try {
        const since = lastPollRef.current || new Date(0).toISOString();
        const newer = await pollObservations(since);
        if (newer.length > 0) {
          setObservations((prev) => {
            const merged = [...newer, ...prev];
            // Deduplicate by id
            const seen = new Set<string>();
            const deduped = merged.filter((o) => {
              if (seen.has(o.id)) return false;
              seen.add(o.id);
              return true;
            });
            return deduped;
          });
          lastPollRef.current = newer[0].timestamp;
        }
      } catch (err) {
        // Silently ignore poll errors
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user, loadAll]);

  // Save strategy
  const saveStrategy = useCallback(
    async (
      campaignId: string, prompt: string, intent: string, frequency: string, platforms: string[],
      extra?: { strategic_pillar?: string; propositions?: string[]; expected_anchors?: string[]; fingerprints?: string[] }
    ) => {
      if (!user) return;
      const strategy = await createStrategy(campaignId, prompt, intent, frequency, platforms, extra);
      setStrategies((prev) => [strategy, ...prev]);
    },
    [user]
  );

  // Bulk import strategies from CSV (server auto-classifies intent + extracts fingerprints)
  const importCSV = useCallback(
    async (rows: CsvImportRow[], campaignId: string, frequency: string, platforms: string[]) => {
      if (!user) return 0;
      const { imported, strategies } = await importStrategiesFromCSV({ rows, campaign_id: campaignId, frequency, platforms });
      setStrategies((prev) => [...strategies, ...prev]);
      return imported;
    },
    [user]
  );

  // Delete observation
  const deleteObservation = useCallback(async (id: string) => {
    await deleteObs(id);
    setObservations((prev) => prev.filter((o) => o.id !== id));
  }, []);

  // Delete strategy
  const deleteStrategyFn = useCallback(async (id: string) => {
    await deleteStrat(id);
    setStrategies((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Update strategy
  const updateStrategyFn = useCallback(async (
    id: string,
    data: { prompt: string; intent: string; frequency: string; platforms: string[]; campaign_id: string }
  ) => {
    await updateStrat(id, data);
    setStrategies((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, prompt: data.prompt, intent: data.intent, frequency: data.frequency, platforms: data.platforms, campaign_id: data.campaign_id }
          : s
      )
    );
  }, []);

  // Run task — execute all selected platforms in sequence
  const runTask = useCallback(
    async (strategy?: PromptStrategy) => {
      if (!user) return;
      setIsRunningTask(true);

      try {
        const allPlatforms = ["Kimi", "豆包", "DeepSeek", "通义千问", "文心一言", "元宝"];
        const platforms = (strategy?.platforms?.length ? strategy.platforms : allPlatforms);
        const prompt = strategy?.prompt ?? "低功耗应用中最好的 MCU 是什么？";
        const intent = strategy?.intent ?? "产品发现";
        const campaignId = strategy?.campaign_id || "default_campaign";

        // Per-strategy evaluation criteria, falling back to global defaults
        const DEFAULT_PROPOSITIONS = [
          "Industry leading power efficiency",
          "Comprehensive ecosystem",
          "Advanced security features",
        ];
        const DEFAULT_FINGERPRINTS = ["STM32C5", "U5 series", "Cortex-M0+"];
        const propositions = strategy?.propositions?.length ? strategy.propositions : DEFAULT_PROPOSITIONS;
        const fingerprints = strategy?.fingerprints?.length ? strategy.fingerprints : DEFAULT_FINGERPRINTS;

        // Sample each platform N times to measure mention probability, not a single snapshot
        const SAMPLES = 3;

        for (let i = 0; i < platforms.length; i++) {
          // One batch id per platform groups its N samples together
          const runBatchId = `${Date.now()}-${platforms[i]}-${Math.random().toString(36).slice(2, 8)}`;
          for (let s = 0; s < SAMPLES; s++) {
            toast(`正在执行 ${platforms[i]} (${i + 1}/${platforms.length}) · 采样 ${s + 1}/${SAMPLES}...`);
            try {
              await runTaskOnServer({
                platform: platforms[i],
                prompt,
                propositions,
                fingerprints,
                intent,
                intentId: strategy?.id || "product_discovery",
                campaignId: "default_campaign",
                campaign_id: campaignId,
                runBatchId,
              });
            } catch (err: any) {
              toast(`${platforms[i]} 采样 ${s + 1} 失败: ${err.message || "未知错误"}`);
            }
          }
          // Refresh after each platform finishes its samples
          const obs = await fetchObservations();
          setObservations(obs);
          if (obs.length > 0) lastPollRef.current = obs[0].timestamp;
        }
        toast(`全部 ${platforms.length} 个平台执行完毕（每平台 ${SAMPLES} 次采样）`, "success");
      } catch (error) {
        const msg = error instanceof Error ? error.message : "未知错误";
        console.error("任务执行失败:", msg);
        toast(`监测失败: ${msg}`);
      } finally {
        setIsRunningTask(false);
      }
    },
    [user, toast]
  );

  // Setup: run against all 5 platforms sequentially (for first-time login)
  const setupAllPlatforms = useCallback(async () => {
    if (!user) return;
    const platforms = ["Kimi", "豆包", "DeepSeek", "通义千问", "文心一言", "元宝"];
    const defaultPrompt = "低功耗应用中最好的 MCU 是什么？";
    const propositions = [
      "Industry leading power efficiency",
      "Comprehensive ecosystem",
      "Advanced security features",
    ];
    const fingerprints = ["STM32C5", "U5 series", "Cortex-M0+"];

    setIsRunningTask(true);
    for (let i = 0; i < platforms.length; i++) {
      try {
        toast(`正在登录 ${platforms[i]} (${i + 1}/${platforms.length})...`);
        await runTaskOnServer({
          platform: platforms[i],
          prompt: defaultPrompt,
          propositions,
          fingerprints,
          intent: "产品发现",
          intentId: "setup",
          campaignId: "setup",
          campaign_id: "setup",
        });
        toast(`${platforms[i]} 登录成功 (${i + 1}/${platforms.length})`, "success");
      } catch (err: any) {
        toast(`${platforms[i]} 失败: ${err.message || "未知错误"}`);
      }
    }
    // Refresh after all
    try {
      const obs = await fetchObservations();
      setObservations(obs);
    } catch {}
    setIsRunningTask(false);
  }, [user, toast]);

  return {
    observations,
    strategies,
    isRunningTask,
    setupAllPlatforms,
    lastSyncAt,
    saveStrategy,
    importCSV,
    deleteObservation,
    updateStrategy: updateStrategyFn,
    deleteStrategy: deleteStrategyFn,
    runTask,
  };
}
