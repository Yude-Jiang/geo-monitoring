import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/src/lib/utils";
import { StatCard } from "../components/common/StatCard";
import type { Observation } from "../types";
import { fetchCampaigns, type Campaign } from "../services/api";

interface DashboardPageProps {
  observations: Observation[];
  stats: {
    visibilityRate: string;
    topRecRate: string;
    propHitRate: string;
    avgSentiment: string;
    acsScoreData: { value: string; confidence: "low" | "normal" | null };
  };
  trends: {
    visibilityTrend: { value: string; up: boolean };
    topRecTrend: { value: string; up: boolean };
    propHitTrend: { value: string; up: boolean };
    sentimentTrend: { value: string; up: boolean };
  };
  visibilityTrendData: { date: string; value: number }[];
  platformPerformanceData: { name: string; visibility: string; sentiment: string }[];
  onDeleteObservation: (id: string) => void;
  onSelectObservation: (obs: Observation) => void;
  onNavigateToObservations: () => void;
  confirmingDeleteId: string | null;
  onRequestDelete: (id: string) => void;
  onSelectCampaign: (campaign: Campaign) => void;
}

export function DashboardPage({
  observations,
  stats,
  trends,
  visibilityTrendData,
  platformPerformanceData,
  onDeleteObservation,
  onSelectObservation,
  onNavigateToObservations,
  confirmingDeleteId,
  onRequestDelete,
  onSelectCampaign,
}: DashboardPageProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    fetchCampaigns().then(setCampaigns).catch(() => {});
  }, []);
  return (
    <div className="space-y-10">
      {/* Campaign selector bar */}
      {campaigns.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {campaigns.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCampaign(c)}
              className="st-card px-5 py-3 hover:border-st-yellow hover:translate-y-[-2px] transition-all text-left"
            >
              <p className="font-black text-st-blue uppercase tracking-tight text-sm">{c.name}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                {c.description || "无描述"} · 目标 {c.target_visibility}%
              </p>
            </button>
          ))}
          {campaigns.length === 0 && (
            <p className="text-xs text-gray-400">暂无 Campaign，请先在 Prompt 配置中创建</p>
          )}
        </div>
      )}

      {/* Executive Summary */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between bg-st-blue p-6 lg:p-8 text-white shadow-2xl gap-4">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-st-yellow mb-2">
            Executive Summary
          </h3>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tighter">
            AI SOV 综合归因表现
          </h2>
        </div>
        <div className="text-left lg:text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
            Attribution Confidence Score
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-5xl lg:text-6xl font-black",
                stats.acsScoreData.confidence === "low"
                  ? "text-st-yellow/60"
                  : stats.acsScoreData.confidence === null
                  ? "text-white/30"
                  : "text-st-yellow"
              )}
            >
              {stats.acsScoreData.value}
            </span>
            {stats.acsScoreData.confidence !== null && (
              <span className="text-xl font-bold text-white/20">/ 100</span>
            )}
          </div>
          {stats.acsScoreData.confidence === "low" && (
            <span className="text-[8px] font-bold text-st-yellow/50 uppercase tracking-widest">
              低置信度 · 数据收集中
            </span>
          )}
        </div>
      </div>

      {/* Sample sufficiency warning */}
      {observations.length < 5 ? (
        <div className="bg-st-red/10 border-l-4 border-st-red p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-st-red flex-shrink-0" />
          <p className="text-xs font-bold text-st-blue uppercase tracking-wider">
            [数据不足] 当前样本量 ({observations.length}) 不足 5 条，暂无法计算有效指标。
          </p>
        </div>
      ) : observations.length < 20 ? (
        <div className="bg-st-yellow/10 border-l-4 border-st-yellow p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-st-yellow flex-shrink-0" />
          <p className="text-xs font-bold text-st-blue uppercase tracking-wider">
            [低置信度] 当前样本量 ({observations.length}) 不足 20 条，分析结论仅供参考。
          </p>
        </div>
      ) : null}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        <StatCard
          label="品牌提及可见度"
          value={`${stats.visibilityRate}%`}
          trend={trends.visibilityTrend.value}
          trendUp={trends.visibilityTrend.up}
          description="Mention Visibility Rate"
        />
        <StatCard
          label="首选推荐率"
          value={`${stats.topRecRate}%`}
          trend={trends.topRecTrend.value}
          trendUp={trends.topRecTrend.up}
          description="Top Recommendation Rate"
          accent="yellow"
        />
        <StatCard
          label="核心主张命中率"
          value={`${stats.propHitRate}%`}
          trend={trends.propHitTrend.value}
          trendUp={trends.propHitTrend.up}
          description="Proposition Hit Rate"
        />
        <StatCard
          label="平均情感/定位分"
          value={stats.avgSentiment}
          trend={trends.sentimentTrend.value}
          trendUp={trends.sentimentTrend.up}
          description="Sentiment & Positioning"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Trend Chart */}
        <div className="lg:col-span-2 st-card p-6 lg:p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-st-blue" />
              <h3 className="font-black text-st-blue uppercase tracking-tight">
                AI SOV 趋势分析
              </h3>
            </div>
            <div className="flex gap-1 bg-st-grey p-1">
              <button className="px-4 py-1.5 text-[10px] font-black bg-white text-st-blue shadow-sm">
                7天
              </button>
              <button className="px-4 py-1.5 text-[10px] font-black text-gray-500 hover:text-st-blue transition-colors cursor-not-allowed opacity-50" title="功能开发中">
                30天
              </button>
            </div>
          </div>
          <div className="h-[300px] lg:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visibilityTrendData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3cb4e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3cb4e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "0px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    fontFamily: "Inter",
                  }}
                  formatter={(value: any) => [`${value}%`, "可见度"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3cb4e5"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Comparison */}
        <div className="st-card p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-6 bg-st-blue" />
            <h3 className="font-black text-st-blue uppercase tracking-tight">
              平台可见度对比
            </h3>
          </div>
          <div className="space-y-8">
            {platformPerformanceData.slice(0, 5).map((plat) => (
              <div key={plat.name} className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-black text-xs text-st-blue uppercase tracking-wider">
                    {plat.name}
                  </span>
                  <span className="text-[10px] font-black text-st-light-blue bg-st-light-blue/10 px-2 py-0.5">
                    {plat.visibility}% 可见度
                  </span>
                </div>
                <div className="w-full h-1.5 bg-st-grey rounded-none overflow-hidden">
                  <div
                    className="h-full bg-st-blue transition-all duration-1000"
                    style={{ width: `${plat.visibility}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 p-4 bg-st-blue text-white text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">
            数据基于最近 50 次监测结果自动生成
          </div>
        </div>
      </div>

      {/* Recent Observations Table */}
      <div className="st-card overflow-hidden">
        <div className="p-6 lg:p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-st-blue" />
            <h3 className="font-black text-st-blue uppercase tracking-tight">
              实时监测流水
            </h3>
          </div>
          <button
            className="text-st-light-blue text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-st-blue transition-colors"
            onClick={onNavigateToObservations}
          >
            查看历史全集 <ChevronRight size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                <th className="px-6 lg:px-8 py-5">时间戳</th>
                <th className="px-6 lg:px-8 py-5">监测平台</th>
                <th className="px-6 lg:px-8 py-5">监测意图</th>
                <th className="px-6 lg:px-8 py-5">品牌提及</th>
                <th className="px-6 lg:px-8 py-5">首选推荐</th>
                <th className="px-6 lg:px-8 py-5">推荐排名</th>
                <th className="px-6 lg:px-8 py-5">主张命中</th>
                <th className="px-6 lg:px-8 py-5">情感得分</th>
                <th className="px-6 lg:px-8 py-5">状态</th>
                <th className="px-6 lg:px-8 py-5 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {observations.slice(0, 5).map((obs) => (
                <tr
                  key={obs.id}
                  className="hover:bg-st-light-blue/5 transition-colors group"
                >
                  <td className="px-6 lg:px-8 py-5 text-[10px] font-bold font-mono text-gray-500">
                    {new Date(obs.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 lg:px-8 py-5">
                    <span className="px-2 py-1 bg-st-blue text-white text-[9px] font-black uppercase tracking-wider">
                      {obs.platform}
                    </span>
                  </td>
                  <td className="px-6 lg:px-8 py-5">
                    <p className="text-xs font-black text-st-blue uppercase tracking-tight">
                      {obs.intent}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium truncate max-w-[200px] mt-0.5">
                      {obs.prompt_text}
                    </p>
                  </td>
                  <td className="px-6 lg:px-8 py-5">
                    {obs.mentioned ? (
                      <div className="w-5 h-5 bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 size={14} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-gray-100 text-gray-300 flex items-center justify-center">
                        <AlertCircle size={14} />
                      </div>
                    )}
                  </td>
                  <td className="px-6 lg:px-8 py-5">
                    {obs.top_rec ? (
                      <div className="w-5 h-5 bg-st-yellow text-st-blue flex items-center justify-center shadow-sm">
                        <TrendingUp size={14} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-gray-100 text-gray-300 flex items-center justify-center">
                        <ChevronRight size={14} />
                      </div>
                    )}
                  </td>
                  <td className="px-6 lg:px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-st-blue">
                        #{obs.rank_position || "-"}
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                        Rank
                      </span>
                    </div>
                  </td>
                  <td className="px-6 lg:px-8 py-5">
                    <div className="flex flex-wrap gap-1">
                      {obs.proposition_hits?.slice(0, 2).map((hit, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 bg-st-blue/5 text-st-blue text-[8px] font-black uppercase tracking-tighter border border-st-blue/10"
                        >
                          {hit}
                        </span>
                      )) || (
                        <span className="text-gray-300 text-[8px]">NONE</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 lg:px-8 py-5">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-st-blue">
                        {obs.sentiment}
                      </span>
                      <div className="w-16 h-1 bg-st-grey overflow-hidden">
                        <div
                          className={cn(
                            "h-full",
                            obs.sentiment >= 8
                              ? "bg-emerald-500"
                              : "bg-st-light-blue"
                          )}
                          style={{ width: `${obs.sentiment * 10}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 lg:px-8 py-5">
                    <span className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 bg-emerald-500 animate-pulse" />
                      已同步
                    </span>
                  </td>
                  <td className="px-6 lg:px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onRequestDelete(obs.id)}
                        className="p-2 text-gray-300 hover:text-st-red transition-all"
                        aria-label="Delete observation"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => onSelectObservation(obs)}
                        className="p-2 text-gray-300 hover:text-st-blue hover:bg-st-grey transition-all"
                        aria-label="View details"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
