'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { id, message, type };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-3 p-4 rounded-lg shadow-lg border-2 animate-in slide-in-from-bottom-2 transition-all',
              toast.type === 'success'
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/90 dark:to-emerald-950/90 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
                : 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/90 dark:to-pink-950/90 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
            )}
          >
            <CheckCircle2 className={cn(
              'h-5 w-5 flex-shrink-0',
              toast.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )} />
            <p className="flex-1 font-medium text-sm">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  // Return a no-op function if context is not available
  if (!context) {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      showToast: (_message: string, _type?: 'success' | 'error') => {
        // No-op: ToastProvider not available
      },
    };
  }
  return context;
}

