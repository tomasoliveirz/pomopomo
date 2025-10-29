'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'info' | 'success' | 'error' | 'saving';

export interface ToastProps {
  type?: ToastType;
  message: string;
  duration?: number;
  onClose?: () => void;
}

const TOAST_ICONS = {
  info: 'ℹ️',
  success: '✓',
  error: '⚠️',
  saving: '⏳',
};

const TOAST_STYLES = {
  info: 'bg-accent/90 text-white',
  success: 'bg-green-500/90 text-white',
  error: 'bg-red-500/90 text-white',
  saving: 'bg-blue-500/90 text-white',
};

export default function Toast({ type = 'info', message, duration, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration && duration > 0 && type !== 'error') {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) {
          setTimeout(onClose, 300);
        }
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose, type]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`
        fixed top-4 right-4 z-50 
        px-4 py-3 rounded-lg shadow-lg
        flex items-center gap-2
        ${TOAST_STYLES[type]}
        backdrop-blur-sm
      `}
    >
      <span className="text-lg">{TOAST_ICONS[type]}</span>
      <span className="text-sm font-medium">{message}</span>
      {type === 'error' && onClose && (
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-2 opacity-70 hover:opacity-100"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
}

export interface ToastContainerProps {
  toasts: Array<ToastProps & { id: string }>;
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              {...toast}
              onClose={() => onDismiss(toast.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}




