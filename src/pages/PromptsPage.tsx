import { useState, useEffect, useRef } from "react";
import { Search, TrendingUp, Plus, Trash2, X, Edit3, Upload, FileText } from "lucide-react";
import type { PromptStrategy } from "../types";
import { fetchCampaigns, createCampaign, type Campaign, type CsvImportRow } from "../services/api";
import { useToast } from "../components/common/Toast";

const ALL_PLATFORMS = ["Kimi", "豆包", "DeepSeek", "通义千问", "文心一言", "元宝"];
const INTENT_OPTIONS = ["产品发现", "竞品对比", "技术咨询", "品牌口碑", "成本优化", "选型迁移", "方案设计", "生态工具"];

interface PromptsPageProps {
  strategies: PromptStrategy[];
  isRunningTask: boolean;
  onRunTask: (strategy?: PromptStrategy) => void;
  onSaveStrategy: (campaignId: string, prompt: string, intent: string, frequency: string, platforms: string[]) => void;
  onUpdateStrategy: (id: string, data: {
    prompt: string; intent: string; frequency: string; platforms: string[]; campaign_id: string;
    strategic_pillar?: string; propositions?: string[]; expected_anchors?: string[]; fingerprints?: string[];
  }) => void;
  onDeleteStrategy: (id: string) => void;
  onRequestDelete: (id: string) => void;
  onImportCSV: (rows: CsvImportRow[], campaignId: string, frequency: string, platforms: string[]) => Promise<number | undefined>;
}

export function PromptsPage({
  strategies,
  isRunningTask,
  onRunTask,
  onSaveStrategy,
  onUpdateStrategy,
  onDeleteStrategy,
  onRequestDelete,
  onImportCSV,
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
  const [csvRows, setCsvRows] = useState<CsvImportRow[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [batchNewCampaign, setBatchNewCampaign] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // Preserve CSV-derived evaluation criteria so editing doesn't wipe them
        strategic_pillar: editingStrategy.strategic_pillar,
        propositions: editingStrategy.propositions,
        expected_anchors: editingStrategy.expected_anchors,
        fingerprints: editingStrategy.fingerprints,
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

  // Minimal CSV parser supporting quoted fields with embedded commas/newlines
  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some((f) => f.trim() !== "")) rows.push(row);
        row = [];
      } else field += c;
    }
    if (field !== "" || row.length > 0) {
      row.push(field);
      if (row.some((f) => f.trim() !== "")) rows.push(row);
    }
    return rows;
  };

  const handleCsvFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length < 2) { toast("CSV 内容为空或缺少数据行"); return; }
    // Skip the header row; map first 4 columns
    const rows: CsvImportRow[] = parsed.slice(1).map((cols) => ({
      strategic_pillar: (cols[0] || "").trim(),
      core_proposition: (cols[1] || "").trim(),
      monitoring_prompt: (cols[2] || "").trim(),
      expected_anchor: (cols[3] || "").trim(),
    })).filter((r) => r.monitoring_prompt.length > 0);
    if (rows.length === 0) { toast("没有解析到有效的 Monitoring Prompt 列"); return; }
    setCsvRows(rows);
    setCsvFileName(file.name);
    toast(`已解析 ${rows.length} 行，确认后导入`, "success");
  };

  // Resolve the target campaign: existing selection, or create a new one inline
  const resolveBatchCampaign = async (): Promise<string | null> => {
    if (batchNewCampaign.trim()) {
      const c = await createCampaign(batchNewCampaign.trim(), "");
      await loadCampaigns();
      setBatchCampaignId(c.id);
      setBatchNewCampaign("");
      return c.id;
    }
    return batchCampaignId || campaigns[0]?.id || null;
  };

  const handleBatchImport = async () => {
    if (batchPlatforms.length === 0) { toast("请至少选择一个平台"); return; }
    setIsImporting(true);
    try {
      const cid = await resolveBatchCampaign();
      if (!cid) { toast("请选择或新建一个 Campaign"); return; }

      if (csvRows.length > 0) {
        // CSV path: server auto-classifies intent + extracts fingerprints
        const imported = await onImportCSV(csvRows, cid, batchFrequency, batchPlatforms);
        toast(`成功导入 ${imported ?? csvRows.length} 条策略（含命题/锚点）`, "success");
      } else {
        // Plain-text path: one prompt per line, shared intent
        const lines = batchText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length === 0) { toast("请上传 CSV 或输入至少一行 Prompt"); return; }
        let imported = 0;
        for (const line of lines) {
          try { await onSaveStrategy(cid, line, batchIntent, batchFrequency, batchPlatforms); imported++; } catch {}
        }
        toast(`成功导入 ${imported}/${lines.length} 条 Prompt`, "success");
      }
      setIsBatchImport(false);
      setBatchText("");
      setBatchCampaignId("");
      setCsvRows([]);
      setCsvFileName("");
    } catch (err: any) {
      toast(`导入失败: ${err.message || "未知错误"}`);
    } finally {
      setIsImporting(false);
    }
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
                    {strategy.strategic_pillar && (
                      <span className="px-2 py-0.5 bg-st-yellow text-st-blue text-[8px] font-black uppercase tracking-widest" title={strategy.strategic_pillar}>
                        {strategy.strategic_pillar.length > 14 ? strategy.strategic_pillar.slice(0, 14) + "…" : strategy.strategic_pillar}
                      </span>
                    )}
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
                  {strategy.propositions?.[0] && (
                    <p className="text-[10px] text-gray-500 font-medium truncate mt-1" title={strategy.propositions[0]}>
                      <span className="font-black text-gray-400">核心主张：</span>{strategy.propositions[0]}
                    </p>
                  )}
                  {strategy.expected_anchors?.[0] && (
                    <p className="text-[10px] text-gray-500 font-medium truncate" title={strategy.expected_anchors[0]}>
                      <span className="font-black text-gray-400">期望锚点：</span>{strategy.expected_anchors[0]}
                      {strategy.fingerprints && strategy.fingerprints.length > 0 && (
                        <span className="ml-1 text-st-light-blue">[{strategy.fingerprints.join(", ")}]</span>
                      )}
                    </p>
                  )}
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
                    {INTENT_OPTIONS.map((o) => (<option key={o}>{o}</option>))}
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
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">所属 Campaign</label>
                  <select value={batchCampaignId} onChange={(e) => { setBatchCampaignId(e.target.value); setBatchNewCampaign(""); }}
                    className="w-full bg-st-grey border-none p-3 text-[10px] font-black uppercase tracking-widest text-st-blue outline-none">
                    <option value="">-- 选择 --</option>
                    {campaigns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                  <input value={batchNewCampaign} onChange={(e) => setBatchNewCampaign(e.target.value)}
                    placeholder="+ 或新建 Campaign"
                    className="w-full bg-white border border-dashed border-gray-300 p-2 text-[10px] font-bold text-st-blue outline-none focus:border-st-light-blue" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    监测意图 {csvRows.length > 0 && <span className="text-st-light-blue">（CSV 自动判断）</span>}
                  </label>
                  <select value={batchIntent} onChange={(e) => setBatchIntent(e.target.value)} disabled={csvRows.length > 0}
                    className="w-full bg-st-grey border-none p-3 text-[10px] font-black uppercase tracking-widest text-st-blue outline-none disabled:opacity-40">
                    {INTENT_OPTIONS.map((o) => (<option key={o}>{o}</option>))}
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

              {/* CSV upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CSV 文件导入（推荐）</label>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); e.target.value = ""; }} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 text-[10px] font-black text-st-blue uppercase tracking-widest hover:border-st-light-blue transition-all">
                  <FileText size={16} />
                  {csvFileName ? `已选: ${csvFileName}` : "上传 CSV（列：Strategic Pillar / Core Proposition / Monitoring Prompt / Expected AI Anchor）"}
                </button>
                {csvRows.length > 0 && (
                  <div className="bg-st-grey/50 p-3 max-h-32 overflow-y-auto space-y-1">
                    <p className="text-[10px] font-black text-st-blue">已解析 {csvRows.length} 行，意图与指纹将由系统自动判断：</p>
                    {csvRows.slice(0, 5).map((r, i) => (
                      <p key={i} className="text-[9px] text-gray-500 truncate">· {r.monitoring_prompt}</p>
                    ))}
                    {csvRows.length > 5 && <p className="text-[9px] text-gray-400">…还有 {csvRows.length - 5} 行</p>}
                    <button onClick={() => { setCsvRows([]); setCsvFileName(""); }}
                      className="text-[9px] font-bold text-st-red hover:underline">清除</button>
                  </div>
                )}
              </div>

              {csvRows.length === 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    或粘贴 Prompt 列表（每行一条）
                  </label>
                  <textarea value={batchText} onChange={(e) => setBatchText(e.target.value)}
                    placeholder={"低功耗MCU推荐\n物联网设备MCU选型\nSTM32C5 vs ESP32对比\n..."}
                    className="w-full h-32 bg-st-grey border-none p-4 text-sm text-st-blue font-medium focus:ring-2 focus:ring-st-light-blue outline-none resize-none" />
                  <p className="text-[9px] text-gray-400">纯文本每行一条 Prompt，使用上方选择的意图；CSV 则按每行自动判断意图并提取锚点指纹。</p>
                </div>
              )}
            </div>
            <div className="p-8 bg-gray-50 flex gap-4">
              <button onClick={() => setIsBatchImport(false)}
                className="flex-1 py-3 border border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-white transition-all">取消</button>
              <button onClick={handleBatchImport}
                disabled={isImporting || batchPlatforms.length === 0 || (csvRows.length === 0 && !batchText.trim())}
                className="flex-1 st-button-primary justify-center disabled:opacity-50">
                {isImporting ? "导入中…" : `导入 ${csvRows.length > 0 ? csvRows.length : (batchText.trim().split("\n").filter((l) => l.trim()).length || 0)} 条`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
