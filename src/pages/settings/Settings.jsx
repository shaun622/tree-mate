import { useNavigate } from 'react-router-dom'
import { useBusiness } from '../../hooks/useBusiness'
import { useAuth } from '../../hooks/useAuth'
import PageWrapper from '../../components/layout/PageWrapper'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const sections = [
  {
    title: 'Team & Resources',
    items: [
      { path: '/settings/staff', label: 'Staff', desc: 'Manage your team members', icon: '👥', bg: 'bg-blue-50', ring: 'ring-blue-100' },
      { path: '/settings/equipment', label: 'Equipment Library', desc: 'Manage your products & dosages', icon: '🔧', bg: 'bg-orange-50', ring: 'ring-orange-100' },
      { path: '/settings/job-types', label: 'Job Types', desc: 'Service templates with default tasks', icon: '📋', bg: 'bg-green-50', ring: 'ring-green-100' },
    ]
  },
  {
    title: 'Communications',
    items: [
      { path: '/settings/templates', label: 'Message Templates', desc: 'Email & SMS templates for automations', icon: '✉️', bg: 'bg-purple-50', ring: 'ring-purple-100' },
      { path: '/settings/automations', label: 'Automations', desc: 'Auto-send reminders & follow-ups', icon: '⚡', bg: 'bg-yellow-50', ring: 'ring-yellow-100' },
      { path: '/settings/surveys', label: 'Survey Results', desc: 'Customer feedback & ratings', icon: '⭐', bg: 'bg-pink-50', ring: 'ring-pink-100' },
    ]
  },
  {
    title: 'Business',
    items: [
      { path: '/invoices', label: 'Invoices', desc: 'Billing & payment tracking', icon: '💰', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
      { path: '/reports', label: 'Reports & Analytics', desc: 'Performance insights & data', icon: '📊', bg: 'bg-indigo-50', ring: 'ring-indigo-100' },
      { path: '/recurring-jobs', label: 'Recurring Jobs', desc: 'Scheduled service profiles', icon: '🔄', bg: 'bg-cyan-50', ring: 'ring-cyan-100' },
    ]
  },
  {
    title: 'Account',
    items: [
      { path: '/settings/integrations', label: 'Integrations', desc: 'Connect third-party services', icon: '🔗', bg: 'bg-gray-50', ring: 'ring-gray-200' },
      { path: '/settings/import', label: 'Import Data', desc: 'Upload CSV client & site data', icon: '📥', bg: 'bg-teal-50', ring: 'ring-teal-100' },
      { path: '/subscription', label: 'Subscription', desc: 'Manage your plan & billing', icon: '💳', bg: 'bg-violet-50', ring: 'ring-violet-100' },
    ]
  }
]

export default function Settings() {
  const { business } = useBusiness()
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <PageWrapper>
      <Header title="Settings" />
      <div className="px-4 py-4 space-y-6">
        {/* Business Card */}
        <Card className="p-5 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-brand-light opacity-30" />
          <div className="relative">
            {business?.logo_url ? (
              <img src={business.logo_url} alt="" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-sm" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center text-white text-xl font-bold shadow-button">
                {business?.name?.charAt(0)}
              </div>
            )}
          </div>
          <div className="relative">
            <h2 className="font-bold text-gray-900 text-base">{business?.name}</h2>
            {business?.abn && <p className="text-sm text-gray-500">ABN: {business.abn}</p>}
            {business?.email && <p className="text-sm text-gray-500">{business.email}</p>}
          </div>
        </Card>

        {/* Settings Sections */}
        {sections.map(section => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">{section.title}</h3>
            <Card className="divide-y divide-gray-50 overflow-hidden">
              {section.items.map(item => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50/80 transition-all duration-200 active:bg-gray-100 group"
                >
                  <div className={`w-10 h-10 rounded-xl ${item.bg} ring-1 ${item.ring} flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                    {item.icon}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                    <p className="text-xs text-gray-400 truncate">{item.desc}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </Card>
          </div>
        ))}

        <Button variant="danger" onClick={handleSignOut} className="w-full">Sign Out</Button>

        <p className="text-center text-xs text-gray-300 pb-2">TreePro v1.0.0</p>
      </div>
    </PageWrapper>
  )
}
