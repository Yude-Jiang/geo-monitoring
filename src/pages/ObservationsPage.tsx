import { History, Trash2 } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { Observation } from "../types";

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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-st-blue" />
          <h3 className="text-2xl font-black text-st-blue uppercase tracking-tight">
            历史监测档案
          </h3>
        </div>
        <div className="flex gap-3">
          <span className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            共 {observations.length} 条记录
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
        {observations.map((obs) => (
          <div
            key={obs.id}
            className="st-card overflow-hidden hover:translate-y-[-4px] transition-all duration-300 group"
          >
            <div className="aspect-video bg-st-grey relative overflow-hidden">
              {obs.screenshot_url ? (
                <img
                  src={obs.screenshot_url}
                  alt="Screenshot"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <History size={48} strokeWidth={1} />
                </div>
              )}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-st-blue text-white text-[9px] font-black uppercase tracking-[0.2em] shadow-xl">
                  {obs.platform}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <p className="text-[9px] font-black text-st-light-blue uppercase tracking-[0.3em] mb-2">
                  {obs.intent}
                </p>
                <h4 className="font-black text-st-blue tracking-tight line-clamp-2 leading-tight">
                  {obs.prompt_text}
                </h4>
              </div>
              <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">
                      提及品牌
                    </span>
                    <span
                      className={cn(
                        "text-xs font-black uppercase",
                        obs.mentioned ? "text-emerald-600" : "text-gray-300"
                      )}
                    >
                      {obs.mentioned ? "YES" : "NO"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">
                      首选推荐
                    </span>
                    <span
                      className={cn(
                        "text-xs font-black uppercase",
                        obs.top_rec ? "text-st-light-blue" : "text-gray-300"
                      )}
                    >
                      {obs.top_rec ? "TOP" : "NONE"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRequestDelete(obs.id)}
                    className="p-2 text-gray-300 hover:text-st-red transition-all"
                    aria-label="Delete observation"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => onSelectObservation(obs)}
                    className="flex items-center gap-2 px-4 py-2 bg-st-grey text-[9px] font-black text-st-blue uppercase tracking-widest hover:bg-st-yellow transition-all"
                  >
                    <History size={12} />
                    回放证据
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
