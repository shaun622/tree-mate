import { cn } from '../../lib/utils'

const VARIANTS = {
  primary: 'bg-brand-50 text-brand-700 ring-brand-200/50 dark:bg-brand-950/40 dark:text-brand-300 dark:ring-brand-800/40',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/40',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200/50 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/40',
  danger:  'bg-red-50 text-red-700 ring-red-200/50 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800/40',
  info:    'bg-sky-50 text-sky-700 ring-sky-200/50 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800/40',
  neutral: 'bg-gray-100 text-gray-600 ring-gray-200/50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700/50',
}

const DOT_COLORS = {
  primary: 'bg-brand-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  info:    'bg-sky-500',
  neutral: 'bg-gray-400',
}

export default function Badge({ children, variant = 'neutral', dot = false, className = '' }) {
  const v = VARIANTS[variant] || VARIANTS.neutral
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold ring-1 ring-inset',
        v,
        className,
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', DOT_COLORS[variant] || DOT_COLORS.neutral)} />}
      {children}
    </span>
  )
}
