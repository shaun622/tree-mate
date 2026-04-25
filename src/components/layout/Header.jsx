import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function Header({ title, subtitle, back, rightAction }) {
  const navigate = useNavigate()

  return (
    <header
      className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200/60 dark:border-gray-800/60 safe-top"
      style={{ position: '-webkit-sticky' }}
    >
      <div className="max-w-lg md:max-w-6xl mx-auto flex items-center justify-between px-4 md:px-8 h-14">
        <div className="flex items-center gap-2 min-w-0">
          {back && (
            <button
              onClick={() => typeof back === 'string' ? navigate(back) : navigate(-1)}
              className="p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors duration-150 flex-shrink-0"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" strokeWidth={2.5} />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
            {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{subtitle}</p>}
          </div>
        </div>
        {rightAction && <div className="flex-shrink-0">{rightAction}</div>}
      </div>
    </header>
  )
}
