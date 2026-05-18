import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { fetchObservationsByCampaign, fetchStrategiesByCampaign, type Campaign } from "../services/api";
import { useAnalytics } from "../hooks/useAnalytics";
import { StatCard } from "../components/common/StatCard";
import { PlaybackModal } from "../components/common/PlaybackModal";
import type { Observation } from "../types";

interface CampaignPageProps {
  campaign: Campaign;
  onBack: () => void;
}

export function CampaignPage({ campaign, onBack }: CampaignPageProps) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [selectedObs, setSelectedObs] = useState<Observation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchObservationsByCampaign(campaign.id)
      .then(setObservations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [campaign.id]);

  const analytics = useAnalytics(observations);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-st-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-st-blue transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black text-st-blue uppercase tracking-tight">
              {campaign.name}
            </h2>
            {campaign.description && (
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                {campaign.description}
              </p>
            )}
          </div>
        </div>
        <span className="text-[10px] font-mono text-gray-400">
          目标可见度: {campaign.target_visibility}%
        </span>
      </div>

      {/* Stats bar */}
      <div className="bg-st-blue p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-st-yellow mb-1">
              Attribution Confidence Score
            </p>
            <span className="text-4xl font-black text-st-yellow">
              {analytics.acsScoreData.value}
            </span>
            {analytics.acsScoreData.confidence && (
              <span className="text-base font-bold text-white/30 ml-2">/ 100</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-[9px] text-white/40 uppercase tracking-widest">可见度</p>
              <p className="text-lg font-black">{analytics.visibilityRate}%</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-white/40 uppercase tracking-widest">首推率</p>
              <p className="text-lg font-black text-st-yellow">{analytics.topRecRate}%</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-white/40 uppercase tracking-widest">主张命中</p>
              <p className="text-lg font-black">{analytics.propHitRate}%</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-white/40 uppercase tracking-widest">情感</p>
              <p className="text-lg font-black">{analytics.avgSentiment}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="st-card p-6">
          <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-4">平台可见度对比</h4>
          {analytics.platformPerformanceData.map((p) => (
            <div key={p.name} className="flex items-center gap-3 mb-3">
              <span className="w-16 text-[10px] font-bold text-st-blue uppercase">{p.name}</span>
              <div className="flex-1 h-1.5 bg-st-grey">
                <div className="h-full bg-st-blue" style={{ width: `${p.visibility}%` }} />
              </div>
              <span className="text-[10px] font-bold text-gray-400 w-10 text-right">{p.visibility}%</span>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div className="st-card p-6">
          <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-4">Intent × Platform</h4>
          {analytics.heatmapData.intents.length > 0 ? (
            <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${analytics.heatmapData.intents.length}, 1fr)` }}>
              <div />
              {analytics.heatmapData.intents.map((intent) => (
                <div key={intent} className="text-[8px] font-bold text-gray-400 uppercase text-center">{intent}</div>
              ))}
              {analytics.heatmapData.platforms.map((platform) => (
                <div key={platform} className="contents">
                  <div className="text-[8px] font-bold text-st-blue uppercase flex items-center">{platform}</div>
                  {analytics.heatmapData.intents.map((intent) => {
                    const val = analytics.heatmapData.getValue(platform, intent);
                    // Count observations for this cell
                    const n = observations.filter(
                      (o) => o.platform === platform && o.intent === intent
                    ).length;
                    return (
                      <div
                        key={intent}
                        className={`aspect-square flex flex-col items-center justify-center text-[8px] font-black p-0.5 ${
                          n < 5 ? "border border-dashed border-gray-300 bg-gray-50" : ""
                        } ${
                          val > 70 ? "bg-st-blue text-white" :
                          val > 50 ? "bg-st-blue/60 text-white" :
                          val > 30 ? "bg-st-blue/30 text-st-blue" :
                          n > 0 ? "bg-st-grey text-gray-400" :
                          "bg-gray-100 text-gray-300"
                        }`}
                      >
                        <span>{val}%</span>
                        <span className={`text-[6px] ${n < 5 ? "text-red-400" : "text-inherit opacity-50"}`}>
                          n={n}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-300 italic">暂无数据</p>
          )}
        </div>
      </div>

      {/* Source domains + GEO insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SourceDomains observations={observations} />
        <GeoInsights campaign={campaign} observations={observations} analytics={analytics} />
      </div>

      {/* Recent observations */}
      <div className="st-card overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em]">监测记录（最近 20 条）</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                <th className="px-6 py-3">时间</th>
                <th className="px-6 py-3">平台</th>
                <th className="px-6 py-3">意图</th>
                <th className="px-6 py-3">提及</th>
                <th className="px-6 py-3">首推</th>
                <th className="px-6 py-3">情感</th>
                <th className="px-6 py-3">来源</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {observations.slice(0, 20).map((obs) => (
                <tr key={obs.id} className="hover:bg-gray-50/30 text-[10px]">
                  <td className="px-6 py-2.5 font-mono text-gray-500 whitespace-nowrap">
                    {new Date(obs.timestamp).toLocaleString("zh-CN", {
                      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-2.5">
                    <span className="px-1.5 py-0.5 bg-st-blue text-white text-[8px] font-bold uppercase">
                      {obs.platform}
                    </span>
                  </td>
                  <td className="px-6 py-2.5 font-bold text-st-blue">{obs.intent}</td>
                  <td className="px-6 py-2.5">{obs.mentioned ? "✅" : "—"}</td>
                  <td className="px-6 py-2.5">{obs.top_rec ? "🔝" : "—"}</td>
                  <td className="px-6 py-2.5 font-bold">{obs.sentiment}/10</td>
                  <td className="px-6 py-2.5 max-w-[200px] truncate">
                    {(obs.source_urls || []).slice(0, 2).map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-st-light-blue underline block truncate"
                      >
                        {new URL(url).hostname}
                      </a>
                    ))}
                  </td>
                  <td className="px-6 py-2.5">
                    <button
                      onClick={() => setSelectedObs(obs)}
                      className="p-1 text-gray-300 hover:text-st-blue"
                    >
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Playback modal */}
      {selectedObs && (
        <PlaybackModal obs={selectedObs} onClose={() => setSelectedObs(null)} />
      )}
    </div>
  );
}

// ─── Source domain analysis ───────────────────────────────────────────────

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return url; }
}

function SourceDomains({ observations }: { observations: Observation[] }) {
  const domains = useMemo(() => {
    const counts: Record<string, number> = {};
    const competitorDomains = ["ti.com", "nxp.com", "renesas.com", "espressif.com", "microchip.com"];
    observations.forEach((o) => {
      (o.source_urls || []).forEach((url) => {
        const d = extractDomain(url);
        counts[d] = (counts[d] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([domain, count]) => ({
        domain,
        count,
        isCompetitor: competitorDomains.some((c) => domain.includes(c)),
      }));
  }, [observations]);

  if (domains.length === 0) return null;

  return (
    <div className="st-card p-6">
      <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-4">来源域名分析</h4>
      <div className="space-y-2">
        {domains.map((d) => (
          <div key={d.domain} className="flex items-center gap-3">
            <span className={`w-24 text-[10px] font-bold truncate ${d.isCompetitor ? "text-red-500" : "text-st-blue"}`}>
              {d.domain}
              {d.isCompetitor && <span className="text-[8px] ml-1 text-red-400">竞品</span>}
            </span>
            <div className="flex-1 h-1.5 bg-st-grey">
              <div
                className={`h-full ${d.isCompetitor ? "bg-red-300" : "bg-st-blue"}`}
                style={{ width: `${Math.min(100, (d.count / Math.max(...domains.map((x) => x.count))) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-gray-400 w-8 text-right">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── GEO Insights ─────────────────────────────────────────────────────────

function GeoInsights({
  campaign,
  observations,
  analytics,
}: {
  campaign: { target_visibility: number };
  observations: Observation[];
  analytics: ReturnType<typeof import("../hooks/useAnalytics").useAnalytics>;
}) {
  const insights = useMemo(() => {
    const items: { type: "positive" | "negative" | "info"; text: string }[] = [];
    const t = campaign.target_visibility || 50;

    // Per-platform visibility check
    analytics.platformPerformanceData.forEach((p) => {
      const v = Number(p.visibility);
      if (v >= t) {
        items.push({ type: "positive", text: `${p.name} 可见度 ${p.visibility}%，达到目标 (≥${t}%)` });
      } else if (v < t * 0.6) {
        items.push({ type: "negative", text: `${p.name} 可见度仅 ${p.visibility}%，远低于目标 ${t}%` });
      }
    });

    // Check sample sizes
    if (observations.length < 5) {
      items.unshift({ type: "info", text: `样本量仅 ${observations.length} 条，建议增加到至少 20 条以获得可靠指标` });
    }

    // Overall sentiment
    const avgSent = Number(analytics.avgSentiment);
    if (avgSent >= 7) {
      items.push({ type: "positive", text: `整体情感分 ${analytics.avgSentiment}/10，品牌口碑良好` });
    } else if (avgSent < 4 && observations.length >= 5) {
      items.push({ type: "negative", text: `整体情感分仅 ${analytics.avgSentiment}/10，需关注品牌负面提及` });
    }

    // Top recommendation check
    if (Number(analytics.topRecRate) >= 30) {
      items.push({ type: "positive", text: `首选推荐率 ${analytics.topRecRate}%，AI 平台优先推荐本品牌` });
    }

    return items;
  }, [observations, analytics, campaign.target_visibility]);

  if (insights.length === 0) return null;

  return (
    <div className="st-card p-6">
      <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-4">GEO 策略建议</h4>
      <div className="space-y-2">
        {insights.map((item, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 text-[10px] font-bold leading-relaxed px-3 py-2 ${
              item.type === "positive"
                ? "bg-emerald-50 text-emerald-700 border-l-2 border-emerald-400"
                : item.type === "negative"
                ? "bg-red-50 text-red-700 border-l-2 border-red-400"
                : "bg-st-grey text-st-blue border-l-2 border-st-light-blue"
            }`}
          >
            <span className="flex-shrink-0 mt-0.5">
              {item.type === "positive" ? "✅" : item.type === "negative" ? "⚠️" : "ℹ️"}
            </span>
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}
