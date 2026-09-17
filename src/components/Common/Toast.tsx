import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const config = {
    success: {
      bg: 'bg-emerald-950/95 border-emerald-800 text-emerald-100 shadow-emerald-950/50',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      title: 'Thành công'
    },
    error: {
      bg: 'bg-rose-950/95 border-rose-800 text-rose-100 shadow-rose-950/50',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      title: 'Lỗi'
    },
    warning: {
      bg: 'bg-amber-950/95 border-amber-800 text-amber-100 shadow-amber-950/50',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
      title: 'Cảnh báo'
    },
    info: {
      bg: 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-slate-950/50',
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
      title: 'Thông báo'
    }
  }[toast.type];

  return (
    <div 
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all animate-slide-in ${config.bg}`}
      role="alert"
    >
      {config.icon}
      <div className="flex-1 min-w-0 pr-1">
        <p className="text-xs font-bold leading-none mb-1">{config.title}</p>
        <p className="text-xs text-slate-300 font-medium leading-relaxed">{toast.message}</p>
      </div>
      <button 
        onClick={onDismiss}
        className="text-slate-400 hover:text-white p-1 rounded-lg transition shrink-0 cursor-pointer"
        aria-label="Đóng thông báo"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
