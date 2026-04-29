import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'

/**
 * ActivityPanel — FieldSuite-style activity feed.
 *
 * Each row: tiny green dot (left) + two-line content (bold message +
 * relative-time muted) + category pill on the right (Job / Photo / Quote /
 * Client / Payment / Report). All pills use the same green-tinted style
 * for visual rhythm.
 */

const TYPE_TO_PILL = {
  job_created:      'Job',
  job_completed:    'Job',
  quote_sent:       'Quote',
  quote_accepted:   'Quote',
  quote_declined:   'Quote',
  quote_viewed:     'Quote',
  report_completed: 'Photo',
  client_created:   'Client',
  payment_received: 'Payment',
}

function relativeTime(ts) {
  if (!ts) return ''
  const now = Date.now()
  const t = new Date(ts).getTime()
  const sec = Math.max(0, Math.floor((now - t) / 1000))
  if (sec < 60)         return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60)         return `about ${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)          return `about ${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.floor(hr / 24)
  if (day < 7)          return `${day} day${day === 1 ? '' : 's'} ago`
  return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export default function ActivityPanel({ activities = [], onMarkRead }) {
  const navigate = useNavigate()

  if (activities.length === 0) {
    return <p className="text-[13px] text-ink-3 text-center py-4 italic">No recent activity</p>
  }

  const handleClick = (a) => {
    if (onMarkRead && !a.is_read) onMarkRead(a.id)
    if (a.link_to) navigate(a.link_to)
  }

  return (
    <div className="space-y-3">
      {activities.map(a => {
        const pillLabel = TYPE_TO_PILL[a.type] || 'Update'
        const isClickable = !!a.link_to
        return (
          <div
            key={a.id}
            onClick={isClickable ? () => handleClick(a) : undefined}
            className={cn(
              'flex items-start gap-2.5',
              isClickable && 'cursor-pointer hover:bg-surface-2 -mx-2 px-2 py-1 rounded-card transition-colors',
              !a.is_read ? '' : 'opacity-75',
            )}
          >
            {/* tiny green dot */}
            <div className="mt-1.5 shrink-0">
              <span className="block w-1.5 h-1.5 rounded-full bg-brand-500" />
            </div>

            {/* content */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-ink-1 leading-snug truncate">
                {a.title || a.message || a.description}
              </p>
              <p className="text-[11.5px] text-ink-3 mt-0.5">
                {relativeTime(a.created_at)}
              </p>
            </div>

            {/* category pill — green tint, mono */}
            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-[10.5px] font-mono font-medium tracking-tight">
              {pillLabel}
            </span>
          </div>
        )
      })}
    </div>
  )
}
