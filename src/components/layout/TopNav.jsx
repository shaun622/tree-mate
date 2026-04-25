import { NavLink, Link, useLocation } from 'react-router-dom'
import { Home, Calendar, Briefcase, Users, FileText, Receipt, Repeat, BarChart3, Settings as SettingsIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import GlobalSearch from './GlobalSearch'
import { ThemeToggleCompact } from './ThemeToggle'

const TABS = [
  { path: '/',          label: 'Home',     Icon: Home,        end: true },
  { path: '/schedule',  label: 'Schedule', Icon: Calendar },
  { path: '/jobs',      label: 'Jobs',     Icon: Briefcase },
  { path: '/clients',   label: 'Clients',  Icon: Users },
  { path: '/quotes',    label: 'Quotes',   Icon: FileText },
  { path: '/invoices',  label: 'Invoices', Icon: Receipt },
  { path: '/recurring-jobs', label: 'Recurring', Icon: Repeat },
  { path: '/reports',   label: 'Reports',  Icon: BarChart3 },
]

export default function TopNav() {
  const { pathname } = useLocation()

  const isActive = (tab) => {
    if (tab.end) return pathname === tab.path
    return pathname === tab.path || pathname.startsWith(tab.path + '/') || pathname.startsWith(tab.path + '?')
  }

  return (
    <header
      className="hidden md:block sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60"
      style={{ position: '-webkit-sticky' }}
    >
      {/* Row 1: brand + global search + theme + settings */}
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-4 min-h-[60px]">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-button">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-3-3-7-6.5-7-10.5C5 6.5 8 3 12 3s7 3.5 7 7.5c0 4-4 7.5-7 10.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M9 7l3-4 3 4M8 12l4-2 4 2" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-brand-600 to-brand-800 dark:from-brand-300 dark:to-brand-500 bg-clip-text text-transparent">
            TreePro
          </span>
        </Link>

        <GlobalSearch className="flex-1 max-w-2xl mx-auto" />

        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggleCompact />
          <Link
            to="/settings"
            aria-label="Settings"
            className="min-h-tap min-w-tap flex items-center justify-center rounded-xl p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          >
            <SettingsIcon className="w-5 h-5" strokeWidth={2} />
          </Link>
        </div>
      </div>

      {/* Row 2: underline tabs */}
      <nav
        aria-label="Primary"
        className="max-w-7xl mx-auto px-6 flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-gray-100 dark:border-gray-800/60"
      >
        {TABS.map(tab => {
          const active = isActive(tab)
          const { Icon } = tab
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              onClick={() => window.scrollTo(0, 0)}
              className={cn(
                'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                active
                  ? 'border-brand-500 text-brand-700 dark:text-brand-300'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
              {tab.label}
            </NavLink>
          )
        })}
      </nav>
    </header>
  )
}
