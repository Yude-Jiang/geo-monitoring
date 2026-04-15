import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn } from "@/src/lib/utils";

const SOV_COLORS = ["#00205B", "#FFD200", "#3cb4e5", "#94a3b8", "#e2e8f0", "#f8fafc"];

interface AnalyticsPageProps {
  factorContributionData: { name: string; value: number }[];
  competitorSovData: { name: string; value: number }[];
  benchmarkData: { label: string; base: number; post: number }[];
  platformPerformanceData: { name: string; visibility: string; sentiment: string }[];
  strategyEffectivenessData: { prompt: string; effectiveness: number }[];
  heatmapData: {
    intents: string[];
    platforms: string[];
    getValue: (platform: string, intent: string) => number;
  };
}

export function AnalyticsPage({
  factorContributionData,
  competitorSovData,
  benchmarkData,
  platformPerformanceData,
  strategyEffectivenessData,
  heatmapData,
}: AnalyticsPageProps) {
  return (
    <div className="space-y-10">
      {/* Section Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-st-blue" />
          <h3 className="text-2xl font-black text-st-blue uppercase tracking-tight">
            深度归因与分析
          </h3>
        </div>
      </div>

      {/* Heatmap + Benchmark */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Platform × Intent Heatmap — now dynamic */}
        <div className="st-card p-6 lg:p-8">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-st-blue uppercase tracking-wider">
              Platform × Intent 可见度热力图
            </h4>
            <span className="text-[10px] font-black text-st-light-blue uppercase tracking-widest">
              单位: %
            </span>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `auto repeat(${heatmapData.intents.length}, 1fr)` }}>
            <div />
            {heatmapData.intents.map((intent) => (
              <div
                key={intent}
                className="text-[9px] font-black text-gray-400 uppercase text-center"
              >
                {intent}
              </div>
            ))}
            {heatmapData.platforms.map((platform) => (
              <React.Fragment key={platform}>
                <div className="text-[9px] font-black text-st-blue uppercase flex items-center">
                  {platform}
                </div>
                {heatmapData.intents.map((intent) => {
                  const val = heatmapData.getValue(platform, intent);
                  return (
                    <div
                      key={intent}
                      className={cn(
                        "aspect-square flex items-center justify-center text-[10px] font-black",
                        val > 70
                          ? "bg-st-blue text-white"
                          : val > 50
                          ? "bg-st-blue/60 text-white"
                          : val > 30
                          ? "bg-st-blue/30 text-st-blue"
                          : "bg-st-grey text-gray-400"
                      )}
                    >
                      {val}%
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-st-blue" />
              <span className="text-[9px] font-black text-gray-400 uppercase">
                高可见度 ({">"}70%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-st-blue/30" />
              <span className="text-[9px] font-black text-gray-400 uppercase">
                低可见度 ({"<"}30%)
              </span>
            </div>
          </div>
        </div>

        {/* Benchmark vs Post-launch */}
        <div className="st-card p-6 lg:p-8">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-st-blue uppercase tracking-wider">
              Benchmark vs Post-launch 对照图
            </h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-gray-300" />
                <span className="text-[9px] font-black text-gray-400 uppercase">
                  Benchmark
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-st-yellow" />
                <span className="text-[9px] font-black text-st-yellow uppercase">
                  Post-launch
                </span>
              </div>
            </div>
          </div>
          <div className="h-64 flex items-end gap-8 px-4">
            {benchmarkData.map((item) => (
              <div
                key={item.label}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div className="w-full flex items-end justify-center gap-1 h-full">
                  <div
                    className="w-4 bg-gray-200"
                    style={{ height: `${item.base}%` }}
                  />
                  <div
                    className="w-4 bg-st-yellow shadow-lg shadow-st-yellow/20"
                    style={{ height: `${item.post}%` }}
                  />
                </div>
                <span className="text-[10px] font-black text-st-blue uppercase tracking-widest">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "text-[9px] font-black",
                    item.post >= item.base
                      ? "text-emerald-600"
                      : "text-rose-600"
                  )}
                >
                  {item.post >= item.base ? "+" : ""}
                  {item.post - item.base}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Factor Contribution + Competitor SOV */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 st-card p-6 lg:p-10">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-st-blue uppercase tracking-wider">
              归因因子贡献度分析
            </h4>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Factor Contribution
            </span>
          </div>
          <div className="h-80 w-full">
            {factorContributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={factorContributionData}
                  layout="vertical"
                  margin={{ left: 40, right: 40 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#00205B", fontSize: 10, fontWeight: "bold" }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "0px",
                      border: "1px solid #e2e8f0",
                      fontSize: "10px",
                      fontWeight: "bold",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#00205B"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  >
                    {factorContributionData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index === 0
                            ? "#00205B"
                            : index === 1
                            ? "#FFD200"
                            : index === 2
                            ? "#3cb4e5"
                            : "#94a3b8"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 italic text-xs">
                暂无归因数据
              </div>
            )}
          </div>
        </div>

        {/* Competitor SOV Pie */}
        <div className="st-card p-6 lg:p-10">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-st-blue uppercase tracking-wider">
              Competitor SOV
            </h4>
            <span className="text-[10px] font-black text-st-light-blue uppercase tracking-widest">
              Share of Voice
            </span>
          </div>
          <div className="h-64 w-full">
            {competitorSovData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={competitorSovData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {competitorSovData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={SOV_COLORS[index % SOV_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "0px",
                      border: "1px solid #e2e8f0",
                      fontSize: "10px",
                      fontWeight: "bold",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 italic text-xs">
                暂无竞品提及数据
              </div>
            )}
          </div>
          <div className="mt-6 space-y-2">
            {competitorSovData.map((item, i) => {
              const total = competitorSovData.reduce(
                (acc, curr) => acc + curr.value,
                0
              );
              return (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2"
                      style={{
                        backgroundColor: SOV_COLORS[i % SOV_COLORS.length],
                      }}
                    />
                    <span className="text-[10px] font-black text-st-blue uppercase truncate max-w-[120px]">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-500">
                    {((item.value / total) * 100).toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Platform Performance + Strategy Effectiveness */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="st-card p-6 lg:p-10">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-st-blue uppercase tracking-wider">
              AI 平台表现分析
            </h4>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Platform Performance
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    平台
                  </th>
                  <th className="text-center pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    可见度
                  </th>
                  <th className="text-right pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    情感均分
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {platformPerformanceData.map((plat) => (
                  <tr
                    key={plat.name}
                    className="group hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-4">
                      <span className="text-xs font-black text-st-blue uppercase">
                        {plat.name}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-[10px] font-bold text-st-blue">
                        {plat.visibility}%
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <span
                        className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded",
                          Number(plat.sentiment) > 7
                            ? "bg-emerald-50 text-emerald-600"
                            : Number(plat.sentiment) > 4
                            ? "bg-st-yellow/10 text-st-yellow"
                            : "bg-rose-50 text-rose-600"
                        )}
                      >
                        {plat.sentiment}/10
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="st-card p-6 lg:p-10">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-st-blue uppercase tracking-wider">
              策略有效性排行 (Top 5)
            </h4>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Strategy Effectiveness
            </span>
          </div>
          <div className="h-64 w-full">
            {strategyEffectivenessData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={strategyEffectivenessData}
                  layout="vertical"
                  margin={{ left: 10, right: 30 }}
                >
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis
                    dataKey="prompt"
                    type="category"
                    width={120}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#00205B", fontSize: 9, fontWeight: "bold" }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "0px",
                      border: "1px solid #e2e8f0",
                      fontSize: "10px",
                      fontWeight: "bold",
                    }}
                  />
                  <Bar
                    dataKey="effectiveness"
                    fill="#FFD200"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 italic text-xs">
                暂无策略数据
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
