import { useState } from 'react'
import { useBusiness } from '../hooks/useBusiness'
import { usePlans } from '../hooks/usePlans'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'

// Static UI dictionary for the features object on each plan. Keys here
// must match the JSONB keys in the plans.features column (see seed in
// supabase/migrations/005_plans.sql + 006_plans_yearly_cents.sql).
// Values can be:
//   - `true`  → render with a check
//   - `false` → skip (or could be rendered grayed — left as skip for now)
//   - string  → render as "Label: value" (e.g. "Jobs: 5 jobs")
const FEATURE_LABELS = {
  jobs:              'Jobs',
  staff:             'Staff',
  serviceHistory:    'Service history',
  quotesPdf:         'Quotes via PDF',
  clientPortal:      'Customer portal',
  recurringJobs:     'Recurring jobs',
  photoAttachments:  'Job photos',
  inventoryTracking: 'Inventory tracking',
  customBranding:    'Custom branding',
  prioritySupport:   'Priority support',
}

// The "Most Popular" badge — operator can toggle by editing the
// features JSON in the HQ admin Plans panel and adding `"popular": true`.
function isPopular(plan) {
  return plan?.features?.popular === true || plan?.slug === 'pro'
}

function PriceBadge({ amountCents, suffix }) {
  if (amountCents == null) return null
  const dollars = Math.floor(amountCents / 100)
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">${dollars}</span>
      <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">/{suffix}</span>
    </span>
  )
}

export default function Subscription() {
  const { business } = useBusiness()
  const { plans, loading } = usePlans()
  const [billing, setBilling] = useState('monthly')

  const trialDaysLeft = () => {
    if (!business?.trial_ends_at) return 14
    const diff = new Date(business.trial_ends_at) - new Date()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  // Only show active, paid plans on this page (trial doesn't render as
  // a card — its status is shown in the trial banner). Sort by sort_order.
  const visiblePlans = (plans || [])
    .filter(p => p.is_active && p.slug !== 'trial')
    .sort((a, b) => a.sort_order - b.sort_order)

  // Show the yearly toggle only if at least one plan has a yearly price.
  const anyYearly = visiblePlans.some(p => p.yearly_cents != null)

  return (
    <PageWrapper>
      <Header title="Choose your plan" back="/settings" />

      <div className="px-4 py-4 space-y-5">
        {/* Trial Banner */}
        {(business?.plan === 'trial' || !business?.plan) && (
          <Card className="p-4 border-l-4 border-l-brand-500">
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">Free trial — {trialDaysLeft()} days left</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">You have full access during your trial. Pick a plan to keep going after it ends.</p>
          </Card>
        )}

        {/* Billing Toggle — hidden if no plan offers yearly */}
        {anyYearly && (
          <div className="flex justify-center">
            <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => setBilling('monthly')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 ${billing === 'monthly' ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling('yearly')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 flex items-center gap-1.5 ${billing === 'yearly' ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}
              >
                Yearly
                <span className="text-[10px] font-bold text-brand-600 uppercase">Save</span>
              </button>
            </div>
          </div>
        )}

        {/* Plan Cards — skeleton while loading from DB so we don't flash
            an empty page (old code rendered instantly from a JS const) */}
        {loading ? (
          <div className="space-y-5">
            <Card className="p-5 h-56 animate-pulse" />
            <Card className="p-5 h-56 animate-pulse" />
          </div>
        ) : visiblePlans.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No plans available right now.</p>
          </Card>
        ) : visiblePlans.map(plan => {
          const popular = isPopular(plan)
          const monthlyCents = plan.price_cents
          const yearlyCents = plan.yearly_cents
          const showYearly = billing === 'yearly' && yearlyCents != null
          const yearlySavings = yearlyCents != null
            ? Math.max(0, Math.floor((monthlyCents * 12 - yearlyCents) / 100))
            : 0
          return (
            <div key={plan.slug} className="relative">
              {popular && (
                <div className="absolute -top-3 left-4 z-10">
                  <span className="bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-md">
                    Most Popular
                  </span>
                </div>
              )}
              <Card className={`p-5 ${popular ? 'ring-2 ring-brand-500' : ''}`}>
                {/* Plan Header */}
                <div className="mb-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                </div>

                {/* Price */}
                <div className="mb-4">
                  {showYearly ? (
                    <PriceBadge amountCents={yearlyCents} suffix="yr" />
                  ) : (
                    <PriceBadge amountCents={monthlyCents} suffix="mo" />
                  )}
                  {showYearly && yearlySavings > 0 && (
                    <p className="text-xs text-brand-600 font-semibold mt-0.5">
                      Save ${yearlySavings}/yr vs monthly
                    </p>
                  )}
                </div>

                {/* Features — render the JSONB map. Strings ("5 jobs")
                    show as "{Label}: {value}". Booleans show as just the
                    label with a check (true) or skip (false). */}
                <ul className="space-y-2.5 mb-5">
                  {Object.entries(plan.features || {}).map(([key, value]) => {
                    if (value === false) return null
                    if (key === 'popular') return null
                    const label = FEATURE_LABELS[key] || key
                    const display = typeof value === 'string' ? `${label}: ${value}` : label
                    return (
                      <li key={key} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                        <svg className="w-4 h-4 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {display}
                      </li>
                    )
                  })}
                </ul>

                {/* CTA — Stripe wiring lives in PoolPro for now; Tree Mate
                    Subscription page stays on "Coming soon" until billing
                    is connected here too. */}
                <button
                  disabled
                  className={`w-full py-3.5 rounded-2xl text-sm font-semibold transition-colors duration-150 ${
                    popular
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-800'
                  }`}
                >
                  Coming soon
                </button>
              </Card>
            </div>
          )
        })}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-4">
          All prices in AUD. GST included. Cancel anytime. Stripe payments will be connected soon.
        </p>
      </div>
    </PageWrapper>
  )
}
