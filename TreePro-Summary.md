# TreePro — Tree & Stump Removal Business Management App

## BUILD INSTRUCTIONS

Build a **mobile-first PWA** called **TreePro** for Australian tree and stump removal businesses. This is a direct adaptation of an existing pool maintenance app (PoolPro), re-themed and re-modelled for the arborist/tree services industry.

**Hosting**: Railway (static serve)
**Backend**: Supabase (Auth, PostgreSQL, Edge Functions, Realtime, Storage)
**Frontend**: React 18 + Vite + Tailwind CSS
**Domain**: TBD (will configure later)

---

## 1. BRANDING & THEME

Replace all pool-blue (#0CA5EB) with a **forest green** palette:

```js
// tailwind.config.js — replace "pool" with "tree"
tree: {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e',
  600: '#16a34a',
  700: '#15803d',
  800: '#166534',
  900: '#14532d',
  950: '#052e16',
},
```

- **App name**: TreePro
- **Tagline**: "Tree services made simple"
- **Gradients**: Green-based (`#22c55e → #15803d`)
- **Glow effects**: Green-tinted (`rgba(22, 163, 74, 0.15)`)
- **PWA theme_color**: `#22c55e`
- All references to "pool" in UI text, variable names, CSS classes → "tree"

---

## 2. TECH STACK & CONFIG

### package.json
```json
{
  "name": "treepro",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start": "serve dist -s -l ${PORT:-3000}"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.47.0",
    "date-fns": "^4.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "recharts": "^2.13.0",
    "serve": "^14.2.6"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "vite": "^6.0.0",
    "vite-plugin-pwa": "^0.21.0"
  }
}
```

### vite.config.js
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'TreePro',
        short_name: 'TreePro',
        description: 'Tree service management for professionals',
        theme_color: '#22c55e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,ico,png,svg}'],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages', expiration: { maxEntries: 10, maxAgeSeconds: 300 } }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-cache', expiration: { maxEntries: 100, maxAgeSeconds: 86400 } }
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'recharts': ['recharts'],
          'supabase': ['@supabase/supabase-js'],
        }
      }
    }
  },
  server: { host: true, port: 5173 }
})
```

### tailwind.config.js
```js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        tree: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
          400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
          800: '#166534', 900: '#14532d', 950: '#052e16',
        },
      },
      minHeight: { 'tap': '44px' },
      minWidth: { 'tap': '44px' },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.03)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)',
        'elevated': '0 8px 24px -4px rgba(0,0,0,0.08), 0 4px 8px -4px rgba(0,0,0,0.04)',
        'glow': '0 0 20px rgba(22, 163, 74, 0.15)',
        'glow-lg': '0 0 40px rgba(22, 163, 74, 0.2)',
        'nav': '0 -1px 12px 0 rgba(0,0,0,0.06)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0,0,0,0.04)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
        'gradient-brand-light': 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)',
        'gradient-success': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-danger': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        'gradient-warm': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
        'gradient-page': 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.25rem' },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        slideInRight: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
```

### .env structure
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-key
```

---

## 3. DOMAIN MODEL MAPPING (Pool → Tree)

This is how PoolPro concepts map to TreePro:

| PoolPro Concept | TreePro Concept |
|---|---|
| Pool | Job Site / Property |
| Pool address | Site address |
| Pool type (chlorine/salt/mineral) | Job type (tree removal, stump grinding, pruning, hedge trimming, land clearing, emergency storm damage) |
| Pool volume (litres) | Site area / Number of trees |
| Pool shape | Site access (easy, moderate, difficult, crane required) |
| Pool equipment (pump, filter, etc.) | Site hazards / obstacles (power lines, structures, slopes, confined space) |
| Chemical readings (pH, chlorine, etc.) | Job assessment (tree species, diameter DBH, height, canopy spread, health condition, lean direction) |
| Chemical products library | Equipment library (chainsaw, stump grinder, chipper, crane, EWP, bobcat, etc.) |
| Service record | Job completion report |
| Chemical log | Work log (trees removed, stumps ground, debris volume) |
| Chemicals added | Equipment used & hours |
| Service tasks | Job tasks (fell tree, remove stump, chip branches, haul debris, apply herbicide, level ground) |
| Service photos | Before/after photos (critical for tree work!) |
| Schedule frequency (weekly/fortnightly) | N/A for tree work (one-off jobs, not recurring maintenance) |
| Regular servicing toggle | Ongoing maintenance contract toggle (for hedge trimming, regular pruning clients) |
| Next due date | Next scheduled visit (only for maintenance contracts) |
| Chemical targets | N/A — remove this concept |
| Pool portal (customer views service history) | Client portal (customer views job progress, photos, reports) |
| Route planning | Route planning (same concept — daily job routes) |

---

## 4. DATABASE SCHEMA

### Core Tables (adapted from PoolPro)

**businesses** — SAME as PoolPro
```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  brand_colour TEXT DEFAULT '#22c55e',
  abn TEXT,
  phone TEXT,
  email TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial','starter','pro')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  next_invoice_number INTEGER DEFAULT 1,
  invoice_prefix TEXT DEFAULT 'INV',
  default_payment_terms_days INTEGER DEFAULT 14,
  bank_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**clients** — SAME as PoolPro
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  service_rate NUMERIC,
  billing_frequency TEXT,
  assigned_staff_id UUID,
  pipeline_stage TEXT DEFAULT 'lead' CHECK (pipeline_stage IN ('lead','quoted','active','on_hold','lost')),
  auth_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**job_sites** — replaces "pools"
```sql
CREATE TABLE job_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  address TEXT NOT NULL,
  site_type TEXT DEFAULT 'residential' CHECK (site_type IN ('residential','commercial','rural','council','strata','roadside')),
  site_access TEXT DEFAULT 'easy' CHECK (site_access IN ('easy','moderate','difficult','crane_required')),
  site_area TEXT,
  hazards JSONB DEFAULT '[]',
  -- hazards examples: ["power_lines","structures_nearby","steep_slope","confined_space","heritage_tree","protected_species"]
  notes TEXT,
  -- For ongoing maintenance contracts (hedge trimming, regular pruning)
  regular_maintenance BOOLEAN DEFAULT false,
  maintenance_frequency TEXT CHECK (maintenance_frequency IN ('weekly','fortnightly','monthly','quarterly','biannual','annual')),
  next_due_at TIMESTAMPTZ,
  access_notes TEXT,
  assigned_staff_id UUID,
  route_order INTEGER,
  portal_token UUID DEFAULT gen_random_uuid(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geocoded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**tree_assessments** — replaces "chemical_logs" (assessment data per job/site)
```sql
CREATE TABLE tree_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_report_id UUID REFERENCES job_reports NOT NULL,
  tree_number INTEGER DEFAULT 1,
  species TEXT,
  diameter_dbh_cm NUMERIC,
  height_m NUMERIC,
  canopy_spread_m NUMERIC,
  health_condition TEXT CHECK (health_condition IN ('healthy','declining','dead','hazardous','storm_damaged')),
  lean_direction TEXT,
  root_system TEXT,
  action_taken TEXT CHECK (action_taken IN ('removed','pruned','lopped','stump_ground','treated','assessed_only')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**job_reports** — replaces "service_records"
```sql
CREATE TABLE job_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  job_site_id UUID REFERENCES job_sites,
  job_id UUID REFERENCES jobs,
  staff_id UUID REFERENCES staff_members,
  technician_name TEXT,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  notes TEXT,
  debris_volume_m3 NUMERIC,
  stump_count INTEGER,
  trees_removed INTEGER,
  trees_pruned INTEGER,
  herbicide_applied BOOLEAN DEFAULT false,
  ground_levelled BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  report_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**equipment_used** — replaces "chemicals_added"
```sql
CREATE TABLE equipment_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_report_id UUID REFERENCES job_reports NOT NULL,
  equipment_name TEXT NOT NULL,
  hours_used NUMERIC,
  cost NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**job_tasks** — replaces "service_tasks"
```sql
CREATE TABLE job_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_report_id UUID REFERENCES job_reports NOT NULL,
  task_name TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**job_photos** — replaces "service_photos" (CRITICAL for tree work)
```sql
CREATE TABLE job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_report_id UUID REFERENCES job_reports NOT NULL,
  storage_path TEXT NOT NULL,
  signed_url TEXT,
  tag TEXT DEFAULT 'before' CHECK (tag IN ('before','during','after','hazard','stump','equipment')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**equipment_library** — replaces "chemical_products"
```sql
CREATE TABLE equipment_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses NOT NULL,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('cutting','grinding','chipping','lifting','transport','safety','other')),
  hourly_rate NUMERIC,
  notes TEXT,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, name)
);
```

**All other tables remain the same structure:**
- **staff_members** — same (change role options: arborist, groundsman, climber, operator, manager, owner)
- **quotes** — same (line_items, scope, terms, GST, pipeline)
- **jobs** — same (rename pool_id → job_site_id; statuses: scheduled, in_progress, on_hold, completed)
- **recurring_job_profiles** — same (for maintenance contracts)
- **invoices** — same
- **surveys** — same
- **communication_templates** — same (update trigger types for tree context)
- **automation_rules** & **automation_logs** — same
- **documents** — same
- **job_type_templates** — same (different suggested types — see below)
- **activity_feed** — same (with realtime enabled)
- **pricing_items** — same

---

## 5. SUGGESTED DATA (show by default, always visible)

### Suggested Job Types (replaces pool maintenance types)
```js
const SUGGESTED_JOB_TYPES = [
  {
    name: 'Tree Removal',
    description: 'Complete removal of tree including trunk sections',
    default_tasks: ['Set up exclusion zone', 'Check for hazards & services', 'Plan fall direction', 'Remove branches in sections', 'Fell trunk', 'Cut into manageable sections', 'Chip branches', 'Stack/remove timber', 'Clean up site'],
    estimated_duration_minutes: 240,
    color: '#22C55E',
  },
  {
    name: 'Stump Grinding',
    description: 'Grind stump below ground level',
    default_tasks: ['Locate underground services', 'Clear area around stump', 'Grind stump to depth', 'Collect grindings', 'Backfill hole', 'Level ground', 'Clean up debris'],
    estimated_duration_minutes: 90,
    color: '#92400E',
  },
  {
    name: 'Tree Pruning',
    description: 'Selective pruning for health, clearance, or aesthetics',
    default_tasks: ['Assess tree structure', 'Identify branches to remove', 'Set up work zone', 'Prune to Australian Standard AS4373', 'Shape canopy', 'Chip branches', 'Clean up'],
    estimated_duration_minutes: 120,
    color: '#16A34A',
  },
  {
    name: 'Hedge Trimming',
    description: 'Trim and shape hedges to desired height and form',
    default_tasks: ['Assess hedge condition', 'Set up drop sheets', 'Trim to height', 'Shape sides', 'Collect clippings', 'Clean up', 'Dispose of green waste'],
    estimated_duration_minutes: 60,
    color: '#65A30D',
  },
  {
    name: 'Emergency Storm Damage',
    description: 'Urgent response for storm-damaged trees',
    default_tasks: ['Assess hazards', 'Secure area', 'Remove fallen limbs', 'Make safe hanging branches', 'Clear access ways', 'Remove debris', 'Document damage', 'Tarp/secure if needed'],
    estimated_duration_minutes: 180,
    color: '#DC2626',
  },
  {
    name: 'Site Assessment / Quote',
    description: 'Initial visit to assess trees and provide a quote',
    default_tasks: ['Inspect trees', 'Measure trunk diameters', 'Estimate heights', 'Check access', 'Identify hazards', 'Take photos', 'Discuss with client', 'Prepare quote'],
    estimated_duration_minutes: 45,
    color: '#0EA5E9',
  },
  {
    name: 'Land Clearing',
    description: 'Clear vegetation from a designated area',
    default_tasks: ['Survey site boundaries', 'Check for protected species', 'Mark exclusion zones', 'Remove undergrowth', 'Fell trees', 'Grind stumps', 'Chip all material', 'Grade and level'],
    estimated_duration_minutes: 480,
    color: '#D97706',
  },
  {
    name: 'Palm Cleaning',
    description: 'Remove dead fronds and seed pods from palms',
    default_tasks: ['Set up access equipment', 'Remove dead fronds', 'Remove seed pods', 'Trim skirt', 'Clean trunk', 'Collect debris', 'Dispose of waste'],
    estimated_duration_minutes: 60,
    color: '#059669',
  },
]
```

### Suggested Equipment (replaces chemicals)
```js
const SUGGESTED_EQUIPMENT = [
  { name: 'Chainsaw (Large)', category: 'cutting', hourly_rate: 25, notes: 'Stihl MS661 or equivalent. For trunk work 40cm+.' },
  { name: 'Chainsaw (Medium)', category: 'cutting', hourly_rate: 20, notes: 'Stihl MS261 or equivalent. General pruning and limb removal.' },
  { name: 'Pole Saw', category: 'cutting', hourly_rate: 15, notes: 'Extended reach for canopy work from ground level.' },
  { name: 'Stump Grinder (Small)', category: 'grinding', hourly_rate: 75, notes: 'For stumps up to 40cm. Walk-behind unit.' },
  { name: 'Stump Grinder (Large)', category: 'grinding', hourly_rate: 150, notes: 'For stumps 40cm+. Track-mounted unit.' },
  { name: 'Wood Chipper', category: 'chipping', hourly_rate: 60, notes: '6-inch or 12-inch capacity. Branch disposal.' },
  { name: 'EWP / Cherry Picker', category: 'lifting', hourly_rate: 120, notes: 'Elevated Work Platform. For canopy access without climbing.' },
  { name: 'Crane', category: 'lifting', hourly_rate: 250, notes: 'For large removals near structures. Include operator.' },
  { name: 'Bobcat / Skid Steer', category: 'transport', hourly_rate: 90, notes: 'For debris removal, stump grindings, site levelling.' },
  { name: 'Tipper Truck', category: 'transport', hourly_rate: 80, notes: 'Green waste and timber transport to disposal.' },
  { name: 'Hedge Trimmer', category: 'cutting', hourly_rate: 10, notes: 'Powered hedge trimmer for shaping and maintenance.' },
  { name: 'Climbing Gear', category: 'safety', hourly_rate: 0, notes: 'Harness, ropes, carabiners, spikes. Per-job allocation.' },
]
```

### Equipment Categories & Colors (replaces chemical categories)
```js
const CATEGORIES = [
  { value: '', label: 'No category' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'grinding', label: 'Grinding' },
  { value: 'chipping', label: 'Chipping' },
  { value: 'lifting', label: 'Lifting / Access' },
  { value: 'transport', label: 'Transport' },
  { value: 'safety', label: 'Safety' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_COLORS = {
  cutting: 'primary',
  grinding: 'warning',
  chipping: 'success',
  lifting: 'mineral',
  transport: 'freshwater',
  safety: 'chlorine',
  other: 'default',
}
```

---

## 6. APP ARCHITECTURE

### Directory Structure
```
/src
  /components
    /layout
      BottomNav.jsx      — 5 tabs: Home, Route, Clients, Jobs, Settings
      Header.jsx         — Back button + title + optional right action
      PageWrapper.jsx    — Safe-area padded container
    /ui
      ActivityPanel.jsx  — Real-time notification feed
      Badge.jsx          — Status pills (primary/success/danger/warning)
      Button.jsx         — Primary/secondary/danger variants, loading state
      Card.jsx           — Rounded card with shadow
      DocumentUploader.jsx — File upload with drag-drop
      EmptyState.jsx     — Icon + text + CTA for empty lists
      Input.jsx          — Input, TextArea, Select with labels
      Modal.jsx          — Overlay dialog
      StaffCard.jsx      — Staff photo/name/role card
  /hooks
    useAuth.jsx          — Supabase auth with email confirm + PKCE
    useBusiness.jsx      — Business CRUD + context
    useClients.jsx       — Client list/create/update/delete
    useJobSites.jsx      — Job site management (was usePools)
    useJobReport.jsx     — Job completion reports (was useService)
    useStaff.jsx         — Staff management with photo uploads
    useActivity.jsx      — Real-time activity feed
  /lib
    supabase.js          — Supabase client init
    utils.js             — Formatters, helpers, constants
    templateEngine.js    — Variable replacement for templates
  /pages
    Login.jsx
    Signup.jsx
    Onboarding.jsx       — 2-step business setup (name/ABN/phone/email → logo/color)
    Dashboard.jsx        — KPIs: jobs this week, pending quotes, active jobs, overdue sites
    Route.jsx            — Daily route/map view
    Clients.jsx          — "Active Clients" list + "View All" CRM toggle
    ClientDetail.jsx     — Client profile, job sites, job history
    JobSiteDetail.jsx    — Site info, hazards, tree assessments, photos (was PoolDetail)
    NewJobReport.jsx     — Complete a job report with tasks/equipment/photos (was NewService)
    JobReportDetail.jsx  — View completed report (was ServiceDetail)
    Jobs.jsx             — Job list with status filters
    JobDetail.jsx        — Job details, status actions, related data
    RecurringJobs.jsx    — Recurring maintenance profiles
    Quotes.jsx           — Quote pipeline
    QuoteBuilder.jsx     — Line item quote creator
    Invoices.jsx         — Invoice list
    InvoiceBuilder.jsx   — Invoice creator
    Reports.jsx          — Analytics
    Subscription.jsx     — Plan management
    EquipmentLibrary.jsx — Equipment list with suggestions (was ChemicalLibrary)
    /settings
      Settings.jsx
      Staff.jsx
      CommunicationTemplates.jsx
      JobTypeTemplates.jsx
      Automations.jsx
      SurveyResults.jsx
      Integrations.jsx
      ImportData.jsx
    /portal
      PortalLogin.jsx
      PortalSetup.jsx
      PortalDashboard.jsx
      PortalTokenLanding.jsx
    PublicQuote.jsx
    PublicSurvey.jsx
/supabase
  /functions
    complete-job-report/index.ts   — Email report to client + owner (was complete-service)
    send-quote/index.ts
    respond-to-quote/index.ts
    trigger-automation/index.ts
    portal-auth/index.ts
    update-job-status/index.ts
  /migrations
    (all SQL files for schema)
```

### Route Structure (App.jsx)
```jsx
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
```

---

## 7. KEY FEATURES & BEHAVIOR

### Auth Flow
- Email/password signup with Supabase
- Email confirmation with PKCE code exchange support
- `emailRedirectTo` set to app origin on signup
- `onAuthStateChange` handles token processing
- URL hash cleanup only AFTER tokens are processed
- Auto-redirect: no business → `/onboarding`, customer role → `/portal`

### Business Onboarding
- Step 1: Business name, ABN, phone, email
- Step 2: Logo upload (to Supabase `logos` bucket), brand color picker
- Creates business record, then redirects to dashboard

### Clients Page
- Default view: "Active Clients" (only clients with job sites)
- "View All" button toggles to CRM view showing all clients
- Add Client: single-step form → "Next" button → navigates to ClientDetail with `?addSite=1`
- ClientDetail auto-opens "Add Job Site" modal via URL param

### Job Sites (replaces Pools)
- Add Job Site modal with: address, site type, site access, hazards (multi-select), notes
- **"Ongoing Maintenance" toggle** (like Regular Servicing in PoolPro)
  - When ON: shows maintenance frequency, next visit date, access notes
  - When OFF: hides those fields (one-off job sites)
- Prominent "Add Job Site" button on ClientDetail (green bg with + icon)
- Inline "+ Add new site" option in Create Job and QuoteBuilder modals

### Job Management
- Status workflow: scheduled → in_progress → on_hold → completed
- Quick status action buttons (context-sensitive)
- Job types from templates with default tasks
- Staff assignment
- Related: client, job site, quote reference
- Inline creation of job sites when creating jobs

### Job Reports (replaces Service Records)
- Task checklist (from job type template)
- Equipment used with hours and cost tracking
- Tree assessments: species, diameter, height, canopy, health, action taken
- Before/during/after/hazard photos
- Debris volume, stump count, trees removed/pruned
- Herbicide applied toggle, ground levelled toggle
- Completion triggers email to client + owner

### Quoting
- Line items with description, quantity, unit price
- Automatic 10% GST calculation (Australian)
- Scope and terms sections
- Pipeline: draft → sent → viewed → follow_up → accepted/declined
- Public quote links via email
- Quote-to-job conversion
- Inline job site creation in QuoteBuilder

### Equipment Library (replaces Chemical Library)
- Categories: cutting, grinding, chipping, lifting, transport, safety, other
- Hourly rate, notes, usage tracking
- **Suggestions shown by default** (always visible, "Hide Suggestions" toggle)

### Job Type Templates
- **Suggestions shown by default** (always visible)
- Default tasks, duration estimate, price, color
- Used when creating jobs

### Communication & Automations
- Email/SMS templates with variable placeholders
- `{client_name}`, `{business_name}`, `{site_address}`, `{technician_name}`, `{next_visit_date}`, `{portal_link}`
- Automation triggers: job_scheduled, job_started, job_completed, report_completed, quote_sent, quote_accepted
- Resend API for emails, Twilio placeholder for SMS

### Customer Portal
- View job history per site
- See before/after photos
- View job reports with details
- Submit post-job surveys (1-5 stars + comment)

### Activity Feed
- Real-time via Supabase Realtime
- Channel names MUST be unique: `` `activity-feed-${business.id}-${Date.now()}` ``
- Types: quote_sent/accepted/declined/viewed, job_created/completed, report_completed, client_created, payment_received

### Dashboard KPIs
- Jobs completed this week
- Active jobs in progress
- Pending quotes
- Overdue maintenance sites (for ongoing contracts)

### Staff
- Roles: arborist, climber, groundsman, operator, manager, owner
- Photo uploads to `staff-photos` bucket
- Plan limits: trial=1, starter=2, pro=10

### Realtime
- All Supabase channel names must include business ID + timestamp to avoid collisions
- Pattern: `` `${table}-${business.id}-${Date.now()}` ``
- Collisions cause "cannot add postgres_changes callbacks after subscribe()" white screen crashes

---

## 8. UI PATTERNS & DESIGN

### Mobile-First
- All touch targets minimum 44px
- Bottom navigation (5 tabs)
- Safe area inset padding for notched phones
- Cards with rounded corners (2xl/3xl)
- Modals for create/edit forms

### Components
- **Button**: `min-h-[48px]`, variants: primary (tree-500 green), secondary, danger, with loading spinner
- **Card**: `rounded-2xl shadow-card border border-gray-100`, hover effect
- **Badge**: colored pills for status indicators
- **Modal**: overlay with slide-up animation
- **EmptyState**: icon + title + description + CTA button
- **Input/TextArea/Select**: label above, placeholder text, focused ring in tree-500

### Color Usage
- Primary actions: tree-500 to tree-600 (green)
- Success: emerald
- Danger: red
- Warning: amber
- Info: sky blue
- Neutral: gray-400 for secondary text, gray-100 for borders

### Loading States
- Full-page spinner: `border-tree-500` animated circle
- Button loading: spinner replaces text
- Skeleton: not used (spinner pattern throughout)

---

## 9. EDGE FUNCTIONS (Supabase/Deno)

### complete-job-report (replaces complete-service)
- Input: `job_report_id`
- Sends branded HTML email to client with:
  - Job details, tasks completed, equipment used
  - Tree assessments (species, size, action taken)
  - Before/after photos
  - Staff member info
  - Portal link
- Sends summary email to business owner
- Creates activity_feed entry
- Triggers automations for `report_completed`
- Uses Resend API

### send-quote
- Input: `quote_id`
- Sends branded quote email with line items table
- Updates quote.sent_at and status
- Creates activity_feed entry

### respond-to-quote
- Input: `quote_id`, `response` (accept/decline)
- Updates quote status
- Creates activity_feed entries
- If accepted, can auto-create job with `scheduled_date`

### trigger-automation
- Input: trigger_event, business_id, job context
- Matches automation_rules
- Renders template with variables
- Sends email via Resend
- Logs to automation_logs

### portal-auth
- validate-token: verify portal_token, return client info
- create-account: create/link auth user for customer

### update-job-status
- Updates job status + timestamps
- Triggers automations

---

## 10. UTILITY FUNCTIONS (lib/utils.js)

```js
// Date formatting (Australian format)
formatDate(date)        // DD/MM/YYYY
formatDateTime(date)    // DD/MM/YYYY HH:mm

// Status helpers
statusColor(status)     // Tailwind class by status
statusDot(status)       // Colored dot element

// Currency (Australian)
formatCurrency(amount)  // $X,XXX.XX AUD
calculateGST(subtotal)  // 10% Australian GST

// Class names
cn(...classes)          // Combine class names, filter falsy

// Constants
SITE_TYPES: ['residential', 'commercial', 'rural', 'council', 'strata', 'roadside']
SITE_ACCESS: ['easy', 'moderate', 'difficult', 'crane_required']
HAZARDS: ['power_lines', 'structures_nearby', 'steep_slope', 'confined_space', 'heritage_tree', 'protected_species', 'asbestos_fence']
MAINTENANCE_FREQUENCIES: ['weekly', 'fortnightly', 'monthly', 'quarterly', 'biannual', 'annual']
PHOTO_TAGS: ['before', 'during', 'after', 'hazard', 'stump', 'equipment']
HEALTH_CONDITIONS: ['healthy', 'declining', 'dead', 'hazardous', 'storm_damaged']
ACTIONS_TAKEN: ['removed', 'pruned', 'lopped', 'stump_ground', 'treated', 'assessed_only']
STAFF_ROLES: ['arborist', 'climber', 'groundsman', 'operator', 'manager', 'owner']

DEFAULT_TASKS: [
  'Set up exclusion zone',
  'Check for overhead services',
  'Remove branches in sections',
  'Fell trunk',
  'Cut and stack timber',
  'Chip branches',
  'Grind stump',
  'Clean up site',
  'Remove all debris',
]
```

---

## 11. IMPORTANT IMPLEMENTATION NOTES

1. **Supabase Realtime channels** must use unique names with business ID + timestamp to prevent white screen crashes from channel collisions on re-renders.

2. **PWA caching**: Use `registerType: 'autoUpdate'` with `skipWaiting` and `clientsClaim`. Do NOT precache HTML files. Use `navigateFallback: null` and NetworkFirst for navigation requests. This prevents stale deploy issues.

3. **Related data fetching**: When fetching jobs with related client/site/quote data, fetch the job first, THEN fetch related records in parallel with separate queries. Do NOT use Supabase joined selects like `.select('*, clients(*), job_sites(*)')` — they fail when foreign keys are null.

4. **Add Client flow**: Single-step modal → create client → navigate to `/clients/:id?addSite=1` → auto-open Add Job Site modal via `useSearchParams`. Do NOT attempt multi-step modals (they cause blank screens).

5. **Suggestions always visible**: In Equipment Library and Job Type Templates, `showSuggestions` defaults to `true`. Button says "Hide Suggestions" when visible, "Show Suggestions" when hidden.

6. **Email confirmation redirect**: Handle both hash-based tokens (`#access_token=...`) and PKCE code exchange (`?code=...`). Clean up URL only AFTER `onAuthStateChange` fires `SIGNED_IN`. Set `emailRedirectTo` on signup.

7. **All pages lazy-loaded** with `React.lazy()` and `<Suspense>` fallback spinner.

8. **Australian context**: GST is 10%, currency is AUD, date format DD/MM/YYYY, ABN for business registration.

9. **Storage buckets needed**: logos, staff-photos, job-photos (was service-photos), documents — all with public access policies.

10. **RLS policies**: Every table uses Row Level Security scoped to `business_id`. Portal tables allow public select via `portal_token`. Enable realtime on `activity_feed`, `jobs`, `quotes`.

---

## 12. BUILD ORDER

1. Create Supabase project, run all migrations
2. Create storage buckets (logos, staff-photos, job-photos, documents)
3. Set up environment variables
4. Scaffold React + Vite + Tailwind + PWA
5. Build UI components (Button, Card, Input, Modal, Badge, EmptyState, Header, BottomNav, PageWrapper)
6. Build hooks (useAuth → useBusiness → useClients → useJobSites → useJobReport → useStaff → useActivity)
7. Build auth pages (Login, Signup, Onboarding)
8. Build main pages (Dashboard, Clients, ClientDetail, JobSiteDetail)
9. Build job pages (Jobs, JobDetail, NewJobReport, JobReportDetail, RecurringJobs)
10. Build quote/invoice pages (Quotes, QuoteBuilder, Invoices, InvoiceBuilder)
11. Build settings pages (Settings, Staff, EquipmentLibrary, JobTypeTemplates, CommunicationTemplates, Automations, SurveyResults, Integrations, ImportData)
12. Build portal pages (PortalLogin, PortalSetup, PortalDashboard, PortalTokenLanding)
13. Build public pages (PublicQuote, PublicSurvey)
14. Deploy Edge Functions
15. Configure Resend email integration
16. Deploy to Railway
17. Configure custom domain
18. Set Supabase Auth SITE_URL to custom domain

Build the ENTIRE app — every page, every component, every hook, every edge function. Do not skip any feature. This should be a complete, production-ready app.
