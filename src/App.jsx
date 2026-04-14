import React, { Suspense, useEffect, useLayoutEffect } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { BusinessProvider, useBusiness } from './hooks/useBusiness'
import BottomNav from './components/layout/BottomNav'
import TopNav from './components/layout/TopNav'
import { isTrialExpired, trialDaysLeft } from './lib/plans'

// Lazy load all pages
const Login = React.lazy(() => import('./pages/Login'))
const Signup = React.lazy(() => import('./pages/Signup'))
const Onboarding = React.lazy(() => import('./pages/Onboarding'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Schedule = React.lazy(() => import('./pages/Schedule'))
const Clients = React.lazy(() => import('./pages/Clients'))
const ClientDetail = React.lazy(() => import('./pages/ClientDetail'))
const JobSiteDetail = React.lazy(() => import('./pages/JobSiteDetail'))
const NewJobReport = React.lazy(() => import('./pages/NewJobReport'))
const JobReportDetail = React.lazy(() => import('./pages/JobReportDetail'))
const Jobs = React.lazy(() => import('./pages/Jobs'))
const JobDetail = React.lazy(() => import('./pages/JobDetail'))
const RecurringJobs = React.lazy(() => import('./pages/RecurringJobs'))
const QuoteBuilder = React.lazy(() => import('./pages/QuoteBuilder'))
const Invoices = React.lazy(() => import('./pages/Invoices'))
const InvoiceBuilder = React.lazy(() => import('./pages/InvoiceBuilder'))
const Reports = React.lazy(() => import('./pages/Reports'))
const Subscription = React.lazy(() => import('./pages/Subscription'))

// Settings
const Settings = React.lazy(() => import('./pages/settings/Settings'))
const Staff = React.lazy(() => import('./pages/settings/Staff'))
const EquipmentLibrary = React.lazy(() => import('./pages/settings/EquipmentLibrary'))
const CommunicationTemplates = React.lazy(() => import('./pages/settings/CommunicationTemplates'))
const JobTypeTemplates = React.lazy(() => import('./pages/settings/JobTypeTemplates'))
const Automations = React.lazy(() => import('./pages/settings/Automations'))
const SurveyResults = React.lazy(() => import('./pages/settings/SurveyResults'))
const Integrations = React.lazy(() => import('./pages/settings/Integrations'))
const ImportData = React.lazy(() => import('./pages/settings/ImportData'))

// Portal
const PortalLogin = React.lazy(() => import('./pages/portal/PortalLogin'))
const PortalSetup = React.lazy(() => import('./pages/portal/PortalSetup'))
const PortalDashboard = React.lazy(() => import('./pages/portal/PortalDashboard'))
const PortalTokenLanding = React.lazy(() => import('./pages/portal/PortalTokenLanding'))

// Public
const PublicQuote = React.lazy(() => import('./pages/PublicQuote'))
const PublicSurvey = React.lazy(() => import('./pages/PublicSurvey'))

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])
  useLayoutEffect(() => {
    // Clear any modal body lock
    document.documentElement.style.overflow = ''
    document.documentElement.style.position = ''
    document.documentElement.style.width = ''
    document.documentElement.style.top = ''
    document.body.style.overflow = ''
    document.body.classList.remove('modal-open')
    // Scroll past the header so content (pills, search, etc.) is at the top
    requestAnimationFrame(() => {
      const header = document.querySelector('header')
      if (header) {
        window.scrollTo(0, header.offsetHeight)
      } else {
        window.scrollTo(0, 0)
      }
    })
  }, [pathname])
  return null
}

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function TrialExpiredBanner() {
  const navigate = useNavigate()
  return (
    <div className="max-w-lg md:max-w-5xl mx-auto px-4 md:px-8 pt-2">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-900">Trial expired</p>
          <p className="text-xs text-red-600">Choose a plan to keep using TreePro.</p>
        </div>
        <button onClick={() => navigate('/subscription')} className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition-colors flex-shrink-0">
          Upgrade
        </button>
      </div>
    </div>
  )
}

function TrialWarningBanner({ daysLeft }) {
  const navigate = useNavigate()
  if (daysLeft > 3) return null
  return (
    <div className="max-w-lg md:max-w-5xl mx-auto px-4 md:px-8 pt-2">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">
        <p className="text-xs text-amber-700 flex-1"><strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> left in your trial.</p>
        <button onClick={() => navigate('/subscription')} className="px-3 py-1 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors flex-shrink-0">
          Choose Plan
        </button>
      </div>
    </div>
  )
}

function BusinessGuard() {
  const { business, loading } = useBusiness()
  const location = useLocation()

  if (loading) return <LoadingSpinner />
  if (!business && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />

  const expired = isTrialExpired(business)
  const daysLeft = business?.plan === 'trial' ? trialDaysLeft(business) : null

  return (
    <>
      <TopNav />
      {expired && <TrialExpiredBanner />}
      {!expired && daysLeft !== null && <TrialWarningBanner daysLeft={daysLeft} />}
      <Outlet />
      <BottomNav />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BusinessProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <ScrollToTop />
          <Routes>
            {/* Public */}
            <Route path="/portal/login" element={<PortalLogin />} />
            <Route path="/portal/setup/:token" element={<PortalSetup />} />
            <Route path="/portal" element={<PortalDashboard />} />
            <Route path="/portal/:token" element={<PortalTokenLanding />} />
            <Route path="/quote/:token" element={<PublicQuote />} />
            <Route path="/survey/:token" element={<PublicSurvey />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route element={<BusinessGuard />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/route" element={<Schedule />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ClientDetail />} />
                <Route path="/sites/:id" element={<JobSiteDetail />} />
                <Route path="/sites/:id/report" element={<NewJobReport />} />
                <Route path="/reports/:id" element={<JobReportDetail />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/recurring-jobs" element={<RecurringJobs />} />
                <Route path="/quotes" element={<Navigate to="/jobs?status=quoted" replace />} />
                <Route path="/quotes/new" element={<QuoteBuilder />} />
                <Route path="/quotes/:id" element={<QuoteBuilder />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/staff" element={<Staff />} />
                <Route path="/settings/equipment" element={<EquipmentLibrary />} />
                <Route path="/settings/templates" element={<CommunicationTemplates />} />
                <Route path="/settings/job-types" element={<JobTypeTemplates />} />
                <Route path="/settings/automations" element={<Automations />} />
                <Route path="/settings/surveys" element={<SurveyResults />} />
                <Route path="/settings/integrations" element={<Integrations />} />
                <Route path="/settings/import" element={<ImportData />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/new" element={<InvoiceBuilder />} />
                <Route path="/invoices/:id" element={<InvoiceBuilder />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/subscription" element={<Subscription />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BusinessProvider>
    </AuthProvider>
  )
}
