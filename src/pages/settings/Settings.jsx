import { useNavigate } from 'react-router-dom'
import { useBusiness } from '../../hooks/useBusiness'
import { useAuth } from '../../hooks/useAuth'
import PageWrapper from '../../components/layout/PageWrapper'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const links = [
  { path: '/settings/staff', label: 'Staff', icon: '👥' },
  { path: '/settings/equipment', label: 'Equipment Library', icon: '🔧' },
  { path: '/settings/job-types', label: 'Job Types', icon: '📋' },
  { path: '/settings/templates', label: 'Communication Templates', icon: '📨' },
  { path: '/settings/automations', label: 'Automations', icon: '⚡' },
  { path: '/settings/surveys', label: 'Survey Results', icon: '⭐' },
  { path: '/settings/integrations', label: 'Integrations', icon: '🔗' },
  { path: '/settings/import', label: 'Import Data', icon: '📥' },
  { path: '/invoices', label: 'Invoices', icon: '💰' },
  { path: '/reports', label: 'Reports & Analytics', icon: '📊' },
  { path: '/recurring-jobs', label: 'Recurring Jobs', icon: '🔄' },
  { path: '/subscription', label: 'Subscription', icon: '💳' },
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
      <div className="px-4 py-4 space-y-4">
        {/* Business Card */}
        <Card className="p-4 flex items-center gap-4">
          {business?.logo_url ? (
            <img src={business.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-brand flex items-center justify-center text-white text-xl font-bold">
              {business?.name?.charAt(0)}
            </div>
          )}
          <div>
            <h2 className="font-bold text-gray-900">{business?.name}</h2>
            {business?.abn && <p className="text-sm text-gray-500">ABN: {business.abn}</p>}
            {business?.email && <p className="text-sm text-gray-500">{business.email}</p>}
          </div>
        </Card>

        {/* Links */}
        <div className="space-y-1">
          {links.map(link => (
            <Card key={link.path} hover onClick={() => navigate(link.path)} className="p-4 flex items-center gap-3">
              <span className="text-xl">{link.icon}</span>
              <span className="font-medium text-gray-900">{link.label}</span>
              <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Card>
          ))}
        </div>

        <Button variant="danger" onClick={handleSignOut} className="w-full">Sign Out</Button>
      </div>
    </PageWrapper>
  )
}
