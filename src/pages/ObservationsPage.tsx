import { History, Trash2, Download, ExternalLink } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { Observation } from "../types";

function exportCSV(observations: Observation[]) {
  const header = ["平台", "时间", "意图", "提问", "AI回答", "提及品牌", "首选推荐", "排名", "情感分", "主张命中", "竞品提及", "参考来源", "原始回答"];
  const rows = observations.map((o) => [
    o.platform, o.timestamp, o.intent,
    `"${(o.prompt_text || "").replace(/"/g, '""')}"`,
    `"${(o.raw_response || "").replace(/"/g, '""').slice(0, 150)}"`,
    o.mentioned ? "是" : "否", o.top_rec ? "是" : "否",
    o.rank_position || "", o.sentiment,
    (o.proposition_hits || []).join("; "),
    (o.competitor_mentions || []).join("; "),
    (o.source_urls || []).join("; "),
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

export function ObservationsPage({
  observations,
  onSelectObservation,
  onRequestDelete,
}: ObservationsPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-st-blue" />
          <h3 className="text-2xl font-black text-st-blue uppercase tracking-tight">历史监测档案</h3>
          <span className="text-[10px] font-bold text-gray-400">{observations.length} 条</span>
        </div>
        <div className="flex gap-3">
          {observations.length > 0 && (
            <button onClick={() => exportCSV(observations)} className="flex items-center gap-2 px-4 py-2.5 bg-st-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-st-blue/90">
              <Download size={14} />导出 CSV
            </button>
          )}
        </div>
      </div>

      <div className="st-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                <th className="px-5 py-3">平台</th>
                <th className="px-5 py-3">时间</th>
                <th className="px-5 py-3">意图</th>
                <th className="px-5 py-3">提问</th>
                <th className="px-5 py-3 w-32">AI 回答</th>
                <th className="px-5 py-3 w-14">提及</th>
                <th className="px-5 py-3 w-14">首推</th>
                <th className="px-5 py-3 w-14">排名</th>
                <th className="px-5 py-3 w-14">情感</th>
                <th className="px-5 py-3 w-28">来源</th>
                <th className="px-5 py-3 w-20 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {observations.map((obs) => (
                <tr key={obs.id} className="hover:bg-gray-50/30 transition-colors group text-[10px]">
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 bg-st-blue text-white text-[8px] font-black uppercase tracking-wider whitespace-nowrap">
                      {obs.platform}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-gray-500 whitespace-nowrap">
                    {new Date(obs.timestamp).toLocaleString("zh-CN", {
                      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-3 font-bold text-st-blue whitespace-nowrap">{obs.intent}</td>
                  <td className="px-5 py-3 font-bold text-st-blue max-w-[180px] truncate" title={obs.prompt_text}>{obs.prompt_text}</td>
                  <td className="px-5 py-3 max-w-[180px] truncate" title={obs.raw_response || ""}>
                    <span className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">
                      {obs.raw_response?.slice(0, 80) || "—"}
                      {(obs.raw_response?.length || 0) > 80 ? "…" : ""}
                    </span>
                  </td>
                  <td className="px-5 py-3">{obs.mentioned ? <span className="text-emerald-500 font-black">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3">{obs.top_rec ? <span className="text-st-light-blue font-black">TOP</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3 font-bold">#{obs.rank_position || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5", obs.sentiment >= 8 ? "bg-emerald-50 text-emerald-600" : obs.sentiment >= 5 ? "bg-st-yellow/10 text-st-yellow" : "bg-red-50 text-red-500")}>
                      {obs.sentiment}/10
                    </span>
                  </td>
                  <td className="px-5 py-3 max-w-[200px]">
                    {(obs.source_urls || []).length > 0 ? (
                      (obs.source_urls || []).slice(0, 3).map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="text-st-light-blue underline block text-[9px] truncate hover:text-st-blue"
                          title={url}>
                          {url}
                        </a>
                      ))
                    ) : <span className="text-gray-300 text-[9px]">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onSelectObservation(obs)} className="p-1.5 text-gray-300 hover:text-st-blue transition-colors" title="回放证据">
                        <History size={14} />
                      </button>
                      <button onClick={() => onRequestDelete(obs.id)} className="p-1.5 text-gray-300 hover:text-st-red transition-colors" title="删除">
                        <Trash2 size={14} />
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
