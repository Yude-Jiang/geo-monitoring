import { ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  description: string;
  accent?: "blue" | "yellow";
}

export function StatCard({
  label,
  value,
  trend,
  trendUp,
  description,
  accent = "blue",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "st-card p-8 group hover:border-st-blue",
        accent === "yellow" && "border-t-st-yellow"
      )}
    >
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">
        {label}
      </p>
      <div className="flex items-end justify-between">
        <h4 className="text-4xl font-black tracking-tighter text-st-blue">
          {value}
        </h4>
        <div
          className={cn(
            "flex items-center gap-0.5 text-[10px] font-black px-2 py-1 shadow-sm",
            trendUp
              ? "bg-emerald-50 text-emerald-600"
              : "bg-st-red/10 text-st-red"
          )}
        >
          {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
          <Clock
            size={10}
            className={
              accent === "yellow" ? "text-st-yellow" : "text-st-light-blue"
            }
          />
          {description}
        </p>
        <div
          className={cn(
            "w-1.5 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity",
            accent === "yellow" ? "bg-st-yellow" : "bg-st-light-blue"
          )}
        />
      </div>
    </div>
  );
}
