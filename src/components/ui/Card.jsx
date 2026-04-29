import { cn } from '../../lib/utils'

/**
 * Card — AWC spec. rounded-2xl (16px), border-gray-100 hairline, shadow-card.
 * If `onClick` is provided, renders as a <button> with hover-lift.
 * Pass `className="!p-0"` to remove default padding (for divided lists).
 */
export default function Card({ children, className = '', onClick, hover = false, tinted = false, ...props }) {
  const Comp = onClick ? 'button' : 'div'
  const interactive = !!onClick || hover

  return (
    <Comp
      onClick={onClick}
      className={cn(
        'block w-full text-left bg-white rounded-2xl border border-gray-100 p-4 shadow-card transition-all duration-200',
        'dark:bg-gray-900 dark:border-gray-800',
        tinted && 'bg-brand-50/50 border-brand-200/40 dark:bg-brand-950/30 dark:border-brand-800/40',
        interactive && 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0 hover:border-gray-200 dark:hover:border-gray-700',
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}
