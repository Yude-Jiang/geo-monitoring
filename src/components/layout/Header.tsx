import { Clock, TrendingUp, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

const TAB_LABELS: Record<string, string> = {
  dashboard: "仪表盘",
  observations: "监测记录",
  analytics: "深度分析",
  prompts: "Prompt 矩阵",
  settings: "系统设置",
};

interface HeaderProps {
  activeTab: string;
  isRunningTask: boolean;
  onRunTask: () => void;
  onSetupAll: () => void;
  lastSyncAt: Date | null;
}

export function Header({ activeTab, isRunningTask, onRunTask, onSetupAll, lastSyncAt }: HeaderProps) {
  return (
    <header className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-gray-200 z-40 px-6 lg:px-10 py-6 flex items-center justify-between shadow-sm">
      <div className="ml-10 lg:ml-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 bg-st-yellow rounded-none" />
          <h2 className="text-xl font-black text-st-blue tracking-tight uppercase">
            {TAB_LABELS[activeTab] ?? activeTab}
          </h2>
        </div>
        <p className="text-xs text-gray-500 font-medium">
          STMicroelectronics — 实时 AI 声量监测与归因分析
        </p>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
          <Clock size={14} className="text-st-yellow" />
          上次同步: {lastSyncAt ? formatDistanceToNow(lastSyncAt, { addSuffix: true, locale: zhCN }) : "从未"}
        </div>
        <button
          onClick={onSetupAll}
          disabled={isRunningTask}
          className="st-button-secondary shadow-xl"
          title="遍历全部 5 个平台，每个执行一次监测（用于首次登录各平台）"
        >
          <span className="hidden sm:inline">登录全部平台</span>
          <span className="sm:hidden">全平台</span>
        </button>
        <button
          onClick={onRunTask}
          disabled={isRunningTask}
          className="st-button-primary shadow-xl shadow-st-blue/20"
        >
          {isRunningTask ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <TrendingUp size={16} />
          )}
          <span className="hidden sm:inline">执行手动监测</span>
        </button>
      </div>
    </header>
  );
}
