import React, { Suspense } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { BusinessProvider, useBusiness } from './hooks/useBusiness'
import BottomNav from './components/layout/BottomNav'

// Lazy load all pages
const Login = React.lazy(() => import('./pages/Login'))
const Signup = React.lazy(() => import('./pages/Signup'))
const Onboarding = React.lazy(() => import('./pages/Onboarding'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const RoutePage = React.lazy(() => import('./pages/Route'))
const Clients = React.lazy(() => import('./pages/Clients'))
const ClientDetail = React.lazy(() => import('./pages/ClientDetail'))
const JobSiteDetail = React.lazy(() => import('./pages/JobSiteDetail'))
const NewJobReport = React.lazy(() => import('./pages/NewJobReport'))
const JobReportDetail = React.lazy(() => import('./pages/JobReportDetail'))
const Jobs = React.lazy(() => import('./pages/Jobs'))
const JobDetail = React.lazy(() => import('./pages/JobDetail'))
const RecurringJobs = React.lazy(() => import('./pages/RecurringJobs'))
const Quotes = React.lazy(() => import('./pages/Quotes'))
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

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function BusinessGuard() {
  const { business, loading } = useBusiness()
  const location = useLocation()

  if (loading) return <LoadingSpinner />
  if (!business && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />

  return (
    <>
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
                <Route path="/route" element={<RoutePage />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ClientDetail />} />
                <Route path="/sites/:id" element={<JobSiteDetail />} />
                <Route path="/sites/:id/report" element={<NewJobReport />} />
                <Route path="/reports/:id" element={<JobReportDetail />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/recurring-jobs" element={<RecurringJobs />} />
                <Route path="/quotes" element={<Quotes />} />
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
