import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'
import Modal from './Modal'
import Button from './Button'

/**
 * ConfirmModal — replaces every window.confirm. Centered icon + title + description + action row.
 *
 * Usage:
 *   <ConfirmModal
 *     open={open} onClose={() => setOpen(false)}
 *     title="Delete this job?" description="This cannot be undone."
 *     destructive confirmLabel="Delete"
 *     onConfirm={async () => { await deleteJob(id) }}
 *   />
 */
export default function ConfirmModal({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  zLayer = 60,
}) {
  const [running, setRunning] = useState(false)

  async function run() {
    if (running) return
    setRunning(true)
    try {
      await onConfirm?.()
      onClose?.()
    } finally {
      setRunning(false)
    }
  }

  return (
    <Modal open={open} onClose={running ? undefined : onClose} size="sm" zLayer={zLayer}>
      <div className="flex justify-center pt-2">
        <div
          className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center',
            destructive
              ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
              : 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400',
          )}
        >
          <AlertTriangle className="w-7 h-7" strokeWidth={2} />
        </div>
      </div>
      <div className="text-center mt-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
      </div>
      <div className="flex gap-2 mt-5">
        <Button variant="secondary" onClick={onClose} disabled={running} className="flex-1">{cancelLabel}</Button>
        <Button
          variant={destructive ? 'danger' : 'primary'}
          onClick={run}
          loading={running}
          className="flex-1"
        >
          {confirmLabel ?? (destructive ? 'Delete' : 'Confirm')}
        </Button>
      </div>
    </Modal>
  )
}
