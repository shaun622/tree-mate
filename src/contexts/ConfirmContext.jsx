import { createContext, useCallback, useContext, useRef, useState } from 'react'
import ConfirmModal from '../components/ui/ConfirmModal'

const ConfirmContext = createContext(null)

/**
 * useConfirm() — Promise-based confirmation. Drop-in replacement for window.confirm.
 *
 * Usage:
 *   const confirm = useConfirm()
 *   const ok = await confirm({
 *     title: 'Send amended quote?',
 *     description: 'The quote was already accepted.',
 *     confirmLabel: 'Send anyway',
 *     destructive: false,
 *   })
 *   if (!ok) return
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false })
  const resolverRef = useRef(null)

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setState({ open: true, ...opts })
    })
  }, [])

  const handleClose = (result) => {
    setState((s) => ({ ...s, open: false }))
    if (resolverRef.current) {
      resolverRef.current(result)
      resolverRef.current = null
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmModal
        open={state.open}
        onClose={() => handleClose(false)}
        title={state.title}
        description={state.description}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        destructive={state.destructive}
        onConfirm={async () => { handleClose(true) }}
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}
