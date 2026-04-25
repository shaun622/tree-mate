import { cn } from '../../lib/utils'

/**
 * Card — surface element. If `onClick` is provided, renders as a <button> with
 * interactive hover/lift styling. Pass `className="!p-0"` to remove default
 * padding (for cards wrapping a divide-y list).
 */
export default function Card({ children, className = '', onClick, hover = false, ...props }) {
  const Comp = onClick ? 'button' : 'div'
  const interactive = !!onClick || hover

  return (
    <Comp
      onClick={onClick}
      className={cn(
        'block w-full text-left bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-card transition-all duration-200',
        interactive && 'cursor-pointer hover:shadow-card-hover hover:border-gray-200 dark:border-gray-800 hover:-translate-y-0.5 active:translate-y-0 dark:hover:border-gray-700',
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}
