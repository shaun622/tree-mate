import { cn } from '../../lib/utils'
import Button from './Button'

/**
 * EmptyState — large icon-box with shadow-glow + title + description + optional action.
 *
 * Usage:
 *   <EmptyState icon={Plus} title="No jobs yet" description="..." action={<Button>...</Button>} />
 *
 * Backwards-compat: also accepts `actionLabel` + `onAction` for older callsites.
 */
export default function EmptyState({ icon: Icon, title, description, action, actionLabel, onAction, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in', className)}>
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center mb-4 text-brand-600 dark:text-brand-400 shadow-glow">
          {/* Support both component refs (lucide) and JSX nodes (legacy) */}
          {typeof Icon === 'function' ? <Icon className="w-8 h-8" strokeWidth={1.75} /> : Icon}
        </div>
      )}
      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 dark:text-gray-500 max-w-xs mb-6">{description}</p>}
      {action || (actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>)}
    </div>
  )
}
