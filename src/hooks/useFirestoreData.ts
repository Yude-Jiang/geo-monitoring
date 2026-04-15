import { useState, useEffect, useCallback } from "react";
import type { User } from "firebase/auth";
import type { Observation, PromptStrategy } from "../types";
import {
  db,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  handleFirestoreError,
  OperationType,
  deleteDoc,
  doc,
  where,
} from "../lib/firebase";
import { runTaskOnServer } from "../services/api";

export function useFirestoreData(user: User | null) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [strategies, setStrategies] = useState<PromptStrategy[]>([]);
  const [isRunningTask, setIsRunningTask] = useState(false);

  // Subscribe to observations
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "observations"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        setObservations(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Observation))
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, "observations")
    );
  }, [user]);

  // Subscribe to strategies
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "strategies"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(
      q,
      (snapshot) => {
        setStrategies(
          snapshot.docs.map(
            (d) => ({ id: d.id, ...d.data() } as PromptStrategy)
          )
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, "strategies")
    );
  }, [user]);

  // Save a new strategy
  const saveStrategy = useCallback(
    async (prompt: string, intent: string, frequency: string) => {
      if (!prompt.trim() || !user) return;
      try {
        await addDoc(collection(db, "strategies"), {
          prompt,
          intent,
          frequency,
          createdAt: new Date().toISOString(),
          userId: user.uid,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "strategies");
      }
    },
    [user]
  );

  // Delete an observation
  const deleteObservation = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, "observations", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "observations");
    }
  }, []);

  // Delete a strategy
  const deleteStrategy = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, "strategies", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "strategies");
    }
  }, []);

  // Run a monitoring task: server does scraping + evaluation, client writes to Firestore
  const runTask = useCallback(
    async (strategy?: PromptStrategy) => {
      if (!user) return;
      setIsRunningTask(true);

      try {
        const platforms = ["Kimi", "豆包", "DeepSeek", "通义千问", "文心一言"];
        const platform =
          platforms[Math.floor(Math.random() * platforms.length)];
        const prompt = strategy?.prompt ?? "低功耗应用中最好的 MCU 是什么？";
        const intent = strategy?.intent ?? "产品发现";

        const propositions = [
          "Industry leading power efficiency",
          "Comprehensive ecosystem",
          "Advanced security features",
        ];
        const fingerprints = ["STM32C5", "U5 series", "Cortex-M0+"];

        // Call server — API key stays server-side
        const result = await runTaskOnServer(
          platform,
          prompt,
          propositions,
          fingerprints
        );

        const { evaluation } = result;

        // Write to Firestore from client (uses client auth)
        await addDoc(collection(db, "observations"), {
          userId: user.uid,
          timestamp: new Date().toISOString(),
          platform: result.platform,
          intent,
          intent_id: strategy?.id || "product_discovery",
          campaign_id: "mcu_campaign_2024",
          session_type: "anonymous",
          prompt_text: prompt,
          mentioned: evaluation.mentioned_brand,
          top_rec: evaluation.top_recommendation,
          top_3_rec: evaluation.top_3_recommendation,
          sentiment: evaluation.sentiment_score,
          rank_position: evaluation.rank_position,
          proposition_hits: evaluation.proposition_hits,
          fingerprint_matches: evaluation.fingerprint_hits,
          source_urls: evaluation.source_urls || result.sourceUrls || [],
          competitor_mentions: evaluation.competitor_mentions || [],
          status: "success",
          is_mock: result.is_mock || false,
          screenshot_url: result.screenshotUrl,
          raw_response: result.responseText,
        });
      } catch (error) {
        console.error("任务执行失败:", error);
        if (
          error instanceof Error &&
          error.message.includes("permission")
        ) {
          handleFirestoreError(error, OperationType.CREATE, "observations");
        }
      } finally {
        setIsRunningTask(false);
      }
    },
    [user]
  );

  return {
    observations,
    strategies,
    isRunningTask,
    saveStrategy,
    deleteObservation,
    deleteStrategy,
    runTask,
  };
}
