import { useEffect, useRef } from 'react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const scrollYRef = useRef(0)

  useEffect(() => {
    if (open) {
      scrollYRef.current = window.scrollY
      // Lock scroll — only use html position:fixed (not body overflow:hidden to avoid viewport collapse on iOS)
      document.documentElement.style.position = 'fixed'
      document.documentElement.style.top = `-${scrollYRef.current}px`
      document.documentElement.style.width = '100%'
      document.body.classList.add('modal-open')
    }
    return () => {
      const savedY = scrollYRef.current
      document.documentElement.style.position = ''
      document.documentElement.style.top = ''
      document.documentElement.style.width = ''
      document.body.classList.remove('modal-open')
      // Restore scroll position after unlocking
      if (savedY) window.scrollTo(0, savedY)
    }
  }, [open])

  if (!open) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center overflow-hidden">
        <div
          className={`relative bg-white w-full ${sizes[size]} rounded-t-3xl sm:rounded-3xl shadow-elevated animate-slide-up max-h-[90vh] flex flex-col overflow-hidden`}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex-shrink-0 bg-white border-b border-gray-100 rounded-t-3xl sm:rounded-t-3xl px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-150">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
