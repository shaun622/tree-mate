import { useEffect, useRef } from 'react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const scrollYRef = useRef(0)

  useEffect(() => {
    if (open) {
      scrollYRef.current = window.scrollY
      // Lock body scroll — works on Safari iOS
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
      document.body.classList.add('modal-open')
    } else {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
      document.body.classList.remove('modal-open')
      window.scrollTo(0, scrollYRef.current)
    }
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
      document.body.classList.remove('modal-open')
    }
  }, [open])

  if (!open) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative bg-white w-full ${sizes[size]} rounded-t-3xl sm:rounded-3xl shadow-elevated animate-slide-up max-h-[90vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 bg-white/90 backdrop-blur-xl rounded-t-3xl sm:rounded-t-3xl border-b border-gray-100/80 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 active:scale-95">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 -webkit-overflow-scrolling-touch">{children}</div>
      </div>
    </div>
  )
}
