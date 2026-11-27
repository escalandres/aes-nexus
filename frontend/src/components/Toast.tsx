import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, Info, AlertCircle, X } from 'lucide-react'

export type ToastType = 'success' | 'info' | 'warning' | 'error'

export interface ToastOptions {
  type?: ToastType
  title?: string
  duration?: number
}

export interface ToastItem {
  id: string
  message: string
  title?: string
  type: ToastType
  duration: number
}

interface ToastContextType {
  toast: (message: string, options?: ToastOptions) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const ToastCard: React.FC<{ toast: ToastItem; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isPaused, setIsPaused] = useState(false)
  const remainingTimeRef = useRef(toast.duration)
  const startTimeRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (toast.duration <= 0) return

    if (!isPaused) {
      startTimeRef.current = Date.now()
      timerRef.current = setTimeout(() => {
        onRemove(toast.id)
      }, remainingTimeRef.current)
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
        const elapsed = Date.now() - startTimeRef.current
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed)
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isPaused, toast.duration, toast.id, onRemove])

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 size={16} className="toast-icon-svg" />
      case 'warning':
        return <AlertTriangle size={16} className="toast-icon-svg" />
      case 'error':
        return <AlertCircle size={16} className="toast-icon-svg" />
      default:
        return <Info size={16} className="toast-icon-svg" />
    }
  }

  return (
    <div
      className={`toast-item toast-${toast.type}`}
      role="status"
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={`toast-icon-box tone-${toast.type}`}>{getIcon()}</div>
      <div className="toast-body">
        {toast.title && <strong className="toast-title">{toast.title}</strong>}
        <p className="toast-message">{toast.message}</p>
      </div>
      <button
        type="button"
        className="toast-close"
        onClick={() => onRemove(toast.id)}
        aria-label="Cerrar notificación"
      >
        <X size={14} />
      </button>
      {toast.duration > 0 && (
        <div className="toast-progress-track">
          <div
            className={`toast-progress-bar tone-${toast.type}`}
            style={{
              animationDuration: `${toast.duration}ms`,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          />
        </div>
      )}
    </div>
  )
}

const ToastContainer: React.FC<{ toasts: ToastItem[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null

  return (
    <aside className="toast-container" aria-label="Notificaciones del sistema">
      {toasts.map((item) => (
        <ToastCard key={item.id} toast={item} onRemove={onRemove} />
      ))}
    </aside>
  )
}

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, options?: ToastOptions) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const newToast: ToastItem = {
      id,
      message,
      title: options?.title,
      type: options?.type || 'info',
      duration: options?.duration ?? 4200,
    }
    setToasts((prev) => [...prev, newToast])
  }, [])

  const success = useCallback((message: string, title?: string) => {
    toast(message, { type: 'success', title: title || 'Éxito' })
  }, [toast])

  const error = useCallback((message: string, title?: string) => {
    toast(message, { type: 'error', title: title || 'Error' })
  }, [toast])

  const warning = useCallback((message: string, title?: string) => {
    toast(message, { type: 'warning', title: title || 'Atención' })
  }, [toast])

  const info = useCallback((message: string, title?: string) => {
    toast(message, { type: 'info', title: title || 'Información' })
  }, [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}
