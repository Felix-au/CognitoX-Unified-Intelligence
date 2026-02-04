"use client";

import React, { createContext, useContext, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id?: string;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastContextType {
  showToast: (toast: ToastMessage) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (toast: ToastMessage) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-card ${t.type}`}>
            <div className="toast-header">
              <span className="toast-title">{t.title}</span>
              <button 
                onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
                className="toast-close"
              >
                &times;
              </button>
            </div>
            <p className="toast-body">{t.message}</p>
          </div>
        ))}
      </div>

      <style jsx>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 9999;
          pointer-events: none;
        }
        .toast-card {
          pointer-events: auto;
          width: 320px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
          border-radius: 12px;
          padding: 14px;
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border-left: 4px solid var(--accent-primary);
        }
        .toast-card.success {
          border-left-color: var(--accent-success);
        }
        .toast-card.error {
          border-left-color: var(--accent-danger);
        }
        .toast-card.warning {
          border-left-color: #f59e0b;
        }
        .toast-card.info {
          border-left-color: var(--accent-secondary);
        }
        .toast-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .toast-title {
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          color: #ffffff;
        }
        .toast-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 1.2rem;
          cursor: pointer;
          line-height: 1;
        }
        .toast-close:hover {
          color: #ffffff;
        }
        .toast-body {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%) translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
