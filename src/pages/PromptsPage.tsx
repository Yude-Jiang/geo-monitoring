import { useState } from "react";
import { Search, TrendingUp, Plus, Trash2, X } from "lucide-react";
import type { PromptStrategy } from "../types";

interface PromptsPageProps {
  strategies: PromptStrategy[];
  isRunningTask: boolean;
  onRunTask: (strategy?: PromptStrategy) => void;
  onSaveStrategy: (prompt: string, intent: string, frequency: string) => void;
  onDeleteStrategy: (id: string) => void;
  onRequestDelete: (id: string) => void;
}

export function PromptsPage({
  strategies,
  isRunningTask,
  onRunTask,
  onSaveStrategy,
  onDeleteStrategy,
  onRequestDelete,
}: PromptsPageProps) {
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const [newIntent, setNewIntent] = useState("产品发现");
  const [newFrequency, setNewFrequency] = useState("每天 (24H)");

  const handleSave = () => {
    onSaveStrategy(newPrompt, newIntent, newFrequency);
    setIsAddingPrompt(false);
    setNewPrompt("");
  };

  // Sequential "full matrix scan" with progress
  const handleFullScan = async () => {
    for (const s of strategies) {
      await onRunTask(s);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-st-blue" />
          <h3 className="text-2xl font-black text-st-blue uppercase tracking-tight">
            Prompt 矩阵配置
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleFullScan}
            disabled={isRunningTask || strategies.length === 0}
            className="st-button-secondary shadow-lg shadow-st-blue/10 disabled:opacity-50"
          >
            <TrendingUp size={16} />
            全矩阵扫描
          </button>
          <button
            onClick={() => setIsAddingPrompt(true)}
            className="st-button-primary shadow-lg shadow-st-blue/20"
          >
            <Plus size={16} />
            新增监测策略
          </button>
        </div>
      </div>

      {strategies.length === 0 ? (
        <div className="st-card p-16 text-center bg-white">
          <div className="w-20 h-20 bg-st-grey flex items-center justify-center text-st-blue mx-auto mb-6 shadow-inner">
            <Search size={32} strokeWidth={2.5} />
          </div>
          <h4 className="text-xl font-black text-st-blue uppercase tracking-tight mb-2">
            暂无活跃监测策略
          </h4>
          <p className="text-sm text-gray-400 font-medium max-w-sm mx-auto">
            请配置您的监测 Prompt 矩阵，系统将根据策略自动追踪 AI 平台的响应变化。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {strategies.map((strategy) => (
            <div
              key={strategy.id}
              className="st-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-st-yellow transition-colors group"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-st-grey flex items-center justify-center text-st-blue group-hover:bg-st-yellow transition-colors flex-shrink-0">
                  <Search size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-st-blue text-white text-[8px] font-black uppercase tracking-widest">
                      {strategy.intent}
                    </span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                      {strategy.frequency}
                    </span>
                  </div>
                  <h4 className="font-black text-st-blue tracking-tight">
                    {strategy.prompt}
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right mr-4">
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">
                    创建时间
                  </p>
                  <p className="text-[10px] font-bold text-st-blue">
                    {new Date(strategy.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => onRunTask(strategy)}
                  disabled={isRunningTask}
                  className="st-button-secondary py-2 px-4 flex items-center gap-2 disabled:opacity-50"
                >
                  <TrendingUp size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    执行监测
                  </span>
                </button>
                <button
                  onClick={() => onRequestDelete(strategy.id)}
                  className="p-2 text-gray-300 hover:text-st-red transition-colors"
                  aria-label="Delete strategy"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Prompt Modal */}
      {isAddingPrompt && (
        <div className="fixed inset-0 bg-st-blue/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg shadow-2xl border-t-4 border-st-yellow">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <h4 className="font-black text-st-blue uppercase tracking-tight">
                配置新监测策略
              </h4>
              <button
                onClick={() => setIsAddingPrompt(false)}
                className="text-gray-400 hover:text-st-red transition-colors"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  监测 Prompt
                </label>
                <textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="例如：在低功耗应用中最好的 MCU 是什么？"
                  className="w-full h-32 bg-st-grey border-none p-4 text-sm text-st-blue font-medium focus:ring-2 focus:ring-st-light-blue outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    监测意图
                  </label>
                  <select
                    value={newIntent}
                    onChange={(e) => setNewIntent(e.target.value)}
                    className="w-full bg-st-grey border-none p-3 text-[10px] font-black uppercase tracking-widest text-st-blue outline-none"
                  >
                    <option>产品发现</option>
                    <option>竞品对比</option>
                    <option>技术咨询</option>
                    <option>品牌口碑</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    监测频率
                  </label>
                  <select
                    value={newFrequency}
                    onChange={(e) => setNewFrequency(e.target.value)}
                    className="w-full bg-st-grey border-none p-3 text-[10px] font-black uppercase tracking-widest text-st-blue outline-none"
                  >
                    <option>每 6 小时</option>
                    <option>每天 (24H)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-8 bg-gray-50 flex gap-4">
              <button
                onClick={() => setIsAddingPrompt(false)}
                className="flex-1 py-3 border border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-white transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!newPrompt.trim()}
                className="flex-1 st-button-primary justify-center disabled:opacity-50"
              >
                保存策略
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
