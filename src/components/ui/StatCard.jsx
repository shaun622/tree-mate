import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '../../lib/utils'

function useAnimatedNumber(target, duration = 600) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (target == null || isNaN(target)) { setDisplay(0); return }
    const start = performance.now()
    const from = 0
    let raf = 0
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return display
}

/**
 * StatCard — AWC spec. Label is Inter uppercase tracking-wider gray-500.
 * Number is text-2xl sm:text-3xl font-bold tabular-nums. Icon-box on the
 * right is 10×10 brand-50 with the icon at w-5 h-5 strokeWidth 2.
 *
 * <StatCard label="Jobs this week" value={6} icon={CalendarClock} />
 */
const TONES = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  red:   'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  gray:  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  iconTone = 'brand',
  trend,
  trendLabel,
  format = 'number',
  prefix,
  suffix,
  onClick,
  className,
}) {
  const display = useAnimatedNumber(typeof value === 'number' ? value : 0)
  const formatted = format === 'currency'
    ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(display)
    : display.toLocaleString('en-AU')

  return (
    <div
      onClick={onClick}
      className={cn(
        'card',
        onClick && 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0 hover:border-gray-200 dark:hover:border-gray-700',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100 leading-none">
            {prefix}{formatted}{suffix}
          </p>
          {trendLabel && (
            <div
              className={cn(
                'mt-1.5 flex items-center gap-1 text-xs font-medium',
                trend > 0 && 'text-emerald-600 dark:text-emerald-400',
                trend < 0 && 'text-red-600 dark:text-red-400',
                (!trend || trend === 0) && 'text-gray-500 dark:text-gray-400',
              )}
            >
              {trend > 0 && <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />}
              {trend < 0 && <TrendingDown className="w-3.5 h-3.5" strokeWidth={2.5} />}
              {trendLabel}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            TONES[iconTone] || TONES.brand,
          )}>
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  )
}
