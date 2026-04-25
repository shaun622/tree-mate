import { cn } from '../../lib/utils'

/**
 * PageHero — page title + dynamic subtitle + optional primary action.
 *
 * Lives at the TOP of every list/dashboard page (NOT a sticky bar).
 * Subtitle is dynamic context (counts, dates, totals) — not static description.
 *
 * Usage:
 *   <PageHero
 *     title="Jobs"
 *     subtitle={`${total} jobs · ${activeCount} active`}
 *     action={<Button leftIcon={Plus} onClick={openCreate}>New Job</Button>}
 *   />
 */
export default function PageHero({ title, subtitle, action, className }) {
  return (
    <section className={cn('mb-6 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  )
}
