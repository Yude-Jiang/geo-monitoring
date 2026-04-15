import { AlertCircle, CheckCircle2, X } from "lucide-react";
import type { Observation } from "../../types";

interface PlaybackModalProps {
  obs: Observation;
  onClose: () => void;
}

export function PlaybackModal({ obs, onClose }: PlaybackModalProps) {
  return (
    <div className="fixed inset-0 bg-st-blue/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 lg:p-8">
      <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] shadow-2xl flex flex-col border-t-8 border-st-yellow">
        {/* Header */}
        <div className="p-6 lg:p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-st-blue text-white text-[10px] font-black uppercase tracking-widest">
                {obs.platform}
              </span>
              {obs.is_mock ? (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <AlertCircle size={12} />
                  Simulation / 模拟数据
                </span>
              ) : (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Verified Live Scrape / 真实抓取
                </span>
              )}
              <span className="text-[10px] font-bold text-gray-400 font-mono">
                {obs.timestamp}
              </span>
            </div>
            <h3 className="text-xl lg:text-2xl font-black text-st-blue tracking-tight truncate">
              {obs.prompt_text}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-st-red transition-colors p-2 flex-shrink-0"
            aria-label="Close"
          >
            <X size={32} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left panel */}
          <div className="w-full lg:w-1/3 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-gray-100 overflow-y-auto space-y-8 bg-gray-50/30">
            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] border-b border-st-blue/10 pb-2">
                归因判定结果
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="st-card p-4 bg-white">
                  <p className="text-[9px] text-gray-400 font-black uppercase mb-1">
                    推荐排名
                  </p>
                  <p className="text-xl font-black text-st-blue">
                    #{obs.rank_position || "-"}
                  </p>
                </div>
                <div className="st-card p-4 bg-white">
                  <p className="text-[9px] text-gray-400 font-black uppercase mb-1">
                    情感得分
                  </p>
                  <p className="text-xl font-black text-st-blue">
                    {obs.sentiment}/10
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] border-b border-st-blue/10 pb-2">
                主张命中 (Propositions)
              </h4>
              <div className="flex flex-wrap gap-2">
                {obs.proposition_hits && obs.proposition_hits.length > 0 ? (
                  obs.proposition_hits.map((hit, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase border border-emerald-100"
                    >
                      {hit}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-300 text-xs italic">
                    无命中主张
                  </span>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] border-b border-st-blue/10 pb-2">
                原始回答文本
              </h4>
              <div className="bg-white p-6 border border-gray-100 text-sm leading-relaxed text-gray-600 font-medium italic">
                "{obs.raw_response || "暂无原始文本记录"}"
              </div>
            </section>
          </div>

          {/* Right panel — screenshot evidence */}
          <div className="flex-1 bg-st-grey p-6 lg:p-8 overflow-y-auto">
            <h4 className="text-[10px] font-black text-st-blue uppercase tracking-[0.3em] mb-4">
              前端真实截图证据 (Evidence)
            </h4>
            {obs.screenshot_url ? (
              <div className="shadow-2xl border-4 border-white">
                <img
                  src={obs.screenshot_url}
                  alt="Evidence"
                  className="w-full h-auto"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-full aspect-video bg-gray-200 flex items-center justify-center text-gray-400">
                <AlertCircle size={48} strokeWidth={1} />
                <span className="ml-4 font-black uppercase tracking-widest">
                  未找到截图证据
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
