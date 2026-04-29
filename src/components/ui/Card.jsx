import { cn } from '../../lib/utils'

/**
 * Card — surface element. 10px radius (FieldSuite spec). Hairline border.
 *
 * If `onClick` is provided, renders as a <button> with interactive hover/lift
 * styling. Pass `className="!p-0"` to remove default padding (for cards
 * wrapping a divide-y list).
 */
export default function Card({ children, className = '', onClick, hover = false, tinted = false, ...props }) {
  const Comp = onClick ? 'button' : 'div'
  const interactive = !!onClick || hover

  return (
    <Comp
      onClick={onClick}
      className={cn(
        // No outline border — float on shadow only (matches AWC). A subtle 4% black
        // ring gives just enough edge definition without looking "outlined".
        'block w-full text-left rounded-card bg-surface-card p-3.5 shadow-card ring-1 ring-black/[0.04]',
        'transition-all duration-200',
        'dark:ring-white/[0.06]',
        tinted && 'bg-brand-50 dark:bg-brand-950/30 ring-brand-200/40 dark:ring-brand-800/40',
        interactive && 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0',
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}
