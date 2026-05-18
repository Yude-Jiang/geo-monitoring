import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { cn } from "@/src/lib/utils";
import type { Observation } from "../types";
import { fetchCampaigns, type Campaign } from "../services/api";
import { useAnalytics } from "../hooks/useAnalytics";

const SOV_COLORS = ["#00205B", "#FFD200", "#3cb4e5", "#94a3b8", "#e2e8f0", "#f8fafc"];

interface AnalyticsPageProps {
  observations: Observation[];
}

export function AnalyticsPage({ observations }: AnalyticsPageProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<7 | 30 | 0>(0);

  useEffect(() => { fetchCampaigns().then(setCampaigns).catch(() => {}); }, []);

  // Filter observations by campaign + time range
  const filtered = useMemo(() => {
    let obs = observations;
    if (selectedCampaign !== "all") {
      obs = obs.filter((o) => o.campaign_id === selectedCampaign);
    }
    if (timeRange > 0) {
      const since = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString();
      obs = obs.filter((o) => o.timestamp >= since);
    }
    return obs;
  }, [observations, selectedCampaign, timeRange]);

  // Recompute analytics from filtered data
  const analytics = useAnalytics(filtered);

  // Real benchmark: last 7 days vs previous 7 days
  const computedBenchmark = useMemo(() => {
    if (filtered.length < 4) return [] as { label: string; base: number; post: number }[];
    const now = Date.now();
    const last7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const prev7end = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const prev7start = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();

    const postSet = filtered.filter((o) => o.timestamp >= last7);
    const baseSet = filtered.filter((o) => o.timestamp >= prev7start && o.timestamp < prev7end);

    const calc = (set: Observation[]) => {
      const t = set.length || 1;
      return {
        mention: Math.round((set.filter((o) => o.mentioned).length / t) * 100),
        topRec: Math.round((set.filter((o) => o.top_rec).length / t) * 100),
        propHit: Math.round((set.filter((o) => (o.proposition_hits?.length || 0) > 0).length / t) * 100),
        sentiment: Math.round((set.reduce((a, o) => a + o.sentiment, 0) / t) * 10),
      };
    };

    const base = calc(baseSet);
    const post = calc(postSet);
    if (baseSet.length === 0 && postSet.length === 0) return [];
    return [
      { label: "提及率", base: base.mention, post: post.mention },
      { label: "首推率", base: base.topRec, post: post.topRec },
      { label: "主张", base: base.propHit, post: post.sentiment },
      { label: "情感", base: base.sentiment, post: post.sentiment },
    ];
  }, [filtered]);

  return (
    <div className="space-y-8">
      {/* Title + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-st-blue" />
          <h3 className="text-2xl font-black text-st-blue uppercase tracking-tight">深度归因与分析</h3>
          <span className="text-[10px] font-bold text-gray-400">n={filtered.length}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Campaign selector */}
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="bg-st-grey border-none text-st-blue font-black text-[10px] uppercase tracking-widest px-4 py-2.5 outline-none"
          >
            <option value="all">全部 Campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {/* Time range */}
          <div className="flex gap-1 bg-st-grey p-1">
            {([
              [7, "7天"], [30, "30天"], [0, "全部"],
            ] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTimeRange(val)}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors",
                  timeRange === val ? "bg-white text-st-blue shadow-sm" : "text-gray-400 hover:text-st-blue"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap + Benchmark */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Heatmap with sample sizes */}
        <div className="st-card p-6">
          <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-4">Platform × Intent 可见度</h4>
          {analytics.heatmapData.intents.length > 0 ? (
            <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${analytics.heatmapData.intents.length}, 1fr)` }}>
              <div />
              {analytics.heatmapData.intents.map((intent) => (
                <div key={intent} className="text-[8px] font-bold text-gray-400 uppercase text-center">{intent}</div>
              ))}
              {analytics.heatmapData.platforms.map((platform) => (
                <React.Fragment key={platform}>
                  <div className="text-[8px] font-bold text-st-blue uppercase flex items-center">{platform}</div>
                  {analytics.heatmapData.intents.map((intent) => {
                    const val = analytics.heatmapData.getValue(platform, intent);
                    const n = filtered.filter((o) => o.platform === platform && o.intent === intent).length;
                    return (
                      <div
                        key={intent}
                        className={cn(
                          "aspect-square flex flex-col items-center justify-center text-[8px] font-black p-0.5",
                          n < 5 ? "border border-dashed border-gray-300 bg-gray-50" : "",
                          val > 70 ? "bg-st-blue text-white" : val > 50 ? "bg-st-blue/60 text-white" :
                          val > 30 ? "bg-st-blue/30 text-st-blue" : n > 0 ? "bg-st-grey text-gray-400" : "bg-gray-100 text-gray-300"
                        )}
                      >
                        <span>{val}%</span>
                        <span className={`text-[6px] ${n < 5 ? "text-red-400" : "text-inherit opacity-50"}`}>n={n}</span>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          ) : <p className="text-xs text-gray-300 italic p-4">暂无数据</p>}
          <div className="mt-6 flex items-center gap-4 text-[8px] font-bold text-gray-400">
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-st-blue" /> 高 (&gt;70%)</div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-st-blue/30" /> 低 (&lt;30%)</div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 border border-dashed border-gray-300 bg-gray-50" /> n&lt;5</div>
          </div>
        </div>

        {/* Benchmark: last 7 days vs previous 7 days */}
        <div className="st-card p-6">
          <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-4">7天前 vs 最近7天</h4>
          <div className="flex items-center gap-4 mb-4 text-[8px] font-bold">
            <div className="flex items-center gap-1"><div className="w-2.5 h-1 bg-gray-300" /> 7天前</div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-1 bg-st-yellow" /> 最近7天</div>
          </div>
          <div className="h-48 flex items-end gap-6 px-2">
            {computedBenchmark.length > 0 ? (
              computedBenchmark.map((item) => (
                <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    <div className="w-4 bg-gray-200" style={{ height: `${Math.max(2, item.base)}%` }} />
                    <div className="w-4 bg-st-yellow shadow-lg shadow-st-yellow/20" style={{ height: `${Math.max(2, item.post)}%` }} />
                  </div>
                  <span className="text-[8px] font-bold text-st-blue uppercase">{item.label}</span>
                  <span className={cn("text-[7px] font-bold", item.post >= item.base ? "text-emerald-600" : "text-red-500")}>
                    {item.post >= item.base ? "+" : ""}{item.post - item.base}%
                  </span>
                </div>
              ))
            ) : (
              <div className="w-full flex items-center justify-center text-gray-300 text-xs italic">数据不足（需至少 14 天数据）</div>
            )}
          </div>
        </div>
      </div>

      {/* Factor Contribution + Competitor SOV */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 st-card p-6">
          <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-4">归因因子贡献度</h4>
          <div className="h-64 w-full">
            {analytics.factorContributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.factorContributionData} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false}
                    tick={{ fill: "#00205B", fontSize: 10, fontWeight: "bold" }} />
                  <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 0, border: "1px solid #e2e8f0", fontSize: 10, fontWeight: "bold" }} />
                  <Bar dataKey="value" fill="#00205B" radius={[0, 4, 4, 0]} barSize={20}>
                    {analytics.factorContributionData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#00205B" : i === 1 ? "#FFD200" : i === 2 ? "#3cb4e5" : "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-xs text-gray-300">暂无数据</div>}
          </div>
        </div>

        <div className="st-card p-6">
          <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-4">Competitor SOV</h4>
          <div className="h-48 w-full">
            {analytics.competitorSovData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.competitorSovData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                    {analytics.competitorSovData.map((_, i) => (
                      <Cell key={i} fill={SOV_COLORS[i % SOV_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 0, border: "1px solid #e2e8f0", fontSize: 10, fontWeight: "bold" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-xs text-gray-300">暂无数据</div>}
          </div>
          <div className="mt-4 space-y-1.5">
            {analytics.competitorSovData.map((item, i) => {
              const total = analytics.competitorSovData.reduce((a, c) => a + c.value, 0) || 1;
              return (
                <div key={item.name} className="flex items-center justify-between text-[9px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5" style={{ backgroundColor: SOV_COLORS[i % SOV_COLORS.length] }} />
                    <span className="font-bold text-st-blue uppercase truncate max-w-[100px]">{item.name}</span>
                  </div>
                  <span className="font-bold text-gray-400">{((item.value / total) * 100).toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Platform + Strategy */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="st-card p-6">
          <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-4">AI 平台表现</h4>
          <div className="space-y-4">
            {analytics.platformPerformanceData.length > 0 ? (
              analytics.platformPerformanceData.map((plat) => (
                <div key={plat.name} className="flex items-center gap-3">
                  <span className="w-16 text-[10px] font-bold text-st-blue uppercase text-right">{plat.name}</span>
                  <div className="flex-1 h-1.5 bg-st-grey">
                    <div className="h-full bg-st-blue transition-all duration-500" style={{ width: `${plat.visibility}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 w-12 text-right">{plat.visibility}%</span>
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5", Number(plat.sentiment) > 7 ? "bg-emerald-50 text-emerald-600" : Number(plat.sentiment) > 4 ? "bg-st-yellow/10 text-st-yellow" : "bg-rose-50 text-rose-600")}>
                    {plat.sentiment}
                  </span>
                </div>
              ))
            ) : <p className="text-xs text-gray-300 italic">暂无数据</p>}
          </div>
        </div>

        <div className="st-card p-6">
          <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-4">策略有效性 Top 5</h4>
          <div className="h-48 w-full">
            {analytics.strategyEffectivenessData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.strategyEffectivenessData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="prompt" type="category" width={100} axisLine={false} tickLine={false}
                    tick={{ fill: "#00205B", fontSize: 8, fontWeight: "bold" }} />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    formatter={(val: number, _name: string, props: any) => [`${val}%`, props.payload.prompt]}
                    contentStyle={{ borderRadius: 0, border: "1px solid #e2e8f0", fontSize: 10, fontWeight: "bold", maxWidth: 300 }}
                  />
                  <Bar dataKey="effectiveness" fill="#FFD200" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-xs text-gray-300">暂无数据</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
