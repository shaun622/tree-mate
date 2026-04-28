import { cn } from '../../lib/utils'

/**
 * PageHero — page title + dynamic subtitle + optional primary action.
 *
 * Uses the FieldSuite mono accent eyebrow with the 18×1px horizontal-line
 * prefix above the title. Subtitle is dynamic context (counts, dates) —
 * not static description.
 *
 * Usage:
 *   <PageHero
 *     eyebrow="Jobs board"
 *     title="11 active across 7 clients"
 *     subtitle={null}
 *     action={<Button leftIcon={Plus}>New job</Button>}
 *   />
 */
export default function PageHero({ eyebrow, title, subtitle, action, className }) {
  return (
    <section className={cn('mb-5 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-tight leading-[1.05] text-ink-1">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13.5px] text-ink-3 mt-1 max-w-prose">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  )
}
