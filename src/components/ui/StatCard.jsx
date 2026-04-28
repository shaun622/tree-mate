import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react'
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
 * StatCard — KPI tile with mono eyebrow label, big bold number, optional
 * corner-affordance icon (top-right ghost button), optional trend.
 *
 * Pattern: small mono uppercase label → big sans-bold number → tiny mono
 * trend pill. Used on Dashboard + Analytics top strips.
 */
export default function StatCard({
  label,
  value,
  trend,
  trendLabel,
  format = 'number',
  prefix,
  suffix,
  cornerIcon: CornerIcon = ArrowUpRight,
  onClick,
}) {
  const display = useAnimatedNumber(typeof value === 'number' ? value : 0)
  const formatted = format === 'currency'
    ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(display)
    : display.toLocaleString('en-AU')

  return (
    <div
      onClick={onClick}
      className={cn(
        'card relative group',
        onClick && 'card-interactive',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="eyebrow-muted">{label}</div>
        {CornerIcon && (
          <div className="text-ink-4 opacity-60 group-hover:opacity-100 transition-opacity">
            <CornerIcon className="w-3.5 h-3.5" strokeWidth={2} />
          </div>
        )}
      </div>
      <div className="font-semibold text-[28px] leading-none tabular-nums text-ink-1 tracking-tight">
        {prefix}{formatted}{suffix}
      </div>
      {trendLabel && (
        <div
          className={cn(
            'mt-2 flex items-center gap-1 text-[11px] font-medium font-mono tabular-nums',
            trend > 0 && 'text-emerald-600 dark:text-emerald-400',
            trend < 0 && 'text-red-600 dark:text-red-400',
            (!trend || trend === 0) && 'text-ink-3',
          )}
        >
          {trend > 0 && <TrendingUp className="w-3 h-3" strokeWidth={2.5} />}
          {trend < 0 && <TrendingDown className="w-3 h-3" strokeWidth={2.5} />}
          {trendLabel}
        </div>
      )}
    </div>
  )
}
