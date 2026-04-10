// Plan feature matrix
// trial = full access for 14 days, then restricted
// basic = 10 quotes/month, no photos, no PDFs
// unlimited = everything

export const PLAN_LIMITS = {
  trial: { quotesPerMonth: Infinity, photos: true, pdf: true },
  basic: { quotesPerMonth: 10, photos: false, pdf: false },
  unlimited: { quotesPerMonth: Infinity, photos: true, pdf: true },
}

export function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.trial
}

export function isTrialExpired(business) {
  if (!business || business.plan !== 'trial') return false
  if (!business.trial_ends_at) return false
  return new Date(business.trial_ends_at) < new Date()
}

export function trialDaysLeft(business) {
  if (!business?.trial_ends_at) return 0
  const diff = new Date(business.trial_ends_at) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function canUseFeature(business, feature) {
  if (!business) return false

  // Expired trial blocks everything
  if (isTrialExpired(business)) return false

  // Active trial gets full access
  if (business.plan === 'trial' && !isTrialExpired(business)) return true

  const limits = getPlanLimits(business.plan)

  switch (feature) {
    case 'photos':
      return limits.photos
    case 'pdf':
      return limits.pdf
    case 'unlimited_quotes':
      return limits.quotesPerMonth === Infinity
    default:
      return true
  }
}

export function getUpgradeMessage(feature) {
  const messages = {
    photos: 'Job photos are available on the Unlimited plan.',
    pdf: 'PDF downloads are available on the Unlimited plan.',
    quotes: 'You\'ve reached your monthly quote limit. Upgrade to Unlimited for unlimited quotes.',
    trial_expired: 'Your free trial has ended. Choose a plan to continue.',
  }
  return messages[feature] || 'Upgrade your plan to access this feature.'
}
