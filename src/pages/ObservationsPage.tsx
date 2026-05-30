import { useState, useMemo } from "react";
import { History, Trash2, Search, X, Download } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { Observation } from "../types";

function exportCSV(observations: Observation[]) {
  const header = ["平台", "时间", "意图", "提问", "提及品牌", "首选推荐", "排名", "情感分", "主张命中", "竞品提及", "原始回答"];
  const rows = observations.map((o) => [
    o.platform, o.timestamp, o.intent,
    `"${(o.prompt_text || "").replace(/"/g, '""')}"`,
    o.mentioned ? "是" : "否", o.top_rec ? "是" : "否",
    o.rank_position || "", o.sentiment,
    (o.proposition_hits || []).join("; "),
    (o.competitor_mentions || []).join("; "),
    `"${(o.raw_response || "").replace(/"/g, '""').slice(0, 2000)}"`,
  ]);
  const bom = "﻿";
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `geo-monitoring-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface ObservationsPageProps {
  observations: Observation[];
  onDeleteObservation: (id: string) => void;
  onSelectObservation: (obs: Observation) => void;
  onRequestDelete: (id: string) => void;
}

const PAGE_SIZE = 18;

export function ObservationsPage({
  observations,
  onSelectObservation,
  onRequestDelete,
}: ObservationsPageProps) {
  const [query, setQuery] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterMentioned, setFilterMentioned] = useState("all");
  const [page, setPage] = useState(1);

  const platforms = useMemo(
    () => ["all", ...Array.from(new Set(observations.map((o) => o.platform)))],
    [observations]
  );

  const filtered = useMemo(() => {
    return observations.filter((o) => {
      const matchQuery =
        !query ||
        o.prompt_text.toLowerCase().includes(query.toLowerCase()) ||
        o.intent.toLowerCase().includes(query.toLowerCase());
      const matchPlatform =
        filterPlatform === "all" || o.platform === filterPlatform;
      const matchMentioned =
        filterMentioned === "all" ||
        (filterMentioned === "yes" && o.mentioned) ||
        (filterMentioned === "no" && !o.mentioned);
      return matchQuery && matchPlatform && matchMentioned;
    });
  }, [observations, query, filterPlatform, filterMentioned]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const clearFilters = () => {
    setQuery("");
    setFilterPlatform("all");
    setFilterMentioned("all");
    setPage(1);
  };

  const hasActiveFilters = query || filterPlatform !== "all" || filterMentioned !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-st-blue" />
          <h3 className="text-2xl font-black text-st-blue uppercase tracking-tight">历史监测档案</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {filtered.length} / {observations.length} 条记录
          </span>
          {observations.length > 0 && (
            <button
              onClick={() => exportCSV(filtered.length > 0 ? filtered : observations)}
              className="flex items-center gap-2 px-4 py-2 bg-st-blue text-white text-xs font-bold uppercase tracking-wider hover:bg-st-dark transition-colors"
            >
              <Download size={13} />导出 CSV
            </button>
          )}
        </div>
      </div>

      {/* 搜索 + 过滤栏 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索 prompt 或意图..."
            value={query}
            onChange={(e) => handleFilterChange(() => setQuery(e.target.value))}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 bg-white text-sm text-st-blue placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-st-light-blue focus:border-transparent rounded-none"
          />
        </div>
        <select
          value={filterPlatform}
          onChange={(e) => handleFilterChange(() => setFilterPlatform(e.target.value))}
          className="px-4 py-2.5 border border-gray-200 bg-white text-xs font-semibold text-st-blue uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-st-light-blue rounded-none min-w-[140px]"
        >
          {platforms.map((p) => (
            <option key={p} value={p}>{p === "all" ? "全部平台" : p}</option>
          ))}
        </select>
        <select
          value={filterMentioned}
          onChange={(e) => handleFilterChange(() => setFilterMentioned(e.target.value))}
          className="px-4 py-2.5 border border-gray-200 bg-white text-xs font-semibold text-st-blue uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-st-light-blue rounded-none min-w-[140px]"
        >
          <option value="all">全部结果</option>
          <option value="yes">已提及品牌</option>
          <option value="no">未提及品牌</option>
        </select>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 bg-white text-xs font-semibold text-gray-500 hover:text-st-red hover:border-st-red transition-colors rounded-none"
          >
            <X size={12} />清除
          </button>
        )}
      </div>

      {/* 空状态 */}
      {filtered.length === 0 ? (
        <div className="st-card p-16 text-center bg-white">
          <div className="w-16 h-16 bg-st-grey flex items-center justify-center text-st-blue mx-auto mb-4">
            <Search size={28} strokeWidth={1.5} />
          </div>
          <h4 className="text-lg font-black text-st-blue uppercase tracking-tight mb-2">
            未找到匹配记录
          </h4>
          <p className="text-sm text-gray-400">尝试调整搜索关键词或过滤条件</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-4 st-button-secondary inline-flex">
              清除过滤条件
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {paginated.map((obs) => (
              <div
                key={obs.id}
                className="st-card overflow-hidden hover:translate-y-[-3px] transition-all duration-300 group"
              >
                <div className="aspect-video bg-st-grey relative overflow-hidden">
                  {obs.screenshot_url ? (
                    <img
                      src={obs.screenshot_url}
                      alt="Screenshot"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <History size={40} strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 bg-st-blue text-white text-xs font-bold uppercase tracking-wider shadow-lg">
                      {obs.platform}
                    </span>
                  </div>
                  {obs.top_rec && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-1 bg-st-yellow text-st-blue text-xs font-black uppercase">TOP</span>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-st-light-blue uppercase tracking-wider mb-1.5">
                      {obs.intent}
                    </p>
                    <h4 className="font-bold text-st-blue tracking-tight line-clamp-2 leading-snug text-sm">
                      {obs.prompt_text}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-gray-400 font-medium uppercase">提及品牌</span>
                        <span className={cn("text-xs font-bold uppercase", obs.mentioned ? "text-emerald-600" : "text-gray-300")}>
                          {obs.mentioned ? "YES" : "NO"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-gray-400 font-medium uppercase">情感分</span>
                        <span className="text-xs font-bold text-st-blue">{obs.sentiment}/10</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onRequestDelete(obs.id)}
                        className="p-2 text-gray-300 hover:text-st-red transition-colors"
                        aria-label="删除记录"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        onClick={() => onSelectObservation(obs)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-st-grey text-xs font-bold text-st-blue uppercase tracking-wider hover:bg-st-yellow transition-colors"
                      >
                        <History size={11} />回放
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-xs font-bold text-st-blue border border-gray-200 hover:bg-st-grey disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "...")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-xs">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={cn(
                          "w-8 h-8 text-xs font-bold transition-colors",
                          page === p ? "bg-st-blue text-white" : "text-gray-500 hover:bg-st-grey"
                        )}
                      >
                        {p}
                      </button>
                    )
                  )}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-xs font-bold text-st-blue border border-gray-200 hover:bg-st-grey disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
