import { useState } from 'react'
import { useBusiness } from '../hooks/useBusiness'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'

const PLANS = [
  {
    name: 'Basic',
    monthly: 7,
    yearly: 50,
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
    iconBg: 'bg-gray-100 text-gray-600',
    popular: false,
    features: [
      '10 quotes per month',
      'Send quotes via email',
      'Job tracking & status updates',
      'Customer notifications',
      'Pricing library',
      'Calendar view',
    ],
  },
  {
    name: 'Unlimited',
    monthly: 15,
    yearly: 150,
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
    iconBg: 'bg-tree-100 text-tree-700',
    popular: true,
    features: [
      'Unlimited quotes',
      'Everything in Basic',
      'Job photos',
      'PDF downloads',
      'Priority support',
      'Early access to new features',
    ],
  },
]

export default function Subscription() {
  const { business } = useBusiness()
  const [billing, setBilling] = useState('monthly')

  const trialDaysLeft = () => {
    if (!business?.trial_ends_at) return 14
    const diff = new Date(business.trial_ends_at) - new Date()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const yearlySavings = (plan) => {
    return (plan.monthly * 12) - plan.yearly
  }

  return (
    <PageWrapper>
      <Header title="Choose your plan" back="/settings" />

      <div className="px-4 py-4 space-y-5">
        {/* Trial Banner */}
        {(business?.plan === 'trial' || !business?.plan) && (
          <Card className="p-4 border-l-4 border-l-tree-500">
            <p className="font-bold text-gray-900 text-sm">Free trial — {trialDaysLeft()} days left</p>
            <p className="text-xs text-gray-500 mt-0.5">You have full access during your trial. Pick a plan to keep going after it ends.</p>
          </Card>
        )}

        {/* Billing Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${billing === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${billing === 'yearly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Yearly
              <span className="text-[10px] font-bold text-tree-600 uppercase">Save</span>
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        {PLANS.map(plan => (
          <div key={plan.name} className="relative">
            {plan.popular && (
              <div className="absolute -top-3 left-4 z-10">
                <span className="bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-md">
                  Most Popular
                </span>
              </div>
            )}
            <Card className={`p-5 ${plan.popular ? 'ring-2 ring-tree-500' : ''}`}>
              {/* Plan Header */}
              <div className="flex items-center gap-3 mb-1">
                <div className={`w-10 h-10 rounded-xl ${plan.iconBg} flex items-center justify-center`}>
                  {plan.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                </div>
              </div>

              {/* Price */}
              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    ${billing === 'monthly' ? plan.monthly : plan.yearly}
                  </span>
                  <span className="text-sm text-gray-400 font-medium">
                    /{billing === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>
                {billing === 'yearly' && (
                  <p className="text-xs text-tree-600 font-semibold mt-0.5">
                    Save ${yearlySavings(plan)}/yr vs monthly
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-tree-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                disabled
                className={`w-full py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                  plan.popular
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                }`}
              >
                Coming soon
              </button>
            </Card>
          </div>
        ))}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          All prices in AUD. GST included. Cancel anytime. Stripe payments will be connected soon.
        </p>
      </div>
    </PageWrapper>
  )
}
