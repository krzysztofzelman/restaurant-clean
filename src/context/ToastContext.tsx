import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface Toast {
  id: number;
  message: string;
  type: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: string, duration?: number) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type = 'success', duration = 3000) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    [],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}

      {/* Toast container — fixed position, bottom-right */}
      <div
        className="toast-container position-fixed bottom-0 end-0 p-3"
        style={{ zIndex: 1080 }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast show align-items-center text-bg-${toast.type} border-0`}
            role="alert"
          >
            <div className="d-flex">
              <div className="toast-body">{toast.message}</div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                onClick={() => dismissToast(toast.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
