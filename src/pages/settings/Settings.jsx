import { useNavigate } from 'react-router-dom'
import {
  Users, Wrench, Briefcase, MessageSquare, Zap, Star,
  Receipt, BarChart3, Repeat, Plug, Upload, CreditCard, LogOut, ChevronRight,
} from 'lucide-react'
import { useBusiness } from '../../hooks/useBusiness'
import { useAuth } from '../../hooks/useAuth'
import PageWrapper from '../../components/layout/PageWrapper'
import Header from '../../components/layout/Header'
import PageHero from '../../components/layout/PageHero'
import { ThemeToggleFull } from '../../components/layout/ThemeToggle'
import Card from '../../components/ui/Card'
import { cn } from '../../lib/utils'

const sections = [
  {
    title: 'Team & Resources',
    items: [
      { path: '/settings/staff',     label: 'Staff',             desc: 'Manage your team members',          Icon: Users,    color: 'blue'    },
      { path: '/settings/equipment', label: 'Equipment Library', desc: 'Manage your tools & machinery',     Icon: Wrench,   color: 'amber'   },
      { path: '/settings/job-types', label: 'Job Types',         desc: 'Service templates with default tasks', Icon: Briefcase, color: 'brand' },
    ],
  },
  {
    title: 'Communications',
    items: [
      { path: '/settings/templates',   label: 'Message Templates', desc: 'Email & SMS templates for automations', Icon: MessageSquare, color: 'violet' },
      { path: '/settings/automations', label: 'Automations',       desc: 'Auto-send reminders & follow-ups',      Icon: Zap,           color: 'amber'  },
      { path: '/settings/surveys',     label: 'Survey Results',    desc: 'Customer feedback & ratings',           Icon: Star,          color: 'pink'   },
    ],
  },
  {
    title: 'Business',
    items: [
      { path: '/invoices',       label: 'Invoices',           desc: 'Billing & payment tracking',     Icon: Receipt,   color: 'emerald' },
      { path: '/reports',        label: 'Reports & Analytics', desc: 'Performance insights & data',    Icon: BarChart3, color: 'indigo'  },
      { path: '/recurring-jobs', label: 'Recurring Jobs',     desc: 'Scheduled service profiles',      Icon: Repeat,    color: 'cyan'    },
    ],
  },
  {
    title: 'Account',
    items: [
      { path: '/settings/integrations', label: 'Integrations', desc: 'Connect third-party services', Icon: Plug,       color: 'gray'   },
      { path: '/settings/import',       label: 'Import Data',  desc: 'Upload CSV client & site data', Icon: Upload,     color: 'teal'   },
      { path: '/subscription',          label: 'Subscription', desc: 'Manage your plan & billing',    Icon: CreditCard, color: 'violet' },
    ],
  },
]

const COLOR_CLASSES = {
  brand:   'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400',
  blue:    'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  amber:   'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  indigo:  'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
  cyan:    'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400',
  violet:  'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  pink:    'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400',
  teal:    'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400',
  gray:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
}

export default function Settings() {
  const { business } = useBusiness()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <PageWrapper>
      <div className="md:hidden">
        <Header title="Settings" subtitle="Business configuration" />
      </div>

      <div className="px-4 md:px-0 py-4 space-y-6">
        <div className="hidden md:block">
          <PageHero
            title="Settings"
            subtitle={user?.email ? `Signed in as ${user.email}` : 'Business configuration'}
          />
        </div>

        {/* Business Card */}
        <Card className="!p-5 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-brand-light opacity-30 dark:opacity-10" />
          <div className="relative shrink-0">
            {business?.logo_url ? (
              <img src={business.logo_url} alt="" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center text-white text-xl font-bold shadow-button">
                {business?.name?.charAt(0)}
              </div>
            )}
          </div>
          <div className="relative min-w-0">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base truncate">{business?.name}</h2>
            {business?.abn && <p className="text-sm text-gray-500 dark:text-gray-500 truncate">ABN: {business.abn}</p>}
            {business?.email && <p className="text-sm text-gray-500 dark:text-gray-500 truncate">{business.email}</p>}
          </div>
        </Card>

        {/* Settings Sections */}
        {sections.map(section => (
          <div key={section.title} className="space-y-2">
            <h3 className="section-title px-1">{section.title}</h3>
            <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
              {section.items.map(item => {
                const { Icon } = item
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 active:bg-gray-100 dark:bg-gray-800 dark:active:bg-gray-800 transition-colors duration-150 group text-left"
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', COLOR_CLASSES[item.color] || COLOR_CLASSES.brand)}>
                      <Icon className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{item.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 dark:group-hover:text-gray-400 dark:text-gray-500 group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
                  </button>
                )
              })}
            </Card>
          </div>
        ))}

        {/* Appearance — three-mode segmented control */}
        <div className="space-y-2">
          <h3 className="section-title px-1">Appearance</h3>
          <Card className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Theme</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Choose light, dark, or match your system</p>
            </div>
            <ThemeToggleFull />
          </Card>
        </div>

        {/* Sign out — small secondary button, NOT red full-width */}
        <div className="pt-2">
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white border border-gray-200 dark:border-gray-700 shadow-card hover:bg-gray-50 dark:bg-gray-900/50 dark:hover:bg-gray-800 min-h-tap transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={2} />
            Sign out
          </button>
        </div>

        <p className="text-center text-xs text-gray-300 dark:text-gray-300 pb-2">TreePro v1.0.0</p>
      </div>
    </PageWrapper>
  )
}
