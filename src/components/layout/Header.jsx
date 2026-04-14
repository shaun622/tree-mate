import { useNavigate } from 'react-router-dom'

export default function Header({ title, subtitle, back, rightAction }) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200/60 safe-top" style={{ position: '-webkit-sticky' }}>
      <div className="max-w-lg md:max-w-6xl mx-auto flex items-center justify-between px-4 md:px-8 h-14">
        <div className="flex items-center gap-2 min-w-0">
          {back && (
            <button onClick={() => typeof back === 'string' ? navigate(back) : navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-xl transition-colors duration-150 flex-shrink-0">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
            {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
          </div>
        </div>
        {rightAction && <div className="flex-shrink-0">{rightAction}</div>}
      </div>
    </header>
  )
}
