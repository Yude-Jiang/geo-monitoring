import { AlertCircle, X } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-st-blue/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm shadow-2xl border-t-4 border-st-red">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-st-red/10 flex items-center justify-center text-st-red">
              <AlertCircle size={20} />
            </div>
            <h4 className="font-black text-st-blue uppercase tracking-tight">
              {title}
            </h4>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-st-red transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600">{message}</p>
        </div>
        <div className="p-6 bg-gray-50 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-white transition-all"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-st-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}
