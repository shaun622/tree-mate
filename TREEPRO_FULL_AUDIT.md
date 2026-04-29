# TreePro — Full Project Audit

**Generated:** 2026-04-13
**Stack:** React 18 + Vite 6 + Tailwind 3 + Supabase + Leaflet/Mapbox + PWA
**Domain:** Australian tree/stump removal business management

---

## 1. Tech Stack & Dependencies

```
React 18.3.1
├── react-dom 18.3.1
├── react-router-dom 6.28.0      (routing)
├── react-leaflet 4.2.1          (map components)
│   └── leaflet 1.9.4            (core mapping)
├── recharts 2.13.0              (charts/analytics)
├── @supabase/supabase-js 2.47.0 (backend/DB/auth/storage)
├── date-fns 4.1.0               (date formatting)
└── serve 14.2.6                 (static server for prod)

Build Tools:
├── vite 6.0.0                   (bundler + dev server)
├── @vitejs/plugin-react 4.3.4   (fast refresh)
├── vite-plugin-pwa 0.21.0       (service worker + manifest)
├── tailwindcss 3.4.16           (utility CSS)
├── postcss 8.4.49
└── autoprefixer 10.4.20
```

### Scripts
```json
"dev":     "vite"                    // dev server on :5173
"build":   "vite build"             // production build → dist/
"preview": "vite preview"           // serve built dist locally
"start":   "PORT=${PORT:-3000} serve dist -s"  // Railway production
```

### Environment Variables (.env)
```
VITE_SUPABASE_URL=https://kukmapyyrxinumkkdwlh.supabase.co
VITE_SUPABASE_ANON_KEY=<jwt>
VITE_GOOGLE_PLACES_KEY=<key>     (optional — address autocomplete)
VITE_MAPBOX_TOKEN=<token>        (optional — map tiles, falls back to OSM)
```

---

## 2. Architecture Overview

```
src/
├── main.jsx                    Global entry: React root, BrowserRouter, leaflet CSS
├── App.jsx                     Router config, ProtectedRoute, BusinessGuard, BottomNav
├── index.css                   Tailwind directives + custom styles
├── hooks/                      7 hooks (auth, business, clients, jobSites, staff, activity, jobReport)
├── lib/                        4 utility modules (supabase, utils, geocode, plans, templateEngine)
├── components/
│   ├── layout/                 Header, PageWrapper, BottomNav
│   ├── ui/                     Button, Card, Badge, Input/TextArea/Select, Modal, EmptyState,
│   │                           ActivityPanel, UpgradePrompt, StaffCard, DocumentUploader,
│   │                           AddressAutocomplete, MapPinPicker
│   ├── pickers/                ClientPicker, JobSitePicker, JobTypePicker
│   ├── schedule/               ScheduleMap
│   └── jobs/                   JobDetailView (+ useJobDetail hook)
└── pages/
    ├── Login, Signup, Onboarding
    ├── Dashboard, Schedule, Clients, ClientDetail
    ├── Jobs, JobDetail, RecurringJobs
    ├── JobSiteDetail, NewJobReport, JobReportDetail
    ├── Quotes, QuoteBuilder
    ├── Invoices, InvoiceBuilder
    ├── Reports, Subscription
    ├── settings/               Settings, Staff, EquipmentLibrary, CommunicationTemplates,
    │                           JobTypeTemplates, Automations, SurveyResults, Integrations, ImportData
    └── portal/                 PortalLogin, PortalSetup, PortalDashboard, PortalTokenLanding
```

### Auth Flow
1. `AuthProvider` wraps app — exposes `user`, `session`, `signIn`, `signUp`, `signOut`
2. `BusinessProvider` wraps protected routes — exposes `business`, `createBusiness`, `updateBusiness`
3. `ProtectedRoute` redirects to `/login` if no session
4. `BusinessGuard` redirects to `/onboarding` if no business record
5. Onboarding redirects to `/` if business already exists

### Key Patterns
- **Context providers** for auth + business (global state)
- **Custom hooks** per data domain with full CRUD + loading state
- **Lazy-loaded pages** via `React.lazy` + `Suspense`
- **Reusable pickers** with inline add/edit (ClientPicker, JobSitePicker, JobTypePicker)
- **Plan-based feature gating** via `plans.js`
- **Multi-provider geocoding** (Google Places primary, Nominatim fallback)
- **PWA** with Workbox caching strategies
- **Australian locale** throughout (AUD, DD/MM/YYYY, `countrycodes=au`)

---

## 3. Complete Route Map

### Public Routes (no auth)

| Path | Component | Purpose |
|------|-----------|---------|
| `/login` | Login | Email/password authentication |
| `/signup` | Signup | New user registration |
| `/quote/:token` | PublicQuote | Customer views/accepts/declines a quote |
| `/survey/:token` | PublicSurvey | Customer submits post-job survey (stars + comment) |
| `/portal/login` | PortalLogin | Customer portal authentication |
| `/portal/setup/:token` | PortalSetup | First-time portal account creation via token |
| `/portal` | PortalDashboard | Customer view of their sites, reports, photos |
| `/portal/:token` | PortalTokenLanding | Generic token landing/redirect |

### Protected Routes (auth + business required)

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | Dashboard | KPI cards, recent activity, quick actions |
| `/onboarding` | Onboarding | 2-step business setup wizard (auth only, no biz guard) |
| `/schedule` | Schedule | Daily job schedule with list/upcoming/map views |
| `/route` | Schedule | Alias for /schedule |
| `/clients` | Clients | Client list with search + create |
| `/clients/:id` | ClientDetail | Client info + job sites management |
| `/sites/:id` | JobSiteDetail | Site details, photos, report history |
| `/sites/:id/report` | NewJobReport | Create job report with tasks/equipment/assessments/photos |
| `/reports/:id` | JobReportDetail | View completed job report (read-only) |
| `/jobs` | Jobs | Job list with status filter tabs + create |
| `/jobs/:id` | JobDetail | Job details + edit modal + status actions |
| `/recurring-jobs` | RecurringJobs | Recurring job profiles (maintenance contracts) |
| `/quotes` | Quotes | Quotes list with status filtering |
| `/quotes/new` | QuoteBuilder | Create quote with line items |
| `/quotes/:id` | QuoteBuilder | Edit existing quote |
| `/invoices` | Invoices | Invoice list |
| `/invoices/new` | InvoiceBuilder | Create invoice with line items |
| `/invoices/:id` | InvoiceBuilder | Edit existing invoice |
| `/reports` | Reports | Analytics: bar charts, pie charts, KPIs |
| `/subscription` | Subscription | Plan selection (UI only, payments coming soon) |
| `/settings` | Settings | Settings hub with nav to subpages |
| `/settings/staff` | Staff | Team member management with photo upload |
| `/settings/equipment` | EquipmentLibrary | Equipment catalog + suggestions |
| `/settings/templates` | CommunicationTemplates | Email/SMS templates with variable insertion |
| `/settings/job-types` | JobTypeTemplates | Job types with default tasks, duration, price |
| `/settings/automations` | Automations | Trigger-based automation rules |
| `/settings/surveys` | SurveyResults | Customer feedback + average ratings |
| `/settings/integrations` | Integrations | Third-party integration status (mostly coming soon) |
| `/settings/import` | ImportData | CSV bulk import for clients/sites |

**Total: 33 routes** (5 public, 28 protected)

---

## 4. Database Schema (Supabase / Postgres)

### Core Tables

#### `businesses`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| owner_id | uuid FK → auth.users | RLS: `owner_id = auth.uid()` |
| name | text | |
| abn | text | Australian Business Number |
| phone | text | |
| email | text | |
| logo_url | text | Supabase storage URL |
| brand_colour | text | Hex color |
| plan | text | `trial`, `basic`, `unlimited` |
| trial_ends_at | timestamptz | 14-day trial |
| invoice_prefix | text | e.g. "INV-" |
| next_invoice_number | int | Auto-increment |
| next_quote_number | int | Auto-increment |
| default_payment_terms_days | int | Default 14 |
| created_at | timestamptz | |

#### `clients`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| name | text | |
| email | text | |
| phone | text | |
| address | text | |
| notes | text | |
| lat | float8 | Geocoded |
| lng | float8 | Geocoded |
| auth_user_id | uuid | Portal login link |
| portal_token | text | Portal setup token |
| created_at | timestamptz | |

#### `job_sites`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| client_id | uuid FK | |
| address | text | |
| notes | text | |
| lat | float8 | Auto-geocoded on first display |
| lng | float8 | Auto-geocoded on first display |
| site_type | text | residential, commercial, govt |
| site_access | text | easy, difficult, crane_required |
| hazards | text[] | Array of hazard types |
| regular_maintenance | boolean | |
| maintenance_frequency | text | monthly, quarterly, etc. |
| next_due_at | date | |
| portal_token | text | Customer survey access |
| created_at | timestamptz | |

#### `jobs`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| client_id | uuid FK | |
| job_site_id | uuid FK | |
| job_type | text | |
| status | text | `scheduled`, `in_progress`, `on_hold`, `completed` |
| scheduled_date | date | YYYY-MM-DD (for simple day queries) |
| scheduled_start | timestamptz | Precise time (for ordering + drag-reorder) |
| scheduled_end | timestamptz | |
| duration_minutes | int | Default 60 |
| staff_id | uuid FK | |
| notes | text | |
| started_at | timestamptz | Set on status → in_progress |
| completed_at | timestamptz | Set on status → completed |
| created_at | timestamptz | |

#### `staff_members`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| name | text | |
| email | text | |
| phone | text | |
| role | text | arborist, operator, manager, admin |
| photo_url | text | |
| created_at | timestamptz | |

### Job Reports & Related

#### `job_reports`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| job_site_id | uuid FK | |
| staff_id | uuid FK | |
| status | text | in_progress, completed |
| notes | text | |
| technician_name | text | |
| debris_volume_m3 | numeric | |
| stump_count | int | |
| trees_removed | int | |
| trees_pruned | int | |
| herbicide_applied | boolean | |
| ground_levelled | boolean | |
| completed_at | timestamptz | |
| created_at | timestamptz | |

#### `job_tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| report_id | uuid FK | |
| name | text | |
| completed | boolean | |
| created_at | timestamptz | |

#### `equipment_used`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| report_id | uuid FK | |
| equipment_name | text | |
| hours_used | numeric | |
| cost | numeric | |
| created_at | timestamptz | |

#### `tree_assessments`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| report_id | uuid FK | |
| tree_number | int | |
| species | text | |
| diameter_dbh_cm | numeric | Diameter at breast height |
| height_m | numeric | |
| canopy_spread_m | numeric | |
| health_condition | text | good, fair, poor, dead, hazardous |
| action_taken | text | removed, pruned, treated, cabled, none |
| lean_direction | text | |
| notes | text | |
| created_at | timestamptz | |

#### `job_photos`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| report_id | uuid FK | |
| storage_path | text | Path in job-photos bucket |
| url | text | Public URL |
| tag | text | before, after, detail, hazard, etc. |
| created_at | timestamptz | |

### Equipment & Templates

#### `equipment_library`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| name | text | |
| category | text | cutting, hauling, specialized, safety |
| hourly_rate | numeric | |
| notes | text | |
| created_at | timestamptz | |

#### `job_type_templates`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| name | text | |
| description | text | |
| color | text | Hex |
| default_tasks | text[] | Array of task names |
| estimated_duration_minutes | int | |
| price | numeric | |
| created_at | timestamptz | |

### Communication & Automation

#### `communication_templates`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| name | text | |
| type | text | email, sms |
| trigger_type | text | job_scheduled, job_completed, quote_sent, etc. |
| subject | text | Email only |
| body | text | Supports `{variable}` interpolation |
| created_at | timestamptz | |

#### `automation_rules`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| name | text | |
| trigger_event | text | Same triggers as templates |
| action | text | send_email, send_sms |
| template_id | uuid FK | |
| active | boolean | |
| created_at | timestamptz | |

### Quotes & Invoices

#### `quotes`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| client_id | uuid FK | |
| job_site_id | uuid FK | |
| quote_number | int | |
| scope | text | |
| terms | text | |
| line_items | jsonb | `[{description, quantity, unit_price}]` |
| subtotal | numeric | |
| gst | numeric | 10% GST |
| total | numeric | |
| status | text | draft, sent, viewed, follow_up, accepted, declined |
| token | text | Public access token |
| viewed_at | timestamptz | |
| created_at | timestamptz | |

#### `invoices`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| client_id | uuid FK | |
| invoice_number | text | Prefix + number |
| due_date | date | |
| notes | text | |
| line_items | jsonb | `[{description, quantity, unit_price}]` |
| subtotal | numeric | |
| gst | numeric | |
| total | numeric | |
| status | text | draft, sent, paid, overdue |
| created_at | timestamptz | |

### Other

#### `recurring_job_profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| client_id | uuid FK | |
| job_type | text | |
| frequency | text | weekly, bi-weekly, monthly |
| next_run_at | date | |
| active | boolean | |
| created_at | timestamptz | |

#### `surveys`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| job_site_id | uuid FK | |
| rating | int | 1-5 stars |
| comment | text | |
| created_at | timestamptz | |

#### `activity_feed`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| business_id | uuid FK | |
| type | text | quote_sent, job_created, etc. |
| message | text | |
| created_at | timestamptz | |

### Storage Buckets
- `logos` — business logos
- `staff-photos` — team member avatars
- `job-photos` — job report photos (gated by plan)

---

## 5. Hooks Reference

### `useAuth()` — `src/hooks/useAuth.jsx`
- **Provider:** `AuthProvider` wraps the whole app
- **State:** `user`, `session`, `loading`
- **Functions:** `signUp(email, password)`, `signIn(email, password)`, `signOut()`
- **Details:** Handles PKCE code exchange, URL cleanup, subscribes to `onAuthStateChange`

### `useBusiness()` — `src/hooks/useBusiness.jsx`
- **Provider:** `BusinessProvider` wraps protected routes
- **State:** `business`, `loading`
- **Functions:** `createBusiness(values)`, `updateBusiness(values)`, `refreshBusiness()`
- **Query:** `.from('businesses').select('*').eq('owner_id', user.id).limit(1)` (not `.single()` — avoids crash on 0 rows)
- **Tables:** `businesses`

### `useClients(businessId)` — `src/hooks/useClients.jsx`
- **State:** `clients`, `loading`
- **Functions:** `createClient(values)`, `updateClient(id, values)`, `deleteClient(id)`, `refreshClients()`
- **Tables:** `clients`

### `useJobSites(businessId)` — `src/hooks/useJobSites.jsx`
- **State:** `jobSites`, `loading`
- **Functions:** `createJobSite(values)`, `updateJobSite(id, values)`, `deleteJobSite(id)`, `getJobSitesByClient(clientId)`, `refreshJobSites()`
- **Tables:** `job_sites`

### `useStaff(businessId)` — `src/hooks/useStaff.jsx`
- **State:** `staff`, `loading`
- **Functions:** `createStaff(values)`, `updateStaff(id, values)`, `deleteStaff(id)`, `uploadPhoto(staffId, file)`, `refreshStaff()`
- **Tables:** `staff_members`
- **Storage:** `staff-photos` bucket

### `useActivity(businessId)` — `src/hooks/useActivity.jsx`
- **State:** `activities`, `loading`
- **Functions:** `fetchActivities()`
- **Real-time:** Subscribes to INSERT on `activity_feed`, prepends new items (max 50)
- **Tables:** `activity_feed`

### `useJobReport(businessId)` — `src/hooks/useJobReport.jsx`
- **State:** `reports`, `loading`
- **Functions:**
  - `createReport(values)`, `updateReport(id, values)`, `completeReport(id)`
  - `addPhoto(reportId, file, tag)`, `removePhoto(photoId, storagePath)`
  - `addTask(reportId, taskName)`, `toggleTask(taskId, completed)`
  - `addEquipment(reportId, values)`, `removeEquipment(id)`
  - `addAssessment(reportId, values)`, `refreshReports()`
- **Tables:** `job_reports`, `job_photos`, `job_tasks`, `equipment_used`, `tree_assessments`
- **Storage:** `job-photos` bucket

### `useJobDetail(jobId)` — `src/components/jobs/JobDetailView.jsx`
- **State:** `job`, `client`, `site`, `reports`, `loading`
- **Functions:** `setJob`, `setClient`, `setSite`, `refetch()`
- **Tables:** `jobs`, `clients`, `job_sites`, `job_reports`
- **Used by:** Schedule (modal) + JobDetail (page)

---

## 6. Library Modules

### `src/lib/supabase.js`
Initializes and exports the `supabase` client from env vars.

### `src/lib/utils.js`
| Export | Purpose |
|--------|---------|
| `cn(...classes)` | Conditional class name joiner |
| `formatDate(date)` | DD/MM/YYYY (Australian) |
| `formatDateTime(date)` | DD/MM/YYYY HH:mm |
| `formatCurrency(amount)` | AUD formatting |
| `calculateGST(subtotal)` | Returns `{subtotal, gst, total}` at 10% |
| `statusColor(status)` | Tailwind bg class for status |
| `statusDot(status)` | Tailwind dot class |
| `statusLabel(status)` | `under_score` → `Title Case` |
| `SITE_TYPES` | residential, commercial, govt |
| `SITE_ACCESS` | easy, difficult, crane_required |
| `HAZARDS` | power lines, steep slope, etc. |
| `MAINTENANCE_FREQUENCIES` | monthly, quarterly, etc. |
| `PHOTO_TAGS` | before, after, detail, hazard, etc. |
| `HEALTH_CONDITIONS` | good, fair, poor, dead, hazardous |
| `ACTIONS_TAKEN` | removed, pruned, treated, cabled, none |
| `STAFF_ROLES` | arborist, operator, manager, admin |
| `PIPELINE_STAGES` | Quote workflow stages |
| `DEFAULT_TASKS` | 9 common job checklist items |
| `SUGGESTED_JOB_TYPES` | 8 tree job types with defaults |
| `SUGGESTED_EQUIPMENT` | 12 equipment items with rates |
| `EQUIPMENT_CATEGORIES` | 7 categories |
| `CATEGORY_COLORS` | Color map for categories |

### `src/lib/plans.js`
| Export | Purpose |
|--------|---------|
| `PLAN_LIMITS` | Feature matrix: trial, basic, unlimited |
| `getPlanLimits(plan)` | Get limits for a plan |
| `isTrialExpired(business)` | Boolean check |
| `trialDaysLeft(business)` | Days remaining |
| `canUseFeature(business, feature)` | Feature gate (photos, pdf, unlimited_quotes) |
| `getUpgradeMessage(feature)` | User-facing upgrade text |

**Plan limits:**
- Trial: full access for 14 days
- Basic ($7/mo): 10 quotes/month, no photos, no PDF export
- Unlimited ($15/mo): everything

### `src/lib/templateEngine.js`
| Export | Purpose |
|--------|---------|
| `renderTemplate(template, variables)` | Replaces `{var}` patterns |
| `TEMPLATE_VARIABLES` | 9 available vars: client_name, business_name, site_address, technician_name, next_visit_date, portal_link, quote_link, job_type, scheduled_date |

### `src/lib/geocode.js`
| Export | Purpose |
|--------|---------|
| `geocodeAddress(address)` | Address → `{lat, lng}` via Nominatim (cached, 1req/sec throttled) |
| `searchAddresses(query, options)` | Autocomplete: Google Places primary, Nominatim fallback |
| `placeDetails(placeId)` | Resolve Google placeId → `{label, lat, lng}` |
| `reverseGeocode(lat, lng)` | Coords → address via Nominatim |
| `distanceKm(a, b)` | Haversine straight-line distance |
| `totalRouteKm(coords)` | Sum of distances along ordered points |
| `estimateTravelMinutes(coords)` | Estimate at 40km/h average |
| `getRoadRoute(points)` | OSRM road routing → `{geometry, distanceKm, durationMin}` |

---

## 7. Components Reference

### Layout (`src/components/layout/`)

| Component | Props | Purpose |
|-----------|-------|---------|
| `Header` | `title`, `back`, `rightAction` | Sticky top bar with optional back button + right slot |
| `PageWrapper` | `children`, `className` | Full-height container with gradient bg, max-width `480px` |
| `BottomNav` | none | Fixed 5-tab nav (Home, Schedule, Clients, Jobs, Settings) with active indicator |

### UI (`src/components/ui/`)

| Component | Props | Purpose |
|-----------|-------|---------|
| `Button` | `variant` (primary/secondary/danger), `loading`, `disabled` | Styled button with spinner |
| `Card` | `children`, `className`, `onClick`, `hover` | White rounded container with shadow |
| `Badge` | `variant` (primary/success/danger/warning/info/neutral) | Inline status badge |
| `Input` | `label`, `error`, HTML attrs | Labeled text input with error state |
| `TextArea` | `label`, `error`, `rows` | Multi-line input |
| `Select` | `label`, `options[]`, `error` | Dropdown with label |
| `Modal` | `open`, `onClose`, `title`, `size` (sm/md/lg/xl) | Overlay dialog, locks scroll, slide-up animation |
| `EmptyState` | `icon`, `title`, `description`, `actionLabel`, `onAction` | Empty list placeholder with CTA |
| `ActivityPanel` | `activities[]` | Activity feed with type-specific icons |
| `UpgradePrompt` | `message`, `onClose` | Plan upgrade banner → /subscription |
| `StaffCard` | `staff`, `onClick` | Staff member card with avatar/initials |
| `DocumentUploader` | `bucket`, `path`, `onUpload`, `accept`, `label` | File upload to Supabase storage |
| `AddressAutocomplete` | `value`, `onChange`, `label`, `placeholder` | Debounced address search (450ms) with dropdown + map fallback |
| `MapPinPicker` | `initialLabel`, `onClose`, `onConfirm` | Full-screen interactive map to pick location |

### Pickers (`src/components/pickers/`)

| Component | Props | Purpose |
|-----------|-------|---------|
| `ClientPicker` | `clients`, `value`, `onChange`, `onCreate`, `onUpdate` | Select/create/edit client inline. 3 modes: idle, new, edit |
| `JobSitePicker` | `sites`, `client`, `clientId`, `value`, `onChange`, `onCreate`, `onUpdate` | Select/create site with "Use customer's address" toggle, auto-create on pick |
| `JobTypePicker` | `templates`, `value`, `onChange`, `onCreateTemplate` | Select from templates + suggestions + custom entry |

### Schedule (`src/components/schedule/`)

| Component | Props | Purpose |
|-----------|-------|---------|
| `ScheduleMap` | `points[]`, `routeGeometry`, `onMarkerClick`, `height` | Leaflet map with numbered SVG pins, route polyline, fit-to-bounds, Mapbox/OSM tiles |

### Jobs (`src/components/jobs/`)

| Component | Props | Purpose |
|-----------|-------|---------|
| `JobDetailView` | `job`, `client`, `site`, `staff`, `reports`, `onEdit`, `onDelete`, `onStatusChange`, `onCreateReport`, `onOpenReport`, `updating`, `compact` | Shared job detail: hero map, header card, info rows, status buttons, reports list. Used in both JobDetail page + Schedule modal |

---

## 8. Page Details

### Dashboard (`/`)
- **KPI Cards:** jobs this week, active jobs, pending quotes, overdue maintenance sites
- **Activity Feed:** real-time via `useActivity` (Supabase subscription on `activity_feed`)
- **Quick Actions:** buttons to create job, create quote, view clients

### Schedule (`/schedule`)
- **3 Views:** List (draggable cards), Upcoming (grouped by date, next 50), Map (ScheduleMap)
- **Day Picker:** prev/next arrows + "Jump to today"
- **Travel Summary:** total km + estimated minutes (road route via OSRM when available, Haversine fallback)
- **Drag-Drop Reorder:** HTML5 native drag API. On drop, re-times entire day starting 8am, 1hr slots, persists to DB
- **Lazy Geocoding:** background loop geocodes sites missing lat/lng via Nominatim after initial render
- **Job Modal:** clicking any job opens `<Modal>` with `<JobDetailView>` inside — does NOT navigate away. Status changes sync back to list. Three trigger points: list card, upcoming card, map marker "View job" button
- **Road Routing:** `getRoadRoute()` via OSRM public demo server. Keyed on serialized coordinate string to prevent infinite refetches. Returns polyline geometry drawn as solid green line on map

### Jobs (`/jobs`)
- **Status Tabs:** All, Scheduled, In Progress, On Hold, Completed
- **Card Design:** Directory-style with gradient green thumbnail strip (map pin icon + date), body shows title, status badge, client, address, time+duration
- **Create Modal:** ClientPicker, JobSitePicker, JobTypePicker, date/time/duration, staff assignment

### Quotes (`/quotes`, `/quotes/new`, `/quotes/:id`)
- **QuoteBuilder:** Line items with qty/unit price, auto-calc subtotal + 10% GST + total
- **Plan Gating:** Monthly quote limit (basic = 10/month)
- **Workflow:** draft → sent (email via edge function) → viewed → follow_up → accepted/declined
- **Public Link:** `/quote/:token` for customer response

### Invoices (`/invoices`, `/invoices/new`, `/invoices/:id`)
- **InvoiceBuilder:** Similar to quotes — line items, GST calc
- **Auto-Numbering:** business.invoice_prefix + next_invoice_number, auto-increments

### Reports (`/reports`)
- **Recharts:** BarChart (jobs by week, last 8 weeks), PieChart (jobs by type)
- **KPIs:** total jobs, total revenue, avg job value, completion rate

### Job Reports (`/sites/:id/report`, `/reports/:id`)
- **NewJobReport:** Auto-creates report on mount. Sections: tasks (checkable), equipment (from library), tree assessments (species, DBH, health, action), photos (tagged, plan-gated), summary fields
- **JobReportDetail:** Read-only view of completed report with all sections

### Customer Portal (`/portal/*`)
- **PortalSetup:** Token-based first-time account creation
- **PortalDashboard:** Customer sees their sites, reports, photo gallery, can submit survey
- **PublicSurvey:** 5-star rating + comment, submitted to `surveys` table

### Settings (`/settings/*`)
| Page | Purpose |
|------|---------|
| Staff | Team CRUD + photo upload, plan-limited (trial/basic: 5 max) |
| Equipment Library | Equipment catalog with suggested items, category filters |
| Communication Templates | Email/SMS templates with `{variable}` insertion |
| Job Type Templates | Job types with default tasks, duration, price, color |
| Automations | Trigger event → action (send email/SMS via template) |
| Survey Results | Average rating + individual survey cards |
| Integrations | Status page: Resend (configured), Twilio/Stripe/Xero/Google Maps (coming soon) |
| Import Data | CSV import for clients and job sites |

---

## 9. Tailwind Custom Theme

### Colors
- `tree` palette (50-950): primary brand green, used everywhere

### Shadows
- `card`, `card-hover`, `elevated`, `glow`, `glow-lg`, `nav`, `inner-soft`, `button`, `button-hover`

### Gradients
- `gradient-brand` (primary green), `gradient-brand-light`, `gradient-success`, `gradient-danger`, `gradient-warm`, `gradient-glass` (frosted), `gradient-page` (background), `gradient-dark`, `gradient-hero`

### Custom Values
- `maxWidth.app`: 480px (mobile-first constraint)
- `minHeight.tap` / `minWidth.tap`: 44px (touch target)
- Border radius: `2xl` (1rem), `3xl` (1.25rem), `4xl` (1.5rem)

### Animations
- `fade-in`, `slide-up`, `scale-in`, `slide-in-right`, `bounce-in`, `shimmer`

---

## 10. PWA Configuration (vite-plugin-pwa)

```js
{
  registerType: 'autoUpdate',
  manifest: {
    name: 'TreePro',
    short_name: 'TreePro',
    theme_color: '#22c55e',
    display: 'standalone',
    orientation: 'portrait',
    icons: [192x192, 512x512]
  },
  workbox: {
    runtimeCaching: [
      { urlPattern: /\/$/,  handler: 'NetworkFirst', maxEntries: 10, maxAge: 5min },
      { urlPattern: /supabase/, handler: 'NetworkFirst', maxEntries: 100, maxAge: 24hr }
    ]
  }
}
```

---

## 11. External Services

| Service | Purpose | Key Required | Fallback |
|---------|---------|-------------|----------|
| Supabase | DB, Auth, Storage, Edge Functions | Yes (anon key) | None |
| Google Places (New) | Address autocomplete | Optional | Nominatim |
| Mapbox | Map tiles (streets-v12 retina) | Optional | OpenStreetMap tiles |
| Nominatim (OSM) | Geocoding (address → coords) | No | None (free, 1req/sec) |
| OSRM | Road routing + polyline geometry | No | Haversine straight-line |
| Resend | Transactional email | Via edge function | None |

---

## 12. Deployment

- **Hosting:** Railway (auto-deploys from `main` branch)
- **Build:** `npm run build` → `dist/`
- **Serve:** `serve dist -s` on Railway's `PORT`
- **Edge Functions:** Deployed via Supabase Management API (never CLI)
- **Domain:** matehq.online
