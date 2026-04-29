# TreePro — Full Restructure Spec (v2)

> Hand this to Claude Code. Read TREEPRO_FULL_AUDIT.md first — it maps every file, route, table, and hook. This spec describes what to KEEP, what to MODIFY, and what to ADD. Do NOT rebuild things that already work.

---

## Context

TreePro is for Australian tree/stump removal businesses. The workflow is project-based (not recurring like PoolPro):

```
Enquiry → Site Visit → Quote → Approved → Scheduled → In Progress → Completed → Invoiced → Paid
```

The current app has good bones — job reports with tree assessments, equipment library, job sites, photo tagging, plan gating — but the structure treats Jobs and Quotes as separate things when they should be stages of one pipeline. This spec fixes that.

---

## Nav Structure (unchanged — 5 items)

**Home** | **Schedule** | **Clients** | **Jobs** | **Settings**

The nav items stay the same but what's INSIDE them changes significantly.

---

## SECTION A — What to KEEP as-is (do not modify)

These work well already. Don't touch them unless a change below explicitly references them.

1. **Auth flow** — AuthProvider, BusinessProvider, ProtectedRoute, BusinessGuard, Onboarding
2. **Customer portal** — PortalLogin, PortalSetup, PortalDashboard, PortalTokenLanding, PublicSurvey
3. **PublicQuote** page — accept/decline flow with token
4. **Equipment Library** (Settings) — categories, hourly rates, suggested items
5. **Communication Templates** (Settings) — email/SMS templates with variable interpolation
6. **Automation Rules** (Settings) — trigger events, template linking
7. **Job Type Templates** (Settings) — default tasks, duration, price, colour
8. **Survey system** — surveys table, SurveyResults page, PublicSurvey
9. **Import Data** (Settings) — CSV import
10. **Subscription / Plan gating** — plans.js, PLAN_LIMITS, feature gates
11. **Utility modules** — supabase.js, utils.js (constants, formatters), geocode.js, templateEngine.js, plans.js
12. **UI components** — Button, Card, Badge, Input, TextArea, Select, Modal, EmptyState, DocumentUploader, AddressAutocomplete, MapPinPicker, StaffCard, UpgradePrompt
13. **Pickers** — ClientPicker, JobSitePicker, JobTypePicker (these are excellent and TreePro-specific, keep them)
14. **PWA config** — manifest, workbox caching
15. **Tailwind theme** — tree colour scale, shadows, gradients, animations
16. **ScheduleMap component** — Leaflet map with numbered pins, route polyline

---

## SECTION B — What to MODIFY

### B1. Jobs page — Convert to Pipeline Hub

**Current state:** `/jobs` shows a flat list with status tabs (All, Scheduled, In Progress, On Hold, Completed). Quotes live on a completely separate `/quotes` page.

**Target state:** Jobs becomes the pipeline hub. Quotes are a STAGE of a job, not separate.

#### B1a. Extend job statuses

Modify the `jobs` table to support the full pipeline:

```sql
ALTER TABLE jobs 
  ALTER COLUMN status SET DEFAULT 'enquiry';
-- New CHECK: enquiry, site_visit, quoted, approved, scheduled, in_progress, completed, invoiced, paid
```

Add columns to `jobs`:
- `priority` text DEFAULT 'normal' — CHECK: normal, urgent, emergency
- `quote_id` uuid FK → quotes (nullable — linked when a quote is created for this job)
- `invoice_id` uuid FK → invoices (nullable — linked when an invoice is created)
- `site_visit_date` date (nullable)
- `site_visit_time` time (nullable)
- `estimated_duration` text DEFAULT 'half_day' — CHECK: half_day, full_day, two_days, three_plus
- `equipment_needed` text[] DEFAULT '{}' — array of equipment names
- `completion_notes` text
- `time_spent_hours` numeric

Also add to `quotes`:
- `job_id` uuid FK → jobs (nullable — links quote back to the originating job)

This creates a bidirectional link: job.quote_id ↔ quote.job_id.

#### B1b. Pipeline view on Jobs page

Replace the current flat list with two view modes (toggle button):

**Pipeline / Kanban view (desktop default):**
- Horizontal columns: Enquiry | Site Visit | Quoted | Approved | Scheduled | In Progress | Completed
- Job cards inside each column, draggable between columns (reuse existing HTML5 drag from Schedule)
- On mobile: horizontal scrollable columns (this is an exception to the "no horizontal scroll" rule — kanban requires it)

**List view (mobile default):**
- Flat list with status filter pills (same pattern as current, but with the expanded statuses)
- Pills: All | Enquiry | Site Visit | Quoted | Approved | Scheduled | In Progress | Completed
- Add a secondary row of filter pills: Priority (All | Urgent | Emergency) 

**Each job card shows:**
- Job title (or job type if no custom title)
- Client name
- Site address (suburb only to keep compact)
- Status badge
- Priority badge (only if urgent/emergency — hide for normal)
- Dollar value (from linked quote, if exists)
- Scheduled date (if set)
- Assigned crew member name (if set)

#### B1c. Create Job modal — enhance existing

The current Create Job modal uses ClientPicker, JobSitePicker, JobTypePicker, date/time, staff assignment. KEEP all of that but add:

- **Priority selector:** Normal (default) | Urgent | Emergency — simple button group
- **Initial status picker:** Where should this job start?
  - Enquiry (default) — just capturing the lead
  - Site Visit Booked — shows date/time picker for the site visit
  - Ready to Quote — have enough info already
  - Scheduled — client already approved, just book it
- **Tree count** (number input, default 1)
- **Stump count** (number input, default 0)
- **Quick photo capture** — camera/upload button to attach initial photos (uses existing job-photos bucket)
- **Access notes** — textarea, pulls from job_sites.notes if site already has notes

#### B1d. Job Detail page — make it the single source of truth

The current JobDetail page uses `JobDetailView` component with hero map, header card, info rows, status buttons, reports list. KEEP the component but restructure it as a comprehensive project page.

**Add a pipeline stepper at the top:**
- Horizontal progress bar showing: Enquiry → Site Visit → Quoted → Approved → Scheduled → In Progress → Completed → Invoiced → Paid
- Current stage highlighted, completed stages get checkmarks
- Tapping a future stage triggers the appropriate transition action (see B1e)

**Organise the detail page into clear sections (scrollable):**

1. **Header** (existing — job title, status, client, site address, map)

2. **Job Info section**
   - Job type, priority, tree count, stump count
   - Access notes (from job + job_site.notes)
   - Equipment needed (multi-select from equipment_library)
   - Estimated duration
   - Assigned crew
   - All editable inline (existing quick-edit pattern)

3. **Tree Assessments section** (pull from existing `tree_assessments` via job reports)
   - Show tree assessment cards if a job report exists for this job's site
   - If no assessments yet: "Add Tree Assessment" button → links to NewJobReport or opens inline
   - Each card: species, height, DBH, canopy, health, action — from existing tree_assessments table

4. **Photos section**
   - Grid of photos from job_photos (linked via report)
   - Also show any photos directly attached to the job (see new job_id column below)
   - "+ Add Photo" with tag selector (before, after, detail, hazard)
   - Before/After comparison view once job is complete

5. **Quote section** (visible if job has reached "quoted" stage or has a linked quote)
   - If no quote: "Create Quote" button → navigates to QuoteBuilder with job data pre-filled
   - If quote exists: show summary (line items, total), status badge, "Edit Quote" and "Send to Client" buttons
   - When client accepts via public link → job status auto-moves to "approved"

6. **Schedule section** (visible from "scheduled" stage onward)
   - Scheduled date/time
   - Assigned crew members
   - Equipment booked
   - Estimated duration
   - "Reschedule" button

7. **Job Reports section** (existing — keep)
   - List of reports for this job's site
   - "Create Report" button → existing NewJobReport flow
   - Shows tasks, equipment used, tree assessments, photos

8. **Completion section** (visible from "completed" stage)
   - Completion date, time spent, completion notes
   - After photos

9. **Invoice section** (visible from "invoiced" stage or when job is completed)
   - If no invoice: "Create Invoice" button → InvoiceBuilder pre-filled from quote line items
   - If invoice exists: summary, status, "Send" / "Mark Paid" buttons

#### B1e. Pipeline stage transitions

Each transition should be a clear action button on the Job Detail page:

| From | To | Action | What happens |
|------|----|--------|-------------|
| Enquiry | Site Visit | "Book Site Visit" | Date/time picker appears, saves to job.site_visit_date/time, adds to Schedule |
| Site Visit | Quoted | "Create Quote" | Opens QuoteBuilder pre-filled with job + site data |
| Quoted | Approved | "Mark Approved" (or auto when client accepts via public link) | Updates status |
| Approved | Scheduled | "Schedule Job" | Date/time picker, crew assignment, equipment selection |
| Scheduled | In Progress | "Start Job" | Sets started_at timestamp |
| In Progress | Completed | "Complete Job" | Prompts for: after photos, completion notes, time spent |
| Completed | Invoiced | "Create Invoice" | Opens InvoiceBuilder pre-filled from quote |
| Invoiced | Paid | "Mark Paid" | Records payment date |

Auto-transitions:
- Quote accepted via public link → status moves to "approved" + activity_feed entry
- All transitions create an activity_feed entry

### B2. Schedule page — add site visits + simplify

**Current state:** Schedule shows jobs from the `jobs` table with List/Upcoming/Map views and drag-drop reorder. Good mechanics.

**Modification:** Schedule should now show TWO types of items:

1. **Site visits** — jobs where status = 'site_visit' and site_visit_date matches the selected day
2. **Scheduled jobs** — jobs where status = 'scheduled' or 'in_progress' and scheduled_date matches the selected day

**Today view — two sections (same pattern as PoolPro):**

**"Site Visits" section (top)**
- Cards for assessment appointments
- Each shows: client name, site address, time, "Navigate" button
- Tapping → Job Detail page

**"Jobs" section (below)**
- Cards for actual work
- Each shows: client name, site address, job type, time, duration, assigned crew, equipment, "Navigate" button
- Tapping → Job Detail page

**Keep existing:** drag-drop reorder, ScheduleMap component, travel summary (km + minutes), Upcoming view, Map view, OSRM routing.

**Add:** Week view (grouped by day, same as PoolPro pattern). Currently TreePro only has List/Upcoming/Map — add Week between List and Upcoming.

Tabs: **Today** | **Week** | **Upcoming** | **Map**

### B3. Dashboard — add pipeline snapshot + today's summary

**Current state:** KPI cards (jobs this week, active jobs, pending quotes, overdue sites), quick action buttons, recent activity.

**Modifications:**

**Replace KPI cards with Pipeline Snapshot:**
- Visual mini-pipeline showing counts at each active stage:
  - Enquiries: X | Site Visits: X | Quoted: X | Approved: X | Scheduled: X | In Progress: X
- Each stage count is tappable → navigates to Jobs filtered by that status
- Highlight stages needing attention (e.g. "5 Quoted" in amber — needs follow-up)

**Add Today's Summary section (below pipeline, left column on desktop):**
- Progress card: "2 of 4 scheduled for today" with progress bar (same pattern as PoolPro)
- Three stat pills: Site Visits today (blue), Jobs today (green), Completed today (green checkmark)
- Access notes from today's job sites (pull from job_sites.notes and job_sites.hazards)
- "View Schedule" link → /schedule

**Add Revenue Snapshot (right column on desktop, below on mobile):**
- This month's completed work value (sum of completed + invoiced + paid jobs' quote totals)
- Pending quotes value (sum of outstanding quotes)
- Overdue invoices count + value (red if any)

**Keep:** Quick action buttons (New Job, New Quote, Add Client), Recent Activity feed.

### B4. Clients page — add job status context

**Current state:** Client list with search + "View All" toggle. Cards show name, email, Lead badge.

**Modifications:**

- Add status pills (same pattern as PoolPro Clients): All | Active Jobs | Leads | Completed
  - Active Jobs = has at least one job NOT in completed/invoiced/paid
  - Leads = has jobs only in enquiry/site_visit stage
  - Completed = all jobs finished
- Each client card shows: name, email, phone, number of jobs, total revenue, status badge
- Remove the "Lead" badge system and replace with computed badges based on their jobs:
  - "Active" (green) — has in-progress or scheduled work
  - "Quoted" (amber) — has outstanding quotes
  - "Lead" (blue) — enquiry only, no quotes yet
  - "No Jobs" (grey) — client exists but no jobs

### B5. Client Detail page — add job history + quotes + invoices

**Current state:** Client info + job sites management. Good foundation.

**Add sections:**

1. **Jobs section** — list of all jobs for this client across all statuses, each showing title, status badge, date, value. "+ New Job" button (pre-fills client).

2. **Quotes section** — list of quotes for this client. Each shows quote number, date, total, status. "+ Create Quote" button (pre-fills client).

3. **Invoices section** — list of invoices for this client. Each shows invoice number, date, total, status (draft/sent/paid/overdue). "+ Create Invoice" button.

4. **Revenue summary** — total invoiced, total paid, outstanding balance.

**Keep existing:** job sites management, contact info, notes.

### B6. QuoteBuilder — link to jobs

**Current state:** QuoteBuilder has Client picker, Job Site picker, line items, scope, terms, GST calc, save/send. Works well.

**Modifications:**

- Add `job_id` awareness: if navigated to from a Job Detail page, pre-fill client, site, and link the quote to the job
- When creating from /quotes/new directly (no job context): keep current flow but also create or link to a job
  - Option A: auto-create a job in "quoted" status when a standalone quote is saved
  - Option B: show a "Link to existing job" dropdown (optional)
  - **Go with Option A** — every quote should have a job. If the quote was created standalone, auto-create the job.
- Add "Add from Template" button in line items — pulls from `job_type_templates` pricing defaults and `equipment_library` hourly rates as quick-add options
- Add **Inclusions** textarea — what's included (green waste removal, stump grinding, site cleanup, etc.)
- Add **Exclusions** textarea — what's NOT included

### B7. InvoiceBuilder — link to jobs + pre-fill from quotes

**Current state:** InvoiceBuilder has line items, GST calc, status. Works.

**Modifications:**

- Add `job_id` awareness: if navigated from Job Detail "Create Invoice" button, pre-fill everything from the linked quote's line items
- Add `quote_id` link on invoices table (nullable FK → quotes)
- When pre-filling from a quote: copy all line items, scope, client, auto-set due date from business.default_payment_terms_days
- Keep standalone invoice creation for cases without a quote

### B8. Quotes page — keep but reposition

**Current state:** `/quotes` is a main nav-accessible page with filter tabs.

**Modification:**
- Remove Quotes from being a primary destination. It stays as a route but is accessed via:
  - Dashboard pipeline snapshot (tap "Quoted: X")
  - Client Detail → Quotes section → "View all"
  - Jobs page → filtered to "quoted" status shows jobs with linked quotes
- Keep the existing Quotes page UI (filter tabs, cards with amounts) — just change how users get to it
- The current bottom nav has 5 items: Home, Schedule, Clients, Jobs, Settings. **Quotes is already NOT in the bottom nav** — it's accessed via the top nav/header. So this may already be correct. Verify and ensure the Jobs page filter + Dashboard pipeline are the primary discovery paths.

### B9. Activity Feed — upgrade to PoolPro pattern

**Current state:** Basic activity_feed with type + message. useActivity hook fetches last 50 with realtime subscription.

**Modifications:**

Add columns to `activity_feed`:
- `title` text NOT NULL (separate from description/message)
- `description` text (rename from `message` or add alongside)
- `link_to` text — URL path to navigate to when tapped (e.g. `/jobs/uuid`)
- `is_read` boolean DEFAULT false

Update `useActivity` hook to match PoolPro pattern:
- Add `unreadCount` computed value
- Add `markAllRead()` function
- Add `markRead(id)` function
- Add unread count badge on the notification bell icon

Add `ActivityPanel` slide-in panel (PoolPro has this) — slide-in from right with activity timeline, type-specific icons, mark read, tappable items navigate to the linked page.

### B10. Photos — link directly to jobs (not just reports)

**Current state:** Photos are linked to `job_reports` via `report_id`. You can only add photos through the NewJobReport flow.

**Modification:**

Add `job_id` column to `job_photos` (nullable FK → jobs). Photos can now be attached to either a report OR directly to a job.

This enables:
- Attaching photos during job creation (quick capture of initial enquiry)
- Adding before/after photos from Job Detail without going through a full report
- Report photos still work as before (report_id link)

Query photos for a job: `WHERE job_id = X OR report_id IN (SELECT id FROM job_reports WHERE job_site_id = job.job_site_id)`

---

## SECTION C — What to ADD (new features from PoolPro patterns)

### C1. Crew Role View (from PoolPro's TechShell)

Tree crews need the same simplified view as pool techs. A crew member opens the app and sees only their assigned work.

**Database changes:**
Add to `staff_members`:
- `user_id` uuid FK → auth.users (nullable — links auth account)
- `invite_token` uuid DEFAULT gen_random_uuid() UNIQUE WHERE NOT NULL
- `invite_status` text DEFAULT 'pending' CHECK: pending, accepted
- `is_active` boolean DEFAULT true

**New components:**
- `CrewShell.jsx` — simplified layout (header with business name + profile icon, no full nav)
- `CrewGuard.jsx` — checks role, redirects admin → `/`, crew → `/crew`
- `CrewRunSheet.jsx` — daily view of assigned jobs

**New routes:**
- `/crew` — Crew daily run sheet (default view)
- `/crew/profile` — Profile + change password
- `/invite/:token` — Invite acceptance page (same pattern as PoolPro)

**Crew run sheet shows:**
- Tabs: Today | Week | Upcoming | Map (same as admin Schedule but filtered to assigned jobs only)
- Today view: site visits + jobs assigned to this crew member
- Each card: client name, site address, job type, time, equipment needed, "Navigate" button
- "Start Job" button → updates job status to in_progress
- "Complete Job" → prompts for photos + notes + time spent
- **"Next Job" button** after completion → navigates to next assigned job (conveyor belt UX from PoolPro)
- Access notes + hazards visible on each card (critical for tree work safety)
- Progress indicator: "2 of 5 jobs completed today"

**Crew members do NOT see:** Dashboard, Clients, Quotes, Invoices, Settings, pipeline view, revenue.

**Admin invite flow in Settings → Staff:**
- Admin adds crew member with email
- System generates invite_token, sends email via Resend
- Crew member clicks link → `/invite/:token` → creates auth account → linked to staff_members → redirected to `/crew`

**Auth flow update (App.jsx):**
After login, check user role:
- Owner / admin role → redirect to `/` (admin view)
- Crew role (arborist, operator, etc.) → redirect to `/crew`

### C2. Job Site enhancements

The `job_sites` table already has great fields (site_type, site_access, hazards, lat/lng). Enhance the site detail:

**JobSiteDetail page — add:**
- **Job history for this site** — list of all jobs at this address across all statuses
- **Photo gallery** — all photos from jobs/reports at this site
- **Tree inventory** — all tree_assessments from reports at this site (so you can see the history of what was assessed/removed)
- **Hazard warnings** — prominent display of hazards array (power lines, steep slope, etc.) with warning icons

### C3. Recurring maintenance (light touch)

TreePro already has `recurring_job_profiles` table and RecurringJobs page. Tree businesses DO have some recurring work — regular palm cleaning, hedge trimming, seasonal maintenance contracts.

**Keep the existing recurring system but:**
- Make it accessible from Settings or a link on the Schedule page (not a main nav item)
- When a recurring job fires, it creates a new job in "scheduled" status
- Don't overcomplicate — this is a minor feature for tree removal, not the core flow

### C4. Reports analytics page

**Current state:** `/reports` shows bar charts (jobs by week) and pie charts (jobs by type) via Recharts.

**Enhance with:**
- Revenue by month chart
- Pipeline conversion rates (what % of enquiries become quotes? what % of quotes get accepted?)
- Average job value
- Average time from enquiry to completion
- Revenue by job type breakdown
- Keep existing charts, add these alongside

---

## SECTION D — Database migration summary

### Modify existing tables:

**jobs:**
- Expand `status` CHECK to: enquiry, site_visit, quoted, approved, scheduled, in_progress, completed, invoiced, paid
- Change DEFAULT to 'enquiry'
- ADD: priority, quote_id, invoice_id, site_visit_date, site_visit_time, estimated_duration, equipment_needed, completion_notes, time_spent_hours

**quotes:**
- ADD: job_id (uuid FK → jobs, nullable)
- ADD: inclusions (text), exclusions (text)

**invoices:**
- ADD: job_id (uuid FK → jobs, nullable), quote_id (uuid FK → quotes, nullable)

**job_photos:**
- ADD: job_id (uuid FK → jobs, nullable) — photos can attach to a job directly, not just a report

**staff_members:**
- ADD: user_id, invite_token, invite_status, is_active (for crew login system)

**activity_feed:**
- ADD: title (text NOT NULL), link_to (text), is_read (boolean DEFAULT false)
- RENAME or ADD: description alongside existing message column

### New tables: None needed — existing schema covers everything.

### Indexes to add:
- `idx_jobs_status` on jobs(business_id, status)
- `idx_jobs_scheduled` on jobs(scheduled_date) WHERE status IN ('scheduled', 'in_progress')
- `idx_jobs_site_visit` on jobs(site_visit_date) WHERE status = 'site_visit'
- `idx_quotes_job` on quotes(job_id) WHERE job_id IS NOT NULL
- `idx_staff_invite` on staff_members(invite_token) WHERE invite_token IS NOT NULL
- `idx_activity_unread` on activity_feed(business_id, is_read) WHERE is_read = false

---

## SECTION E — Implementation order

Run these in sequence. Each builds on the previous:

1. **Database migrations** — all schema changes from Section D
2. **Jobs pipeline** — extend statuses, pipeline view, enhanced create modal, pipeline stepper on Job Detail
3. **Quote ↔ Job linking** — QuoteBuilder job_id awareness, auto-create job from standalone quote, pre-fill from job
4. **Invoice ↔ Job linking** — InvoiceBuilder pre-fill from quote, job_id link
5. **Pipeline transitions** — action buttons on Job Detail, auto-transitions, activity_feed entries
6. **Schedule update** — site visits + jobs split, Week view tab
7. **Dashboard rebuild** — pipeline snapshot, today's summary, revenue snapshot
8. **Clients enhancement** — status pills, job history, quotes/invoices on Client Detail
9. **Activity feed upgrade** — title/description/link_to/is_read, ActivityPanel, unread badge
10. **Job photos enhancement** — direct job attachment, before/after on Job Detail
11. **Crew role view** — staff auth columns, CrewShell, CrewGuard, CrewRunSheet, invite flow
12. **Job Site enhancements** — job history, photo gallery, tree inventory on site detail
13. **Reports enhancement** — revenue charts, conversion rates

---

## Key principles

- **The Job is the central object.** Everything (quotes, invoices, photos, reports, schedule entries) connects back to a job.
- **Mobile-first.** Crew members are standing next to a tree in the sun. Big buttons, high contrast, 44px touch targets.
- **Australian locale.** AUD, DD/MM/YYYY, 10% GST, ABN. Already configured — don't break it.
- **Don't rebuild what works.** The pickers, equipment library, tree assessments, map components, plan gating — all excellent. Build ON them.
- **Activity feed everything.** Every pipeline transition, every quote sent, every job completed → activity_feed entry with title + link_to.
