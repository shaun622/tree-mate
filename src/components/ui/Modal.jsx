import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Modal — bottom sheet on mobile, centered card on desktop.
 *
 * Supports nested modals via `zLayer` (default 50, nested = 60+).
 * Preserves the Safari iOS-safe scroll lock: locks <html> with position:fixed
 * + saved scroll position. Locking <body> overflow doesn't work on iOS.
 *
 * Pass `title` for a header bar with close button. Omit `title` for a clean
 * centered modal (used by ConfirmModal etc).
 */
export default function Modal({ open, onClose, title, children, size = 'md', zLayer = 50 }) {
  const scrollYRef = useRef(0)

  useEffect(() => {
    if (!open) return
    scrollYRef.current = window.scrollY
    document.documentElement.style.position = 'fixed'
    document.documentElement.style.top = `-${scrollYRef.current}px`
    document.documentElement.style.width = '100%'
    document.body.classList.add('modal-open')
    return () => {
      const savedY = scrollYRef.current
      document.documentElement.style.position = ''
      document.documentElement.style.top = ''
      document.documentElement.style.width = ''
      document.body.classList.remove('modal-open')
      if (savedY) window.scrollTo(0, savedY)
    }
  }, [open])

  if (!open) return null

  const SIZES = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }

  return createPortal(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center animate-fade-in"
      style={{ zIndex: zLayer }}
      role="dialog"
      aria-modal="true"
    >
      {/* Solid backdrop — no backdrop-blur (Safari perf) */}
      <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60" onClick={onClose} />

      <div
        className={cn(
          'relative w-full bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl',
          'max-h-[92vh] flex flex-col shadow-elevated',
          'animate-slide-up sm:animate-scale-in',
          SIZES[size],
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <span className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        {title && (
          <div className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -m-2 rounded-xl text-gray-400 hover:text-gray-600 dark:text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
