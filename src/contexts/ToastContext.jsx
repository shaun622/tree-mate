import { createContext, useCallback, useContext, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertTriangle, Info, X, AlertOctagon } from 'lucide-react'
import { cn } from '../lib/utils'

const ToastContext = createContext(null)

const VARIANT_CONFIG = {
  success: { Icon: CheckCircle2,  ring: 'ring-emerald-200/60 dark:ring-emerald-800/60', bg: 'bg-emerald-50 dark:bg-emerald-950/40', iconText: 'text-emerald-600 dark:text-emerald-400', text: 'text-emerald-900 dark:text-emerald-100' },
  error:   { Icon: AlertOctagon,  ring: 'ring-red-200/60 dark:ring-red-800/60',         bg: 'bg-red-50 dark:bg-red-950/40',         iconText: 'text-red-600 dark:text-red-400',         text: 'text-red-900 dark:text-red-100' },
  warning: { Icon: AlertTriangle, ring: 'ring-amber-200/60 dark:ring-amber-800/60',     bg: 'bg-amber-50 dark:bg-amber-950/40',     iconText: 'text-amber-600 dark:text-amber-400',     text: 'text-amber-900 dark:text-amber-100' },
  info:    { Icon: Info,          ring: 'ring-sky-200/60 dark:ring-sky-800/60',         bg: 'bg-sky-50 dark:bg-sky-950/40',         iconText: 'text-sky-600 dark:text-sky-400',         text: 'text-sky-900 dark:text-sky-100' },
}

let toastId = 0

/**
 * ToastProvider + useToast() — drop-in replacement for window.alert().
 *
 * Usage:
 *   const toast = useToast()
 *   toast.success('Quote sent')
 *   toast.error('Failed to send', { description: 'Check your network' })
 *   toast.info('Drafting…')
 *
 * Auto-dismisses after 4s by default. Click X to dismiss manually.
 * Bottom-center on mobile, top-right on desktop.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const push = useCallback((variant, message, opts = {}) => {
    const id = ++toastId
    const duration = opts.duration ?? 4000
    setToasts(t => [...t, { id, variant, message, description: opts.description }])
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
    return id
  }, [remove])

  const api = {
    success: (msg, opts) => push('success', msg, opts),
    error:   (msg, opts) => push('error',   msg, opts),
    warning: (msg, opts) => push('warning', msg, opts),
    info:    (msg, opts) => push('info',    msg, opts),
    dismiss: remove,
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[100] pointer-events-none flex flex-col gap-2 px-3 bottom-20 left-1/2 -translate-x-1/2 w-full max-w-sm md:bottom-auto md:left-auto md:translate-x-0 md:top-4 md:right-4 md:max-w-md"
          aria-live="polite"
          aria-atomic="true"
        >
          {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={() => remove(t.id)} />)}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }) {
  const cfg = VARIANT_CONFIG[toast.variant] || VARIANT_CONFIG.info
  const { Icon } = cfg
  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex items-start gap-2.5 px-3.5 py-2.5 rounded-card border ring-1 shadow-elevated',
        'animate-slide-up bg-surface-card dark:bg-gray-900',
        cfg.ring,
      )}
    >
      <div className={cn('mt-0.5 shrink-0', cfg.iconText)}>
        <Icon className="w-4 h-4" strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-[13px] font-medium leading-tight', cfg.text)}>{toast.message}</p>
        {toast.description && (
          <p className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-0.5">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 -m-1 p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <X className="w-3.5 h-3.5" strokeWidth={2.2} />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
