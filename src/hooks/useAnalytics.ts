import { useMemo } from "react";
import type { Observation } from "../types";

export function useAnalytics(observations: Observation[]) {
  // ─── Core Stats ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = observations.length;
    if (total === 0)
      return {
        visibilityRate: "0.0",
        topRecRate: "0.0",
        propHitRate: "0.0",
        avgSentiment: "0.0",
        acsScoreData: { value: "数据不足", confidence: null },
      };

    const mentioned = observations.filter((o) => o.mentioned).length;
    const topRec = observations.filter((o) => o.top_rec).length;
    const propHit = observations.filter(
      (o) => (o.proposition_hits?.length || 0) > 0
    ).length;

    const visibilityRate = ((mentioned / total) * 100).toFixed(1);
    const topRecRate = ((topRec / total) * 100).toFixed(1);
    const propHitRate = (
      (propHit / (mentioned || 1)) *
      100
    ).toFixed(1);
    const avgSentiment = (
      observations.reduce((a, o) => a + o.sentiment, 0) / total
    ).toFixed(1);

    const acsRaw = Math.min(
      100,
      Number(visibilityRate) * 0.2 +
        Number(topRecRate) * 0.3 +
        Number(propHitRate) * 0.3 +
        Number(avgSentiment) * 10 * 0.2
    );

    const acsScoreData: { value: string; confidence: "low" | "normal" | null } =
      total < 5
        ? { value: "数据不足", confidence: null }
        : total < 20
        ? { value: acsRaw.toFixed(0), confidence: "low" }
        : { value: acsRaw.toFixed(0), confidence: "normal" };

    return { visibilityRate, topRecRate, propHitRate, avgSentiment, acsScoreData };
  }, [observations]);

  // ─── Trend calculation (current vs previous period) ─────────
  const trends = useMemo(() => {
    if (observations.length < 4) {
      return {
        visibilityTrend: { value: "0.0%", up: true },
        topRecTrend: { value: "0.0%", up: true },
        propHitTrend: { value: "0.0%", up: true },
        sentimentTrend: { value: "0.0", up: true },
      };
    }

    const sorted = [...observations].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const mid = Math.floor(sorted.length / 2);
    const prevSet = sorted.slice(0, mid);
    const currSet = sorted.slice(mid);

    const rate = (set: Observation[], pred: (o: Observation) => boolean) =>
      set.length > 0
        ? (set.filter(pred).length / set.length) * 100
        : 0;

    const prevVis = rate(prevSet, (o) => o.mentioned);
    const currVis = rate(currSet, (o) => o.mentioned);
    const prevTop = rate(prevSet, (o) => o.top_rec);
    const currTop = rate(currSet, (o) => o.top_rec);
    const prevProp = rate(
      prevSet,
      (o) => (o.proposition_hits?.length || 0) > 0
    );
    const currProp = rate(
      currSet,
      (o) => (o.proposition_hits?.length || 0) > 0
    );
    const prevSent =
      prevSet.length > 0
        ? prevSet.reduce((a, o) => a + o.sentiment, 0) / prevSet.length
        : 0;
    const currSent =
      currSet.length > 0
        ? currSet.reduce((a, o) => a + o.sentiment, 0) / currSet.length
        : 0;

    const fmt = (diff: number) => ({
      value: `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`,
      up: diff >= 0,
    });
    const fmtSent = (diff: number) => ({
      value: `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}`,
      up: diff >= 0,
    });

    return {
      visibilityTrend: fmt(currVis - prevVis),
      topRecTrend: fmt(currTop - prevTop),
      propHitTrend: fmt(currProp - prevProp),
      sentimentTrend: fmtSent(currSent - prevSent),
    };
  }, [observations]);

  // ─── Visibility trend (daily, last 7 days) ──────────────────
  const visibilityTrendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const dailyStats: Record<string, { total: number; mentioned: number }> = {};
    last7Days.forEach((date) => {
      dailyStats[date] = { total: 0, mentioned: 0 };
    });

    observations.forEach((o) => {
      const date = o.timestamp.split("T")[0];
      if (dailyStats[date]) {
        dailyStats[date].total++;
        if (o.mentioned) dailyStats[date].mentioned++;
      }
    });

    return last7Days.map((date) => {
      const s = dailyStats[date];
      return {
        date: date.slice(5),
        value: s.total > 0 ? Math.round((s.mentioned / s.total) * 100) : 0,
      };
    });
  }, [observations]);

  // ─── Competitor SOV ─────────────────────────────────────────
  const competitorSovData = useMemo(() => {
    const counts: Record<string, number> = { STMicroelectronics: 0 };
    observations.forEach((o) => {
      if (o.mentioned) counts["STMicroelectronics"]++;
      o.competitor_mentions?.forEach((comp) => {
        counts[comp] = (counts[comp] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .filter((item) => item.value > 0)
      .slice(0, 6);
  }, [observations]);

  // ─── Factor Contribution ───────────────────────────────────
  const factorContributionData = useMemo(() => {
    const total = observations.length;
    if (total === 0) return [];

    const mentioned = observations.filter((o) => o.mentioned).length;
    const topRec = observations.filter((o) => o.top_rec).length;
    const propHits = observations.filter(
      (o) => (o.proposition_hits?.length || 0) > 0
    ).length;
    const sourceHits = observations.filter(
      (o) => (o.source_urls?.length || 0) > 0
    ).length;

    return [
      { name: "品牌提及", value: Number(((mentioned / total) * 100).toFixed(1)) },
      { name: "首位推荐", value: Number(((topRec / total) * 100).toFixed(1)) },
      { name: "主张命中", value: Number(((propHits / total) * 100).toFixed(1)) },
      { name: "来源引用", value: Number(((sourceHits / total) * 100).toFixed(1)) },
    ];
  }, [observations]);

  // ─── Benchmark vs Post-launch ──────────────────────────────
  const benchmarkData = useMemo(() => {
    if (observations.length < 6) {
      return [
        { label: "提及率", base: 45, post: 45 },
        { label: "首推率", base: 12, post: 12 },
        { label: "主张命中", base: 20, post: 20 },
        { label: "情感分", base: 55, post: 55 },
      ];
    }

    const sorted = [...observations].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const mid = Math.floor(sorted.length / 2);
    const baseSet = sorted.slice(0, mid);
    const postSet = sorted.slice(mid);

    const calcStats = (set: Observation[]) => {
      const total = set.length || 1;
      return {
        mention: (set.filter((o) => o.mentioned).length / total) * 100,
        topRec: (set.filter((o) => o.top_rec).length / total) * 100,
        propHit:
          (set.filter((o) => (o.proposition_hits?.length || 0) > 0).length /
            total) *
          100,
        sentiment:
          (set.reduce((acc, o) => acc + o.sentiment, 0) / total) * 10,
      };
    };

    const bs = calcStats(baseSet);
    const ps = calcStats(postSet);

    return [
      { label: "提及率", base: Math.round(bs.mention), post: Math.round(ps.mention) },
      { label: "首推率", base: Math.round(bs.topRec), post: Math.round(ps.topRec) },
      { label: "主张命中", base: Math.round(bs.propHit), post: Math.round(ps.propHit) },
      { label: "情感分", base: Math.round(bs.sentiment), post: Math.round(ps.sentiment) },
    ];
  }, [observations]);

  // ─── Platform Performance ──────────────────────────────────
  const platformPerformanceData = useMemo(() => {
    const platforms: Record<
      string,
      { total: number; mentioned: number; sentiment: number }
    > = {};

    observations.forEach((o) => {
      if (!platforms[o.platform]) {
        platforms[o.platform] = { total: 0, mentioned: 0, sentiment: 0 };
      }
      platforms[o.platform].total++;
      if (o.mentioned) platforms[o.platform].mentioned++;
      platforms[o.platform].sentiment += o.sentiment;
    });

    return Object.entries(platforms)
      .map(([name, s]) => ({
        name,
        visibility: ((s.mentioned / s.total) * 100).toFixed(1),
        sentiment: (s.sentiment / s.total).toFixed(1),
      }))
      .sort((a, b) => Number(b.visibility) - Number(a.visibility));
  }, [observations]);

  // ─── Strategy Effectiveness ────────────────────────────────
  const strategyEffectivenessData = useMemo(() => {
    const map: Record<string, { total: number; mentioned: number }> = {};
    observations.forEach((o) => {
      const key = o.prompt_text;
      if (!map[key]) map[key] = { total: 0, mentioned: 0 };
      map[key].total++;
      if (o.mentioned) map[key].mentioned++;
    });

    return Object.entries(map)
      .map(([prompt, s]) => ({
        prompt: prompt.length > 25 ? prompt.slice(0, 25) + "..." : prompt,
        effectiveness: Number(((s.mentioned / s.total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.effectiveness - a.effectiveness)
      .slice(0, 5);
  }, [observations]);

  // ─── Heatmap (Platform × Intent — dynamic) ─────────────────
  const heatmapData = useMemo(() => {
    // Derive platforms and intents from actual observation data
    const platformSet = new Set<string>();
    const intentSet = new Set<string>();
    const grid: Record<string, Record<string, { total: number; mentioned: number }>> = {};

    observations.forEach((o) => {
      platformSet.add(o.platform);
      intentSet.add(o.intent);
      if (!grid[o.platform]) grid[o.platform] = {};
      if (!grid[o.platform][o.intent]) grid[o.platform][o.intent] = { total: 0, mentioned: 0 };
      grid[o.platform][o.intent].total++;
      if (o.mentioned) grid[o.platform][o.intent].mentioned++;
    });

    const intents = [...intentSet].sort();
    const platforms = [...platformSet].sort();

    return {
      intents,
      platforms,
      getValue: (platform: string, intent: string): number => {
        const cell = grid[platform]?.[intent];
        if (!cell || cell.total === 0) return 0;
        return Math.round((cell.mentioned / cell.total) * 100);
      },
    };
  }, [observations]);

  return {
    visibilityRate: stats.visibilityRate,
    topRecRate: stats.topRecRate,
    propHitRate: stats.propHitRate,
    avgSentiment: stats.avgSentiment,
    acsScoreData: stats.acsScoreData,
    trends,
    visibilityTrendData,
    competitorSovData,
    factorContributionData,
    benchmarkData,
    platformPerformanceData,
    strategyEffectivenessData,
    heatmapData,
  };
}
