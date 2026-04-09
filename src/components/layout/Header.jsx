import { useNavigate } from 'react-router-dom'

export default function Header({ title, back, rightAction }) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 glass-strong safe-top">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          {back && (
            <button onClick={() => typeof back === 'string' ? navigate(back) : navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-xl transition-all duration-200 active:scale-95">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  )
}
