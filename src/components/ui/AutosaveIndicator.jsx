import { Loader2, Check, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * AutosaveIndicator — small status pill for sticky headers on builders.
 * State: 'idle' | 'saving' | 'saved' | 'error'.
 *
 * Usage in a builder:
 *   const [status, setStatus] = useState('idle')
 *   // debounce form changes → setStatus('saving') → save() → setStatus('saved')
 *
 *   <div className="sticky top-0">
 *     ...
 *     <AutosaveIndicator status={status} />
 *   </div>
 */
export default function AutosaveIndicator({ status = 'idle', lastSavedAt }) {
  if (status === 'idle' && !lastSavedAt) return null

  const cfg = {
    saving: { Icon: Loader2,     iconCls: 'animate-spin', text: 'Saving…',   colour: 'text-ink-3' },
    saved:  { Icon: Check,       iconCls: '',             text: 'Saved',      colour: 'text-emerald-600 dark:text-emerald-400' },
    error:  { Icon: AlertCircle, iconCls: '',             text: 'Save failed',colour: 'text-red-600 dark:text-red-400' },
    idle:   { Icon: Check,       iconCls: '',             text: lastSavedAt ? formatRelative(lastSavedAt) : '', colour: 'text-ink-3' },
  }[status] || { Icon: Check, iconCls: '', text: '', colour: 'text-ink-3' }

  const { Icon } = cfg

  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-mono tabular-nums', cfg.colour)}>
      <Icon className="w-3 h-3" strokeWidth={2.5} />
      {cfg.text}
    </span>
  )
}

function formatRelative(ts) {
  const now = Date.now()
  const t = typeof ts === 'number' ? ts : new Date(ts).getTime()
  const sec = Math.floor((now - t) / 1000)
  if (sec < 5)  return 'Saved just now'
  if (sec < 60) return `Saved ${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `Saved ${min}m ago`
  return 'Saved'
}
