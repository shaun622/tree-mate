import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'

const integrations = [
  { name: 'Resend', description: 'Email delivery for quotes, reports, and notifications', icon: '📧', status: 'configure' },
  { name: 'Twilio', description: 'SMS notifications for clients and staff', icon: '📱', status: 'coming_soon' },
  { name: 'Stripe', description: 'Online payments and subscription billing', icon: '💳', status: 'coming_soon' },
  { name: 'Xero', description: 'Accounting and invoicing sync', icon: '📊', status: 'coming_soon' },
  { name: 'Google Maps', description: 'Route planning and site geocoding', icon: '🗺️', status: 'coming_soon' },
]

export default function Integrations() {
  return (
    <>
      <div className="px-4 py-4 space-y-2">
        {integrations.map(int => (
          <Card key={int.name} className="p-4 flex items-center gap-4">
            <span className="text-2xl">{int.icon}</span>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-gray-100">{int.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">{int.description}</p>
            </div>
            <Badge variant={int.status === 'connected' ? 'success' : int.status === 'configure' ? 'warning' : 'neutral'}>
              {int.status === 'connected' ? 'Connected' : int.status === 'configure' ? 'Configure' : 'Coming Soon'}
            </Badge>
          </Card>
        ))}
      </div>
    </>
  )
}
