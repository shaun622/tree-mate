import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/', label: 'Home' },
  { path: '/schedule', label: 'Schedule' },
  { path: '/jobs', label: 'Jobs' },
  { path: '/clients', label: 'Clients' },
  { path: '/settings', label: 'Settings' },
]

export default function TopNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="hidden md:block sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200/60">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-tree-500 to-tree-700 flex items-center justify-center shadow-button">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-3-3-7-6.5-7-10.5C5 6.5 8 3 12 3s7 3.5 7 7.5c0 4-4 7.5-7 10.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M9 7l3-4 3 4M8 12l4-2 4 2" /></svg>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-tree-600 to-tree-800 bg-clip-text text-transparent">
              TreePro
            </span>
          </button>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {tabs.map(tab => {
              const active = isActive(tab.path)
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'text-tree-700 bg-tree-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-tree-500" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
