import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Calendar, Briefcase, Users, MoreHorizontal, FileText, Receipt, Repeat, BarChart3, Settings as SettingsIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import MoreSheet from './MoreSheet'

const PRIMARY = [
  { path: '/',         label: 'Home',     Icon: Home,      end: true },
  { path: '/schedule', label: 'Schedule', Icon: Calendar },
  { path: '/jobs',     label: 'Jobs',     Icon: Briefcase },
  { path: '/clients',  label: 'Clients',  Icon: Users },
]

const MORE_ITEMS = [
  { to: '/quotes',         label: 'Quotes',         description: 'View & manage quotes',     Icon: FileText, color: 'blue'    },
  { to: '/invoices',       label: 'Invoices',       description: 'Invoices & payments',      Icon: Receipt,  color: 'amber'   },
  { to: '/recurring-jobs', label: 'Recurring',      description: 'Repeating maintenance',    Icon: Repeat,   color: 'cyan'    },
  { to: '/reports',        label: 'Reports',        description: 'Analytics & insights',     Icon: BarChart3, color: 'violet' },
  { to: '/settings',       label: 'Settings',       description: 'Business profile & more',  Icon: SettingsIcon, color: 'gray' },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (tab) => {
    if (tab.end) return pathname === tab.path
    return pathname === tab.path || pathname.startsWith(tab.path + '/')
  }

  // Highlight "More" if current path matches any overflow item
  const moreActive = MORE_ITEMS.some(i => pathname === i.to || pathname.startsWith(i.to + '/'))

  return (
    <>
      <nav
        aria-label="Primary mobile"
        className="app-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/60 dark:border-gray-800/60 shadow-nav"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-5 max-w-lg mx-auto h-16">
          {PRIMARY.map(tab => {
            const active = isActive(tab)
            const { Icon } = tab
            return (
              <Link
                key={tab.path}
                to={tab.path}
                onClick={() => window.scrollTo(0, 0)}
                className="min-h-tap relative flex flex-col items-center justify-center gap-0.5 no-underline group"
              >
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-brand-500 rounded-full" />}
                <Icon
                  className={cn(
                    'w-5 h-5',
                    active ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300',
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className={cn(
                    'text-[10px] font-semibold',
                    active ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500',
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="min-h-tap relative flex flex-col items-center justify-center gap-0.5"
            aria-label="Open more navigation"
          >
            {moreActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-brand-500 rounded-full" />}
            <MoreHorizontal
              className={cn(
                'w-5 h-5',
                moreActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500',
              )}
              strokeWidth={moreActive ? 2.5 : 2}
            />
            <span
              className={cn(
                'text-[10px] font-semibold',
                moreActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500',
              )}
            >
              More
            </span>
          </button>
        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} items={MORE_ITEMS} />
    </>
  )
}
