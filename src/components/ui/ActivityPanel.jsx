import { formatDateTime } from '../../lib/utils'

const TYPE_CONFIG = {
  quote_sent: { icon: '\u{1F4E8}', color: 'text-blue-500' },
  quote_accepted: { icon: '\u2705', color: 'text-green-500' },
  quote_declined: { icon: '\u274C', color: 'text-red-500' },
  quote_viewed: { icon: '\u{1F441}\uFE0F', color: 'text-purple-500' },
  job_created: { icon: '\u{1F4CB}', color: 'text-tree-500' },
  job_completed: { icon: '\u{1F389}', color: 'text-emerald-500' },
  report_completed: { icon: '\u{1F4DD}', color: 'text-sky-500' },
  client_created: { icon: '\u{1F464}', color: 'text-indigo-500' },
  payment_received: { icon: '\u{1F4B0}', color: 'text-amber-500' },
}

export default function ActivityPanel({ activities = [] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
  }

  return (
    <div className="space-y-3">
      {activities.map(a => {
        const config = TYPE_CONFIG[a.type] || { icon: '\u{1F4CC}', color: 'text-gray-500' }
        return (
          <div key={a.id} className="flex items-start gap-3 animate-fade-in">
            <span className="text-lg">{config.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">{a.message}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(a.created_at)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
