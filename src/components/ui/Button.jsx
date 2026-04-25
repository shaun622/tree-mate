import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

const VARIANTS = {
  primary:   'bg-gradient-brand text-white shadow-button hover:shadow-button-hover hover:brightness-110',
  secondary: 'bg-white text-gray-700 border border-gray-200 shadow-card hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800',
  danger:    'bg-gradient-danger text-white shadow-md hover:brightness-110',
  ghost:     'text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-800',
}

const SIZES = {
  sm: 'px-3 py-2 text-xs min-h-[36px]',
  md: 'px-5 py-3 text-sm min-h-tap min-w-tap',
  lg: 'px-6 py-4 text-base min-h-tap',
}

/**
 * Button — 4 variants only (primary, secondary, danger, ghost). 3 sizes.
 *
 * Use lucide-react icons via `leftIcon` / `rightIcon` props (pass the component, not JSX):
 *   <Button leftIcon={Plus}>New Job</Button>
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  loading = false,
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-wide',
        'transition-all duration-200 active:scale-[0.98]',
        'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 dark:focus:ring-offset-gray-950',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading
        ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
        : LeftIcon && <LeftIcon className="w-4 h-4" strokeWidth={2.5} />}
      {children}
      {!loading && RightIcon && <RightIcon className="w-4 h-4" strokeWidth={2.5} />}
    </button>
  )
}
