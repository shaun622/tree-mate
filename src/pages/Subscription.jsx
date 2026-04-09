import { useBusiness } from '../hooks/useBusiness'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { formatDate } from '../lib/utils'

const PLANS = [
  {
    name: 'Trial', key: 'trial', price: 'Free',
    features: ['1 staff member', '10 clients', '5 job sites', 'Basic reports', '14-day trial'],
  },
  {
    name: 'Starter', key: 'starter', price: '$29/mo',
    features: ['2 staff members', '50 clients', 'Unlimited job sites', 'Quote & invoice', 'Email templates', 'Customer portal'],
  },
  {
    name: 'Pro', key: 'pro', price: '$79/mo',
    features: ['10 staff members', 'Unlimited clients', 'Unlimited job sites', 'Automations', 'Advanced reports', 'Priority support', 'Custom branding'],
  },
]

export default function Subscription() {
  const { business } = useBusiness()

  return (
    <PageWrapper>
      <Header title="Subscription" back="/settings" />

      <div className="px-4 py-4 space-y-4">
        {/* Current Plan */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current Plan</p>
              <p className="text-xl font-bold text-gray-900 capitalize">{business?.plan || 'trial'}</p>
            </div>
            <Badge variant={business?.plan === 'pro' ? 'success' : business?.plan === 'starter' ? 'primary' : 'warning'}>
              {business?.plan === 'trial' ? 'Trial' : 'Active'}
            </Badge>
          </div>
          {business?.plan === 'trial' && business?.trial_ends_at && (
            <p className="text-sm text-amber-600 mt-2">Trial expires: {formatDate(business.trial_ends_at)}</p>
          )}
        </Card>

        {/* Plan Cards */}
        {PLANS.map(plan => (
          <Card key={plan.key} className={`p-4 ${business?.plan === plan.key ? 'ring-2 ring-tree-500' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="text-2xl font-bold text-tree-600">{plan.price}</p>
              </div>
              {business?.plan === plan.key && <Badge variant="success">Current</Badge>}
            </div>
            <ul className="space-y-2 mb-4">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-tree-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {f}
                </li>
              ))}
            </ul>
            {business?.plan !== plan.key && plan.key !== 'trial' && (
              <Button className="w-full">Upgrade to {plan.name}</Button>
            )}
          </Card>
        ))}
      </div>
    </PageWrapper>
  )
}
