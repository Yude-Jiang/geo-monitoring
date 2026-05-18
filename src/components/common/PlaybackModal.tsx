import { X, ExternalLink } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { Observation } from "../../types";

interface PlaybackModalProps {
  obs: Observation;
  onClose: () => void;
}

export function PlaybackModal({ obs, onClose }: PlaybackModalProps) {
  return (
    <div className="fixed inset-0 bg-st-blue/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col border-t-8 border-st-yellow">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <span className="px-3 py-1 bg-st-blue text-white text-[10px] font-black uppercase tracking-widest">
              {obs.platform}
            </span>
            <span className="px-2 py-1 bg-st-grey text-st-blue text-[9px] font-bold uppercase">{obs.intent}</span>
            <span className="text-[10px] font-mono text-gray-400">
              {new Date(obs.timestamp).toLocaleString("zh-CN")}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-st-red transition-colors p-1 flex-shrink-0">
            <X size={24} />
          </button>
        </div>

        {/* Body — single column, scrollable */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {/* Prompt */}
          <section>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">监测提问</h4>
            <p className="font-black text-st-blue text-sm leading-relaxed">{obs.prompt_text}</p>
          </section>

          {/* Attribution result */}
          <section>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3">归因判定</h4>
            <div className="grid grid-cols-4 gap-3">
              <div className="st-card p-3 text-center bg-white">
                <p className="text-[8px] text-gray-400 font-black uppercase mb-1">提及品牌</p>
                <p className={cn("text-sm font-black", obs.mentioned ? "text-emerald-500" : "text-gray-300")}>
                  {obs.mentioned ? "YES" : "NO"}
                </p>
              </div>
              <div className="st-card p-3 text-center bg-white">
                <p className="text-[8px] text-gray-400 font-black uppercase mb-1">首选推荐</p>
                <p className={cn("text-sm font-black", obs.top_rec ? "text-st-light-blue" : "text-gray-300")}>
                  {obs.top_rec ? "TOP" : "—"}
                </p>
              </div>
              <div className="st-card p-3 text-center bg-white">
                <p className="text-[8px] text-gray-400 font-black uppercase mb-1">排名</p>
                <p className="text-sm font-black text-st-blue">#{obs.rank_position || "—"}</p>
              </div>
              <div className="st-card p-3 text-center bg-white">
                <p className="text-[8px] text-gray-400 font-black uppercase mb-1">情感</p>
                <p className={cn("text-sm font-black", obs.sentiment >= 8 ? "text-emerald-500" : obs.sentiment >= 5 ? "text-st-yellow" : "text-red-500")}>
                  {obs.sentiment}/10
                </p>
              </div>
            </div>
          </section>

          {/* Proposition hits */}
          {obs.proposition_hits && obs.proposition_hits.length > 0 && (
            <section>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">主张命中</h4>
              <div className="flex flex-wrap gap-2">
                {obs.proposition_hits.map((hit, i) => (
                  <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase border border-emerald-100">
                    {hit}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Source URLs */}
          {(obs.source_urls || []).length > 0 && (
            <section>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">引用来源</h4>
              <div className="space-y-1">
                {(obs.source_urls || []).map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-st-light-blue hover:text-st-blue underline"
                  >
                    <ExternalLink size={10} />
                    {url}
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Competitor mentions */}
          {(obs.competitor_mentions || []).length > 0 && (
            <section>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">竞品提及</h4>
              <div className="flex flex-wrap gap-1.5">
                {obs.competitor_mentions!.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 bg-red-50 text-red-600 text-[9px] font-bold border border-red-100">{c}</span>
                ))}
              </div>
            </section>
          )}

          {/* Raw response — full width, large scrollable area */}
          <section className="flex flex-col min-h-0">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 flex-shrink-0">
              原始 AI 回答
            </h4>
            <div className="bg-st-grey border border-gray-200 p-5 text-sm leading-relaxed text-gray-700 font-medium whitespace-pre-wrap break-words overflow-y-auto max-h-[300px]">
              {obs.raw_response || "暂无原始文本记录"}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
