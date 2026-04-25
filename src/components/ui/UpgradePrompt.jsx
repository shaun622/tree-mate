import { useNavigate } from 'react-router-dom'

export default function UpgradePrompt({ message, onClose }) {
  const navigate = useNavigate()

  return (
    <div className="bg-gradient-to-r from-brand-50 to-emerald-50 rounded-2xl p-5 border border-brand-100 ring-1 ring-brand-200/30">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Upgrade required</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{message}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => navigate('/subscription')}
              className="px-4 py-2 bg-gradient-brand text-white text-xs font-semibold rounded-xl shadow-button hover:shadow-button-hover transition-colors duration-150"
            >
              View Plans
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-300 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
