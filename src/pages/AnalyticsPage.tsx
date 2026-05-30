import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { cn } from "@/src/lib/utils";
import type { Observation } from "../types";
import { fetchCampaigns, type Campaign } from "../services/api";
import { useAnalytics } from "../hooks/useAnalytics";

const SOV_COLORS = ["#00205B", "#FFD200", "#3cb4e5", "#64748b", "#0ea5e9", "#f59e0b"];

interface AnalyticsPageProps {
  observations: Observation[];
}

export function AnalyticsPage({ observations }: AnalyticsPageProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedIntent, setSelectedIntent] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<7 | 30 | 0>(0);

  useEffect(() => { fetchCampaigns().then(setCampaigns).catch(() => {}); }, []);

  // Distinct collection locations present in the data (distributed nodes)
  const availableLocations = useMemo(() => {
    return [...new Set(observations.map((o) => o.location).filter((l): l is string => Boolean(l)))].sort();
  }, [observations]);

  // Filter observations by campaign + intent + location + time range
  const filtered = useMemo(() => {
    let obs = observations;
    if (selectedCampaign !== "all") {
      obs = obs.filter((o) => o.campaign_id === selectedCampaign);
    }
    if (selectedIntent !== "all") {
      obs = obs.filter((o) => o.intent === selectedIntent);
    }
    if (selectedLocation !== "all") {
      obs = obs.filter((o) => (o.location || "（未标注/中央）") === selectedLocation);
    }
    if (timeRange > 0) {
      const since = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString();
      obs = obs.filter((o) => o.timestamp >= since);
    }
    return obs;
  }, [observations, selectedCampaign, selectedIntent, selectedLocation, timeRange]);

  // Per-location visibility comparison (the core value of distributed collection):
  // does the same brand/prompt surface differently across mainland regions?
  const locationComparison = useMemo(() => {
    const byLoc = new Map<string, Observation[]>();
    for (const o of filtered) {
      const loc = o.location || "（未标注/中央）";
      if (!byLoc.has(loc)) byLoc.set(loc, []);
      byLoc.get(loc)!.push(o);
    }
    return [...byLoc.entries()]
      .map(([loc, set]) => {
        const n = set.length;
        return {
          location: loc,
          n,
          mention: Math.round((set.filter((o) => o.mentioned).length / n) * 100),
          topRec: Math.round((set.filter((o) => o.top_rec).length / n) * 100),
          sentiment: (set.reduce((a, o) => a + o.sentiment, 0) / n).toFixed(1),
        };
      })
      .sort((a, b) => b.mention - a.mention);
  }, [filtered]);

  // Derive available intents from (already campaign-filtered) observations
  const availableIntents = useMemo(() => {
    return [...new Set(observations.filter((o) => selectedCampaign === "all" || o.campaign_id === selectedCampaign).map((o) => o.intent))].sort();
  }, [observations, selectedCampaign]);

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
      { label: "主张", base: base.propHit, post: post.propHit },
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
          {/* Intent selector */}
          <select
            value={selectedIntent}
            onChange={(e) => setSelectedIntent(e.target.value)}
            className="bg-st-grey border-none text-st-blue font-black text-[10px] uppercase tracking-widest px-4 py-2.5 outline-none"
          >
            <option value="all">全部意图</option>
            {availableIntents.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
          {/* Location selector — only when distributed nodes have reported */}
          {availableLocations.length > 0 && (
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-st-blue border-none text-white font-black text-[10px] uppercase tracking-widest px-4 py-2.5 outline-none"
              title="按采集地域筛选"
            >
              <option value="all">全部地域</option>
              {availableLocations.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          )}
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

      {/* 各地域可见度对比 — distributed collection core view */}
      {availableLocations.length > 0 && (
        <div className="st-card p-6">
          <h4 className="text-xs font-bold text-st-blue uppercase tracking-wider mb-1">各地域可见度对比</h4>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            同一品牌/Prompt 在大陆不同采集地域被 AI 提及的差异。地域差异大 = AI 回答存在地理个性化，需分区优化 GEO 策略。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 pr-4">采集地域</th>
                  <th className="py-3 px-3">样本数</th>
                  <th className="py-3 px-3">提及率</th>
                  <th className="py-3 px-3">首推率</th>
                  <th className="py-3 px-3">情感均值</th>
                  <th className="py-3 pl-3 w-1/3">提及率分布</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {locationComparison.map((row) => (
                  <tr key={row.location} className="hover:bg-gray-50/30">
                    <td className="py-3 pr-4 font-bold text-st-blue">{row.location}</td>
                    <td className="py-3 px-3 text-gray-500">
                      {row.n}
                      {row.n < 5 && <span className="ml-1 text-xs text-red-400">(不足)</span>}
                    </td>
                    <td className="py-3 px-3 font-black text-st-blue">{row.mention}%</td>
                    <td className="py-3 px-3 font-bold text-gray-600">{row.topRec}%</td>
                    <td className="py-3 px-3 font-bold text-gray-600">{row.sentiment}</td>
                    <td className="py-3 pl-3">
                      <div className="w-full h-2 bg-st-grey overflow-hidden">
                        <div className="h-full bg-st-blue transition-all duration-500" style={{ width: `${row.mention}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Heatmap + Benchmark */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Platform × Intent table */}
        <div className="st-card p-6">
          <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-1">Platform × Intent 可见度</h4>
          <p className="text-[9px] text-gray-400 mb-4 leading-relaxed">各 AI 平台在不同监测意图下的品牌提及率。帮你发现哪些平台对哪类提问更友好。</p>
          {analytics.heatmapData.intents.length > 0 ? (
            <table className="w-full text-center text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">平台</th>
                  {analytics.heatmapData.intents.map((intent) => (
                    <th key={intent} className="pb-3 px-3">
                      <div
                        className="text-xs font-semibold text-gray-500 uppercase text-center truncate cursor-default"
                        title={intent}
                        style={{ maxWidth: "80px" }}
                      >
                        {intent}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {analytics.heatmapData.platforms.map((platform) => (
                  <tr key={platform} className="hover:bg-gray-50/30">
                    <td className="py-3 text-left">
                      <span
                        className="text-xs font-bold text-st-blue uppercase cursor-default"
                        title={platform}
                      >
                        {platform}
                      </span>
                    </td>
                    {analytics.heatmapData.intents.map((intent) => {
                      const val = analytics.heatmapData.getValue(platform, intent);
                      const n = filtered.filter((o) => o.platform === platform && o.intent === intent).length;
                      return (
                        <td key={intent} className="py-3 px-3">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5",
                            n === 0 ? "text-gray-300" :
                            n < 5 ? "bg-gray-100 border border-dashed border-gray-300" :
                            val >= 70 ? "bg-emerald-50 text-emerald-700" :
                            val >= 50 ? "bg-st-blue/10 text-st-blue" :
                            val >= 30 ? "bg-st-yellow/10 text-st-yellow" :
                            "bg-gray-100 text-gray-500"
                          )}>
                            <span className="text-sm font-black">{n > 0 ? `${val}%` : "—"}</span>
                            {n > 0 && <span className={cn("text-[9px] font-medium", n < 5 ? "text-red-400" : "text-gray-400")}>({n})</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-xs text-gray-300 italic p-4">暂无数据</p>}
          <div className="mt-4 pt-3 border-t border-gray-100 flex gap-4 text-[9px] font-medium text-gray-400">
            <span>🟢 ≥70%</span>
            <span>🔵 50-69%</span>
            <span>🟡 30-49%</span>
            <span>⚪ &lt;30%</span>
            <span className="text-red-400">虚线 = 样本不足</span>
          </div>
        </div>

        {/* Benchmark: last 7 days vs previous 7 days */}
        <div className="st-card p-6">
          <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-1">7天前 vs 最近7天</h4>
          <p className="text-[9px] text-gray-400 mb-4 leading-relaxed">对比前后两周的核心指标变化，衡量 GEO 策略是否在产生正向效果。绿色正值 = 改善，红色负值 = 退步。</p>
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
              <div className="w-full flex items-center justify-center text-gray-300 text-xs italic">数据不足（需覆盖 14 天时间跨度的监测记录）</div>
            )}
          </div>
        </div>
      </div>

      {/* Factor Contribution + Competitor SOV */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 st-card p-6">
          <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-1">归因因子贡献度</h4>
          <p className="text-[9px] text-gray-400 mb-4 leading-relaxed">四因子拆解品牌表现：品牌被提及、被首位推荐、命中预设主张、引用多个不同来源。因子越高，该维度的 GEO 表现越好。</p>
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
          <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-1">竞品声量</h4>
          <p className="text-[9px] text-gray-400 mb-4 leading-relaxed">AI 回复中同时提及的竞品品牌占比。饼图越大 = 竞品在对话中被提及越频繁。</p>
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
                  <Legend
                    iconType="square"
                    iconSize={10}
                    formatter={(value) => (
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#00205B" }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-xs text-gray-300">暂无数据</div>}
          </div>
        </div>
      </div>

      {/* Platform + Strategy */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="st-card p-6">
          <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-1">AI 平台表现</h4>
          <p className="text-[9px] text-gray-400 mb-4 leading-relaxed">各 AI 平台的品牌可见度和情感评分。蓝色进度条 = 可见度百分比，右侧数字 = 情感均值（1-10）。</p>
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
          <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-1">策略有效性 Top 5</h4>
          <p className="text-[9px] text-gray-400 mb-4 leading-relaxed">按品牌提及率排行的前 5 条 Prompt 策略。找出哪些提问方式最容易触发 AI 推荐你的产品。</p>
          <div className="h-48 w-full">
            {analytics.strategyEffectivenessData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.strategyEffectivenessData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="prompt" type="category" width={130} axisLine={false} tickLine={false}
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
