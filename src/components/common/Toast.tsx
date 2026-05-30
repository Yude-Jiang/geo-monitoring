import React, { createContext, useContext, useState, useCallback } from "react";
import { X, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/src/lib/utils";

type ToastType = "error" | "success";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "error") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 px-4 py-3 shadow-lg border-l-4 animate-in slide-in-from-right",
              t.type === "error"
                ? "bg-white border-st-red text-st-blue"
                : "bg-white border-emerald-500 text-st-blue"
            )}
          >
            {t.type === "error" ? (
              <AlertCircle size={18} className="text-st-red flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-xs font-bold flex-1">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-300 hover:text-gray-500 flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
