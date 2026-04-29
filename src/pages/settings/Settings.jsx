import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Palette, Users, Wrench, Briefcase, MessageSquare, Zap, Star,
  Receipt, BarChart3, Repeat, Plug, Upload, CreditCard, Award, LogOut, ChevronRight,
} from 'lucide-react'
import { useBusiness } from '../../hooks/useBusiness'
import { useAuth } from '../../hooks/useAuth'
import PageWrapper from '../../components/layout/PageWrapper'
import Header from '../../components/layout/Header'
import PageHero from '../../components/layout/PageHero'
import { ThemeToggleFull } from '../../components/layout/ThemeToggle'
import Card from '../../components/ui/Card'
import { cn } from '../../lib/utils'

// Mobile sections (used by mobile row-link layout) and desktop sidebar (single source)
const SIDEBAR = [
  { key: 'organisation',  label: 'Organisation',     Icon: Building2,    desc: 'Branding · trading name · cert' },
  { key: 'branding',      label: 'Branding',         Icon: Palette,      desc: 'Logo, colours, public touchpoints' },
  { key: 'team',          label: 'Team & roles',     Icon: Users,        desc: 'Staff list, photos, roles',     route: '/settings/staff' },
  { key: 'catalogue',     label: 'Service catalogue',Icon: Briefcase,    desc: 'Job types & default tasks',     route: '/settings/job-types' },
  { key: 'equipment',     label: 'Equipment library',Icon: Wrench,       desc: 'Tools, machinery, hourly rates',route: '/settings/equipment' },
  { key: 'templates',     label: 'Templates',        Icon: MessageSquare,desc: 'Email & SMS message templates',  route: '/settings/templates' },
  { key: 'automations',   label: 'Automations',      Icon: Zap,          desc: 'Auto-send reminders & follow-ups',route: '/settings/automations' },
  { key: 'surveys',       label: 'Survey results',   Icon: Star,         desc: 'Customer feedback & ratings',     route: '/settings/surveys' },
  { key: 'integrations',  label: 'Integrations',     Icon: Plug,         desc: 'Connect third-party services',    route: '/settings/integrations' },
  { key: 'import',        label: 'Import data',      Icon: Upload,       desc: 'Upload CSV client & site data',   route: '/settings/import' },
  { key: 'billing',       label: 'Billing',          Icon: CreditCard,   desc: 'Plan, invoices, payment method',  route: '/subscription' },
  { key: 'compliance',    label: 'Compliance',       Icon: Award,        desc: 'AS 4373 · insurance · permits' },
]

const BRAND_SWATCHES = [
  { value: '#22c55e', name: 'Tree green' },
  { value: '#16a34a', name: 'Forest' },
  { value: '#0ea5e9', name: 'Sky' },
  { value: '#f97316', name: 'Orange' },
  { value: '#dc2626', name: 'Red' },
  { value: '#0b0b0d', name: 'Black' },
]

export default function Settings() {
  const { business } = useBusiness()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [active, setActive] = useState('organisation')

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const activeItem = SIDEBAR.find(s => s.key === active)

  return (
    <PageWrapper width="wide">
      <div className="md:hidden">
        <Header title="Settings" subtitle="Business configuration" />
      </div>

      <div className="px-4 md:px-6 py-5 md:py-6">
        <div className="hidden md:block mb-5">
          <PageHero
            eyebrow="Settings"
            title={activeItem?.label || 'Organisation'}
            subtitle={null}
            action={
              <button className="pill-ghost text-[12px] text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800/50 bg-brand-50 dark:bg-brand-950/30 hover:bg-brand-100">
                Save changes
              </button>
            }
          />
        </div>

        {/* Mobile: row-link card list */}
        <div className="md:hidden space-y-4">
          <Card className="!p-5 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-brand-light opacity-30 dark:opacity-10" />
            <div className="relative shrink-0">
              {business?.logo_url ? (
                <img src={business.logo_url} alt="" className="w-14 h-14 rounded-card object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm" />
              ) : (
                <div className="w-14 h-14 rounded-card bg-gradient-brand flex items-center justify-center text-white text-xl font-bold shadow-button">
                  {business?.name?.charAt(0)}
                </div>
              )}
            </div>
            <div className="relative min-w-0">
              <h2 className="font-bold text-ink-1 text-base truncate">{business?.name}</h2>
              {business?.email && <p className="text-sm text-ink-3 truncate">{business.email}</p>}
            </div>
          </Card>

          <Card className="!p-0 divide-y divide-line-2 overflow-hidden">
            {SIDEBAR.filter(s => s.route).map(s => {
              const { Icon } = s
              return (
                <button
                  key={s.key}
                  onClick={() => navigate(s.route)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-shell-2 active:bg-shell-3 transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-card bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink-1 text-[13.5px]">{s.label}</p>
                    <p className="text-[11.5px] text-ink-3 truncate">{s.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-4 group-hover:translate-x-0.5 transition-transform shrink-0" strokeWidth={2} />
                </button>
              )
            })}
          </Card>

          {/* Appearance */}
          <div className="space-y-2">
            <h3 className="section-title px-1">Appearance</h3>
            <Card className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-ink-1 text-[13.5px]">Theme</p>
                <p className="text-[11.5px] text-ink-3">Choose light, dark, or match your system</p>
              </div>
              <ThemeToggleFull />
            </Card>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-card text-sm font-semibold text-ink-2 bg-shell border border-line shadow-card hover:bg-shell-2 min-h-tap transition-colors"
            >
              <LogOut className="w-4 h-4" strokeWidth={2} />
              Sign out
            </button>
          </div>

          <p className="text-center text-xs text-ink-4 pb-2">TreeMate v1.0.0</p>
        </div>

        {/* Desktop: sidebar + pane */}
        <div className="hidden md:grid md:grid-cols-12 gap-4">
          {/* Sidebar */}
          <aside className="md:col-span-3 card !p-2 self-start">
            <nav className="space-y-0.5">
              {SIDEBAR.map(s => {
                const { Icon } = s
                const isActive = active === s.key
                return (
                  <button
                    key={s.key}
                    onClick={() => s.route ? navigate(s.route) : setActive(s.key)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-[13px] transition-colors',
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-medium'
                        : 'text-ink-2 hover:bg-shell-2',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                    <span className="truncate">{s.label}</span>
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Pane */}
          <div className="md:col-span-9 card !p-6 space-y-6">
            {active === 'organisation' && (
              <OrganisationPane business={business} user={user} />
            )}
            {active === 'branding' && <BrandingPane business={business} />}
            {active === 'compliance' && (
              <div>
                <div className="eyebrow mb-2">Compliance</div>
                <h3 className="text-[16px] font-semibold text-ink-1">AS 4373 · Insurance · Permits</h3>
                <p className="text-[12.5px] text-ink-3 mt-1">Coming soon — track certifications, public liability, and council permits in one place.</p>
              </div>
            )}

            {/* Sign out */}
            <div className="pt-4 border-t border-line-2">
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-card text-sm font-medium text-ink-2 bg-shell border border-line hover:bg-shell-2 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
                Sign out
              </button>
              <p className="text-[10px] text-ink-4 mt-3">TreeMate v1.0.0 · Signed in as {user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

function OrganisationPane({ business, user }) {
  return (
    <>
      <div>
        <div className="eyebrow mb-2">Branding · what your customers see</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
          <Field label="Trading name" value={business?.name || 'Your Tree Services Ltd'} />
          <Field label="Domain" value={business?.website || 'yourtree.com.au'} />
          <Field label="Cert / membership" value="Arboricultural Assoc · #4471" />
          <Field label="Public email" value={business?.email || user?.email || ''} />
        </div>
      </div>

      <div>
        <div className="eyebrow mb-2">Brand colour · used on PDFs, the customer portal, your invoices</div>
        <div className="flex items-center gap-2 mt-3">
          {BRAND_SWATCHES.map(c => (
            <button
              key={c.value}
              className={cn(
                'w-9 h-9 rounded-card border-2 transition-all',
                c.value === '#22c55e' ? 'border-ink-1 ring-2 ring-brand-200/50' : 'border-line hover:border-ink-3',
              )}
              style={{ backgroundColor: c.value }}
              aria-label={c.name}
            />
          ))}
          <span className="ml-3 text-[12px] font-mono text-ink-3 tabular-nums">Selected · #22c55e</span>
        </div>
      </div>

      <div>
        <div className="eyebrow mb-2">Sample report preview</div>
        <div className="card-interactive card !p-4 flex items-center justify-between mt-3 cursor-pointer hover:shadow-card-hover">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-card bg-gradient-brand flex items-center justify-center text-white font-bold">
              {business?.name?.charAt(0) || 'T'}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-brand-600 dark:text-brand-400">AS 4373 ready certified</div>
              <div className="text-[14px] font-semibold text-ink-1 mt-0.5 truncate">{business?.name || 'Your Tree Services Ltd'}</div>
              <div className="text-[11.5px] text-ink-3">Site visit report · 28 Apr 2026 · REF TM-2041</div>
            </div>
          </div>
          <span className="pill-ghost text-[12px] shrink-0">Open PDF</span>
        </div>
      </div>
    </>
  )
}

function BrandingPane({ business }) {
  return (
    <div>
      <div className="eyebrow mb-2">Branding</div>
      <p className="text-[13px] text-ink-3 max-w-prose">
        Logo, public colours, and the look of your customer-facing PDFs and portal. Configured in Organisation for now.
      </p>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-wider text-ink-3 mb-1.5">{label}</label>
      <input
        defaultValue={value}
        className="input"
        style={{ fontSize: '14px' }}
      />
    </div>
  )
}
