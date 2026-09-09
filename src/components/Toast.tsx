import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({
  toast,
  onRemove,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  let icon = <Info className="w-4 h-4 text-blue-400 shrink-0" />;
  let border = 'border-blue-500/50 bg-[#1e1e2e]/95 text-blue-200';

  if (toast.type === 'success') {
    icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    border = 'border-emerald-500/50 bg-[#1e1e2e]/95 text-emerald-200';
  } else if (toast.type === 'warning') {
    icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
    border = 'border-amber-500/50 bg-[#1e1e2e]/95 text-amber-200';
  } else if (toast.type === 'error') {
    icon = <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
    border = 'border-rose-500/50 bg-[#1e1e2e]/95 text-rose-200';
  }

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border shadow-xl backdrop-blur-md text-xs font-medium transition-all ${border}`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-slate-100">{toast.text}</span>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
