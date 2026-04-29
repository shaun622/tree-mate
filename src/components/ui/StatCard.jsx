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
 * StatCard — KPI tile with mono eyebrow label, big bold number, and a
 * brand-tinted icon-box top-right (the AWC pattern). Optional trend pill.
 *
 * Pass a lucide icon component as `icon`:
 *   <StatCard label="Jobs this week" value={6} icon={Calendar} />
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  iconTone = 'brand',           // 'brand' | 'amber' | 'red' | 'gray'
  trend,
  trendLabel,
  format = 'number',
  prefix,
  suffix,
  onClick,
}) {
  const display = useAnimatedNumber(typeof value === 'number' ? value : 0)
  const formatted = format === 'currency'
    ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(display)
    : display.toLocaleString('en-AU')

  const TONES = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    red:   'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
    gray:  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'card relative',
        onClick && 'card-interactive',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="eyebrow-muted">{label}</div>
        {Icon && (
          <div className={cn(
            'w-8 h-8 rounded-card flex items-center justify-center shrink-0',
            TONES[iconTone] || TONES.brand,
          )}>
            <Icon className="w-4 h-4" strokeWidth={2} />
          </div>
        )}
      </div>
      <div className="font-bold text-[28px] leading-none tabular-nums text-ink-1 tracking-tight">
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
