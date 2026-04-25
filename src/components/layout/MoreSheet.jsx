import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * MoreSheet — bottom sheet for nav overflow on mobile.
 *
 * items: [{ to, label, description?, Icon, color? }]
 * color: tailwind colour name e.g. 'brand', 'amber', 'emerald'
 */
export default function MoreSheet({ open, onClose, items = [] }) {
  useEffect(() => {
    if (!open) return
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="More navigation"
    >
      <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60" onClick={onClose} />

      <div
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl shadow-elevated animate-slide-up flex flex-col max-h-[80vh]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <span className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="px-4 pt-3 pb-2 shrink-0">
          <h2 className="section-title">More</h2>
        </div>
        <div className="overflow-y-auto px-4 pb-4 divide-y divide-gray-100 dark:divide-gray-800">
          {items.map(({ to, label, description, Icon, color = 'brand' }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className="flex items-center gap-3 py-3 hover:bg-gray-50 dark:bg-gray-900/50 dark:hover:bg-gray-800/60 -mx-2 px-2 rounded-xl transition-colors"
            >
              <IconBox color={color}><Icon className="w-5 h-5" strokeWidth={2} /></IconBox>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{label}</p>
                {description && <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{description}</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}

const COLOR_CLASSES = {
  brand:   'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400',
  amber:   'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  blue:    'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  violet:  'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  red:     'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  cyan:    'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400',
  gray:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
}

function IconBox({ color = 'brand', children }) {
  return (
    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', COLOR_CLASSES[color] || COLOR_CLASSES.brand)}>
      {children}
    </div>
  )
}
