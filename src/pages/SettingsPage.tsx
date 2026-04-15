export function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
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
          <select className="bg-st-grey border-none text-st-blue font-black text-[10px] uppercase tracking-widest px-6 py-2.5 focus:ring-2 focus:ring-st-light-blue outline-none">
            <option>每 6 小时</option>
            <option>每天 (24H)</option>
            <option>每周 (7D)</option>
          </select>
        </div>
        <div className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
          <div>
            <p className="font-black text-st-blue uppercase tracking-wider">
              智能预警阈值
            </p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
              当品牌可见度跌破 50% 时触发紧急通知
            </p>
          </div>
          <div className="w-12 h-6 bg-st-blue p-1 relative cursor-pointer shadow-inner">
            <div className="absolute right-1 top-1 w-4 h-4 bg-white shadow-sm" />
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
          <select className="bg-st-grey border-none text-st-blue font-black text-[10px] uppercase tracking-widest px-6 py-2.5 focus:ring-2 focus:ring-st-light-blue outline-none">
            <option>90 天</option>
            <option>180 天</option>
            <option>永久保留</option>
          </select>
        </div>
      </div>

      <div className="bg-st-yellow/10 border-l-4 border-st-yellow p-4">
        <p className="text-[10px] font-bold text-st-blue uppercase tracking-wider">
          [提示] 设置项的持久化功能正在开发中，目前修改不会被保存。
        </p>
      </div>
    </div>
  );
}
