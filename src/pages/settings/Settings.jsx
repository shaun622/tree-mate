import { useNavigate } from 'react-router-dom'
import { useBusiness } from '../../hooks/useBusiness'
import { useAuth } from '../../hooks/useAuth'
import PageWrapper from '../../components/layout/PageWrapper'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const Icon = ({ d, className }) => <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>

const sections = [
  {
    title: 'Team & Resources',
    items: [
      { path: '/settings/staff', label: 'Staff', desc: 'Manage your team members', icon: <Icon d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100' },
      { path: '/settings/equipment', label: 'Equipment Library', desc: 'Manage your tools & machinery', icon: <Icon d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />, color: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-100' },
      { path: '/settings/job-types', label: 'Job Types', desc: 'Service templates with default tasks', icon: <Icon d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />, color: 'text-green-600', bg: 'bg-green-50', ring: 'ring-green-100' },
    ]
  },
  {
    title: 'Communications',
    items: [
      { path: '/settings/templates', label: 'Message Templates', desc: 'Email & SMS templates for automations', icon: <Icon d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />, color: 'text-purple-600', bg: 'bg-purple-50', ring: 'ring-purple-100' },
      { path: '/settings/automations', label: 'Automations', desc: 'Auto-send reminders & follow-ups', icon: <Icon d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />, color: 'text-yellow-600', bg: 'bg-yellow-50', ring: 'ring-yellow-100' },
      { path: '/settings/surveys', label: 'Survey Results', desc: 'Customer feedback & ratings', icon: <Icon d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />, color: 'text-pink-600', bg: 'bg-pink-50', ring: 'ring-pink-100' },
    ]
  },
  {
    title: 'Business',
    items: [
      { path: '/invoices', label: 'Invoices', desc: 'Billing & payment tracking', icon: <Icon d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
      { path: '/reports', label: 'Reports & Analytics', desc: 'Performance insights & data', icon: <Icon d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />, color: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-100' },
      { path: '/recurring-jobs', label: 'Recurring Jobs', desc: 'Scheduled service profiles', icon: <Icon d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992" />, color: 'text-cyan-600', bg: 'bg-cyan-50', ring: 'ring-cyan-100' },
    ]
  },
  {
    title: 'Account',
    items: [
      { path: '/settings/integrations', label: 'Integrations', desc: 'Connect third-party services', icon: <Icon d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />, color: 'text-gray-600', bg: 'bg-gray-50', ring: 'ring-gray-200' },
      { path: '/settings/import', label: 'Import Data', desc: 'Upload CSV client & site data', icon: <Icon d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />, color: 'text-teal-600', bg: 'bg-teal-50', ring: 'ring-teal-100' },
      { path: '/subscription', label: 'Subscription', desc: 'Manage your plan & billing', icon: <Icon d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />, color: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-100' },
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
      <Header title="Settings" subtitle="Business configuration" />
      <div className="px-4 md:px-0 py-4 space-y-6">
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
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50/80 transition-colors duration-150 active:bg-gray-100 group"
                >
                  <div className={`w-10 h-10 rounded-xl ${item.bg} ring-1 ${item.ring} flex items-center justify-center ${item.color} flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                    {item.icon}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                    <p className="text-xs text-gray-400 truncate">{item.desc}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-colors duration-150 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
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
