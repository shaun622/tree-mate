import { NavLink, Link, useLocation } from 'react-router-dom'
import { Home, Calendar, Briefcase, Users, FileText, Receipt, BarChart3, Settings as SettingsIcon, Search } from 'lucide-react'
import { cn } from '../../lib/utils'
import GlobalSearch from './GlobalSearch'
import { ThemeToggleCompact } from './ThemeToggle'
import { useState } from 'react'

const TABS = [
  { path: '/',          label: 'Home',     Icon: Home,        end: true },
  { path: '/schedule',  label: 'Schedule', Icon: Calendar },
  { path: '/clients',   label: 'Clients',  Icon: Users },
  { path: '/jobs',      label: 'Jobs',     Icon: Briefcase },
  { path: '/quotes',    label: 'Quotes',   Icon: FileText },
  { path: '/invoices',  label: 'Invoices', Icon: Receipt },
  { path: '/reports',   label: 'Analytics',Icon: BarChart3 },
  { path: '/settings',  label: 'Settings', Icon: SettingsIcon },
]

export default function TopNav() {
  const { pathname } = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)

  const isActive = (tab) => {
    if (tab.end) return pathname === tab.path
    return pathname === tab.path || pathname.startsWith(tab.path + '/')
  }

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-canvas">
      <div className="max-w-7xl mx-auto px-6 pt-4">
        {/* Row 1: brand wordmark (left), centered green TreeMate pill, search/theme/avatar (right) */}
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-card bg-gradient-brand flex items-center justify-center shadow-button">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-3-3-7-6.5-7-10.5C5 6.5 8 3 12 3s7 3.5 7 7.5c0 4-4 7.5-7 10.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M9 7l3-4 3 4M8 12l4-2 4 2" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight text-ink-1">TreeMate</div>
              <div className="text-[9.5px] font-medium tracking-[0.14em] uppercase text-ink-3 font-mono">
                by Fieldsuite
              </div>
            </div>
          </Link>

          {/* Centered brand pill */}
          <Link to="/" className="brand-pill group">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-3-3-7-6.5-7-10.5C5 6.5 8 3 12 3s7 3.5 7 7.5c0 4-4 7.5-7 10.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M9 7l3-4 3 4M8 12l4-2 4 2" />
            </svg>
            TreeMate
          </Link>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setSearchOpen(o => !o)}
              aria-label="Search"
              className="min-h-tap min-w-tap flex items-center justify-center rounded-card p-2 text-ink-3 hover:bg-shell-3 transition-colors"
            >
              <Search className="w-4 h-4" strokeWidth={2} />
            </button>
            <ThemeToggleCompact />
            <Link
              to="/settings"
              aria-label="Account"
              className="ml-1 w-8 h-8 rounded-full bg-brand-200 dark:bg-brand-800 flex items-center justify-center text-brand-700 dark:text-brand-200 text-xs font-semibold"
            >
              <span aria-hidden>·</span>
            </Link>
          </div>
        </div>

        {/* Row 2: underline tabs */}
        <nav
          aria-label="Primary"
          className="flex items-center gap-1 overflow-x-auto scrollbar-none border-b border-line"
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
                  'flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                  active
                    ? 'border-brand-500 text-ink-1'
                    : 'border-transparent text-ink-3 hover:text-ink-2',
                )}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                {tab.label}
              </NavLink>
            )
          })}
        </nav>

        {/* Inline search dropdown when toggled */}
        {searchOpen && (
          <div className="absolute left-1/2 top-16 -translate-x-1/2 w-full max-w-xl px-6 pt-2 z-50">
            <GlobalSearch />
          </div>
        )}
      </div>
    </header>
  )
}
