import { useState, useEffect, useCallback } from "react";
import { RefreshCcw, CheckCircle2, XCircle, AlertTriangle, Clock, Download } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { fetchLogs, type TaskLogEntry } from "../services/api";

const STATUS_ICON: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  success: { icon: CheckCircle2, color: "text-emerald-500", label: "成功" },
  eval_failed: { icon: AlertTriangle, color: "text-amber-500", label: "评估失败" },
  scrape_failed: { icon: XCircle, color: "text-red-500", label: "抓取失败" },
  error: { icon: XCircle, color: "text-red-500", label: "错误" },
};

function exportLogsCSV(logs: TaskLogEntry[]) {
  const header = ["时间", "平台", "提问", "状态", "详情"];
  const rows = logs.map((l) => [
    l.timestamp,
    l.platform,
    `"${(l.prompt || "").replace(/"/g, '""')}"`,
    STATUS_ICON[l.status]?.label || l.status,
    `"${l.message || ""}"`,
  ]);
  const bom = "﻿";
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `task-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const [logs, setLogs] = useState<TaskLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await fetchLogs());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-5xl space-y-8">
      {/* ── System Config ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-st-blue" />
          <h3 className="text-2xl font-black text-st-blue uppercase tracking-tight">
            系统核心设置
          </h3>
        </div>
        <div className="st-card divide-y divide-gray-100">
          <div className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
            <div>
              <p className="font-black text-st-blue uppercase tracking-wider">
                监测任务频率
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                系统自动轮询 AI 平台的周期设定
              </p>
            </div>
            <select disabled className="bg-st-grey border-none text-st-blue font-black text-[10px] uppercase tracking-widest px-6 py-2.5 outline-none opacity-50 cursor-not-allowed" title="功能开发中，暂不可用">
              <option>每 6 小时</option>
              <option>每天 (24H)</option>
              <option>每周 (7D)</option>
            </select>
          </div>
          <div className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
            <div>
              <p className="font-black text-st-blue uppercase tracking-wider">
                智能预警阈值
                <span className="ml-2 px-2 py-0.5 bg-st-yellow/10 text-st-yellow text-[8px] font-bold uppercase align-middle">开发中</span>
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                当品牌可见度跌破 50% 时触发紧急通知
              </p>
            </div>
            <div className="w-12 h-6 bg-st-grey p-1 relative shadow-inner opacity-50 cursor-not-allowed" title="功能开发中，暂不可用">
              <div className="absolute left-1 top-1 w-4 h-4 bg-white shadow-sm" />
            </div>
          </div>
          <div className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
            <div>
              <p className="font-black text-st-blue uppercase tracking-wider">
                数据保留策略
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                历史监测记录在云端的存储时长
              </p>
            </div>
            <select disabled className="bg-st-grey border-none text-st-blue font-black text-[10px] uppercase tracking-widest px-6 py-2.5 outline-none opacity-50 cursor-not-allowed" title="当前为 180 天自动清理。功能开发中，暂不可配置">
              <option>180 天 (当前)</option>
              <option>90 天</option>
              <option>永久保留</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Task Logs ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-st-light-blue" />
            <h3 className="text-2xl font-black text-st-blue uppercase tracking-tight">
              任务执行日志
            </h3>
          </div>
          <div className="flex gap-3">
            {logs.length > 0 && (
              <button
                onClick={() => exportLogsCSV(logs)}
                className="flex items-center gap-2 px-4 py-2.5 bg-st-blue text-white text-[10px] font-black uppercase tracking-widest hover:bg-st-blue/90 transition-colors"
              >
                <Download size={14} />
                导出日志 CSV
              </button>
            )}
            <button
              onClick={load}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-st-blue transition-colors"
            >
              <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
              刷新
            </button>
          </div>
        </div>

        <div className="st-card overflow-hidden">
          {logs.length === 0 && !loading ? (
            <div className="p-16 text-center text-gray-300">
              <Clock size={48} strokeWidth={1} className="mx-auto mb-4" />
              <p className="text-xs font-black uppercase tracking-widest">暂无任务日志</p>
              <p className="text-[10px] text-gray-400 mt-1">执行监测后日志会显示在这里</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                    <th className="px-6 py-4 w-44">时间</th>
                    <th className="px-6 py-4 w-24">平台</th>
                    <th className="px-6 py-4">提问</th>
                    <th className="px-6 py-4 w-24">状态</th>
                    <th className="px-6 py-4">详情</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => {
                    const st = STATUS_ICON[log.status] || STATUS_ICON.error;
                    const Icon = st.icon;
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="px-6 py-3.5 text-[10px] font-mono font-bold text-gray-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString("zh-CN", {
                            month: "2-digit", day: "2-digit",
                            hour: "2-digit", minute: "2-digit", second: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="px-2 py-0.5 bg-st-blue text-white text-[9px] font-black uppercase tracking-wider">
                            {log.platform}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-xs font-bold text-st-blue max-w-xs truncate">
                          {log.prompt}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={cn("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider", st.color)}>
                            <Icon size={12} />
                            {st.label}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-[10px] text-gray-500 font-medium max-w-xs truncate">
                          {log.message || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-st-yellow/10 border-l-4 border-st-yellow p-4">
        <p className="text-[10px] font-bold text-st-blue uppercase tracking-wider">
          监测频率、预警阈值等部分设置功能开发中，当前仅展示 UI。
        </p>
      </div>
    </div>
  );
}
