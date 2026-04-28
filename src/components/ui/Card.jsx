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
        'block w-full text-left rounded-card border bg-shell border-line p-3.5',
        'transition-all duration-200',
        tinted && 'bg-brand-50 dark:bg-brand-950/30 border-brand-200/40 dark:border-brand-800/40',
        interactive && 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0',
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}
