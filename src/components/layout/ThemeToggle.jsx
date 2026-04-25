import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useTheme } from '../../contexts/ThemeContext'

/**
 * ThemeToggleCompact — header variant. Single-click flip between light ↔ dark.
 * No system cycle here (users pick `system` from Settings → Appearance instead).
 */
export function ThemeToggleCompact({ className, onBrand = false }) {
  const { setMode, isDark } = useTheme()
  const Icon = isDark ? Moon : Sun
  return (
    <button
      onClick={() => setMode(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      className={cn(
        'min-h-tap min-w-tap flex items-center justify-center rounded-xl p-2 transition-colors',
        onBrand
          ? 'bg-white/15 border border-white/25 hover:bg-white/25 text-white backdrop-blur'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
        className,
      )}
    >
      <Icon className="w-5 h-5" strokeWidth={2} />
    </button>
  )
}

/**
 * ThemeToggleFull — Settings → Appearance segmented control. Light / System / Dark.
 */
export function ThemeToggleFull({ className }) {
  const { mode, setMode } = useTheme()
  const options = [
    { value: 'light',  Icon: Sun,     label: 'Light'  },
    { value: 'system', Icon: Monitor, label: 'System' },
    { value: 'dark',   Icon: Moon,    label: 'Dark'   },
  ]
  return (
    <div
      className={cn(
        'inline-flex rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-0.5',
        className,
      )}
    >
      {options.map(({ value, Icon, label }) => {
        const active = mode === value
        return (
          <button
            key={value}
            onClick={() => setMode(value)}
            aria-pressed={active}
            className={cn(
              'min-h-[36px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors',
              active
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
            )}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
