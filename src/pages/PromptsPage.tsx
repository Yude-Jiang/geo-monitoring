import { useState, useEffect } from "react";
import { Search, TrendingUp, Plus, Trash2, X, Edit3, Upload } from "lucide-react";
import type { PromptStrategy } from "../types";
import { fetchCampaigns, createCampaign, type Campaign } from "../services/api";
import { useToast } from "../components/common/Toast";

const ALL_PLATFORMS = ["Kimi", "豆包", "DeepSeek", "通义千问", "文心一言", "元宝"];

interface PromptsPageProps {
  strategies: PromptStrategy[];
  isRunningTask: boolean;
  onRunTask: (strategy?: PromptStrategy) => void;
  onSaveStrategy: (campaignId: string, prompt: string, intent: string, frequency: string, platforms: string[]) => void;
  onUpdateStrategy: (id: string, data: { prompt: string; intent: string; frequency: string; platforms: string[]; campaign_id: string }) => void;
  onDeleteStrategy: (id: string) => void;
  onRequestDelete: (id: string) => void;
}

export function PromptsPage({
  strategies,
  isRunningTask,
  onRunTask,
  onSaveStrategy,
  onUpdateStrategy,
  onDeleteStrategy,
  onRequestDelete,
}: PromptsPageProps) {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [isAddingCampaign, setIsAddingCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDesc, setNewCampaignDesc] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [editingStrategy, setEditingStrategy] = useState<PromptStrategy | null>(null);
  const [newIntent, setNewIntent] = useState("产品发现");
  const [newFrequency, setNewFrequency] = useState("每天 (24H)");
  const [newPlatforms, setNewPlatforms] = useState<string[]>([...ALL_PLATFORMS]);
  const [isBatchImport, setIsBatchImport] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [batchCampaignId, setBatchCampaignId] = useState("");
  const [batchIntent, setBatchIntent] = useState("产品发现");
  const [batchFrequency, setBatchFrequency] = useState("每天 (24H)");
  const [batchPlatforms, setBatchPlatforms] = useState<string[]>([...ALL_PLATFORMS]);

  const loadCampaigns = () => {
    fetchCampaigns().then(setCampaigns).catch(() => {});
  };

  useEffect(() => { loadCampaigns(); }, []);

  // Close modals on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddingPrompt(false);
        setIsAddingCampaign(false);
        setEditingStrategy(null);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return;
    await createCampaign(newCampaignName.trim(), newCampaignDesc.trim());
    setNewCampaignName("");
    setNewCampaignDesc("");
    setIsAddingCampaign(false);
    loadCampaigns();
  };

  const togglePlatform = (p: string) => {
    setNewPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleSave = () => {
    const cid = selectedCampaignId || campaigns[0]?.id || "";
    if (!cid) {
      setIsAddingCampaign(true);
      return;
    }
    onSaveStrategy(cid, newPrompt, newIntent, newFrequency, newPlatforms);
    setIsAddingPrompt(false);
    setNewPrompt("");
    setNewPlatforms([...ALL_PLATFORMS]);
    setSelectedCampaignId("");
  };

  const handleEdit = (s: PromptStrategy) => {
    setEditingStrategy(s);
    setNewPrompt(s.prompt);
    setNewIntent(s.intent);
    setNewFrequency(s.frequency);
    setNewPlatforms([...s.platforms]);
    setSelectedCampaignId(s.campaign_id || "");
    setIsAddingPrompt(true);
  };

  const handleUpdate = async () => {
    if (!editingStrategy) return;
    const cid = selectedCampaignId || campaigns[0]?.id || "";
    try {
      await onUpdateStrategy(editingStrategy.id, {
        prompt: newPrompt,
        intent: newIntent,
        frequency: newFrequency,
        platforms: newPlatforms,
        campaign_id: cid,
      });
      toast("策略已更新", "success");
      setIsAddingPrompt(false);
      setEditingStrategy(null);
      setNewPrompt("");
      setNewPlatforms([...ALL_PLATFORMS]);
      setSelectedCampaignId("");
    } catch (err: any) {
      toast(`修改失败: ${err.message || "未知错误"}`);
    }
  };

  const handleBatchImport = async () => {
    const cid = batchCampaignId || campaigns[0]?.id;
    if (!cid) { setIsAddingCampaign(true); return; }
    const lines = batchText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) { toast("请至少输入一行 Prompt"); return; }

    let imported = 0;
    for (const line of lines) {
      try {
        await onSaveStrategy(cid, line, batchIntent, batchFrequency, batchPlatforms);
        imported++;
      } catch {}
    }
    toast(`成功导入 ${imported}/${lines.length} 条 Prompt`, "success");
    setIsBatchImport(false);
    setBatchText("");
    setBatchCampaignId("");
  };

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
            onClick={() => setIsBatchImport(true)}
            className="st-button-secondary shadow-lg shadow-st-blue/10"
          >
            <Upload size={16} />
            批量导入
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
              <div className="flex items-center gap-6 min-w-0">
                <div className="w-12 h-12 bg-st-grey flex items-center justify-center text-st-blue group-hover:bg-st-yellow transition-colors flex-shrink-0">
                  <Search size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-st-blue text-white text-[8px] font-black uppercase tracking-widest">
                      {strategy.intent}
                    </span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                      {strategy.frequency}
                    </span>
                    {(strategy.platforms || []).map((p) => (
                      <span key={p} className="px-1.5 py-0.5 bg-st-grey text-st-blue text-[8px] font-bold uppercase tracking-wider border border-gray-200">
                        {p}
                      </span>
                    ))}
                  </div>
                  <h4 className="font-black text-st-blue tracking-tight truncate">
                    {strategy.prompt}
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right mr-4 hidden sm:block">
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
                  onClick={() => handleEdit(strategy)}
                  className="p-2 text-gray-300 hover:text-st-light-blue transition-colors"
                  aria-label="Edit strategy"
                >
                  <Edit3 size={14} />
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

      {/* Add Campaign Modal */}
      {isAddingCampaign && (
        <div className="fixed inset-0 bg-st-blue/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm shadow-2xl border-t-4 border-st-light-blue">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h4 className="font-black text-st-blue uppercase tracking-tight">新建 Campaign</h4>
              <button onClick={() => setIsAddingCampaign(false)} className="text-gray-400 hover:text-st-red">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">名称</label>
                <input
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="e.g. STM32C5"
                  className="w-full bg-st-grey border-none p-3 text-sm font-bold text-st-blue outline-none focus:ring-2 focus:ring-st-light-blue"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">描述</label>
                <input
                  value={newCampaignDesc}
                  onChange={(e) => setNewCampaignDesc(e.target.value)}
                  placeholder="超低功耗MCU产品线"
                  className="w-full bg-st-grey border-none p-3 text-sm text-st-blue outline-none focus:ring-2 focus:ring-st-light-blue"
                />
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              <button onClick={() => setIsAddingCampaign(false)} className="flex-1 py-2.5 border border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest">取消</button>
              <button onClick={handleCreateCampaign} disabled={!newCampaignName.trim()} className="flex-1 st-button-primary justify-center disabled:opacity-50">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Prompt Modal */}
      {isAddingPrompt && (
        <div className="fixed inset-0 bg-st-blue/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg shadow-2xl border-t-4 border-st-yellow">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <h4 className="font-black text-st-blue uppercase tracking-tight">
                {editingStrategy ? "编辑监测策略" : "配置新监测策略"}
              </h4>
              <button
                onClick={() => { setIsAddingPrompt(false); setEditingStrategy(null); }}
                className="text-gray-400 hover:text-st-red transition-colors"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  所属 Campaign
                </label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full bg-st-grey border-none p-3 text-[10px] font-black uppercase tracking-widest text-st-blue outline-none"
                >
                  <option value="">-- 选择 Campaign --</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => { setIsAddingCampaign(true); setIsAddingPrompt(false); }}
                  className="text-[9px] text-st-light-blue font-bold uppercase tracking-wider hover:text-st-blue"
                >
                  + 新建 Campaign
                </button>
              </div>
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
              {/* Platform selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  目标平台（至少选一个）
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border transition-all ${
                        newPlatforms.includes(p)
                          ? "bg-st-blue text-white border-st-blue"
                          : "bg-st-grey text-gray-400 border-gray-200 hover:border-st-light-blue"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
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
                onClick={editingStrategy ? handleUpdate : handleSave}
                disabled={!newPrompt.trim() || newPlatforms.length === 0}
                className="flex-1 st-button-primary justify-center disabled:opacity-50"
              >
                {editingStrategy ? "保存修改" : "保存策略"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {isBatchImport && (
        <div className="fixed inset-0 bg-st-blue/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg shadow-2xl border-t-4 border-st-light-blue">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <h4 className="font-black text-st-blue uppercase tracking-tight">批量导入 Prompt</h4>
              <button onClick={() => setIsBatchImport(false)} className="text-gray-400 hover:text-st-red transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">所属 Campaign</label>
                  <select value={batchCampaignId} onChange={(e) => setBatchCampaignId(e.target.value)}
                    className="w-full bg-st-grey border-none p-3 text-[10px] font-black uppercase tracking-widest text-st-blue outline-none">
                    <option value="">-- 选择 --</option>
                    {campaigns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">监测意图</label>
                  <select value={batchIntent} onChange={(e) => setBatchIntent(e.target.value)}
                    className="w-full bg-st-grey border-none p-3 text-[10px] font-black uppercase tracking-widest text-st-blue outline-none">
                    <option>产品发现</option><option>竞品对比</option><option>技术咨询</option><option>品牌口碑</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">监测频率</label>
                  <select value={batchFrequency} onChange={(e) => setBatchFrequency(e.target.value)}
                    className="w-full bg-st-grey border-none p-3 text-[10px] font-black uppercase tracking-widest text-st-blue outline-none">
                    <option>每天 (24H)</option><option>每 6 小时</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">目标平台</label>
                  <div className="flex flex-wrap gap-1">
                    {ALL_PLATFORMS.map((p) => (
                      <button key={p} type="button"
                        onClick={() => setBatchPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])}
                        className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider border transition-all ${
                          batchPlatforms.includes(p) ? "bg-st-blue text-white border-st-blue" : "bg-st-grey text-gray-400 border-gray-200 hover:border-st-light-blue"
                        }`}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Prompt 列表（每行一条）
                </label>
                <textarea value={batchText} onChange={(e) => setBatchText(e.target.value)}
                  placeholder={"低功耗MCU推荐\n物联网设备MCU选型\nSTM32C5 vs ESP32对比\n..."}
                  className="w-full h-48 bg-st-grey border-none p-4 text-sm text-st-blue font-medium focus:ring-2 focus:ring-st-light-blue outline-none resize-none" />
                <p className="text-[9px] text-gray-400">每行一条 Prompt，将使用相同的 Campaign、意图、频率和平台批量创建。</p>
              </div>
            </div>
            <div className="p-8 bg-gray-50 flex gap-4">
              <button onClick={() => setIsBatchImport(false)}
                className="flex-1 py-3 border border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-white transition-all">取消</button>
              <button onClick={handleBatchImport} disabled={!batchText.trim() || batchPlatforms.length === 0}
                className="flex-1 st-button-primary justify-center disabled:opacity-50">
                导入 {batchText.trim().split("\n").filter((l) => l.trim()).length || 0} 条
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
