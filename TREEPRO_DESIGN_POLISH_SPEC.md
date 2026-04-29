# TreePro — Design Polish Spec

> Hand this to Claude Code. Read TREEPRO_FULL_AUDIT.md first. This spec brings TreePro's visual quality up to PoolPro's standard. Reference PoolPro's AUDIT.md for the exact patterns being replicated. Every page needs attention.

---

## The Problem

TreePro looks like a mobile wireframe stretched onto desktop. PoolPro has a polished, professional feel — hero sections, responsive layouts, proper spacing, glass morphism headers, two-column desktop layouts, card grids, status badges. TreePro needs all of that, adapted for the green tree brand. This is a DESIGN overhaul, not a functional one — the features work, they just look amateur.

---

## 1. Global Layout System — Match PoolPro's Shell

### Desktop Top Nav (currently missing or basic)

TreePro needs a proper `TopNav.jsx` matching PoolPro's pattern:

- `hidden md:flex` — only shows on desktop
- Sticky top, full-width, white background with subtle bottom border
- Left: TreePro logo + brand name (gradient green text)
- Center/Right: 5 nav links — Home, Schedule, Clients, Jobs, Settings
- Active tab: tree-green text colour with underline or highlight
- Glass morphism: `bg-white/90 backdrop-blur-xl`

### Mobile Bottom Nav (exists but needs polish)

- Currently functional but verify: 44px touch targets, active state with filled icon, tree-green active colour
- Ensure `md:hidden` so it disappears on desktop
- Add subtle top shadow (`shadow-nav` from tailwind config)

### AppShell / Layout wrapper

Ensure the layout matches PoolPro's pattern:
- Desktop: `TopNav` at top → page content → no bottom nav
- Mobile: page content → `BottomNav` at bottom
- Page content gets `pb-24 md:pb-8` (extra bottom padding on mobile for nav clearance)

### Header component

Each page needs a sticky header matching PoolPro:
- Glass morphism: `bg-white/90 backdrop-blur-xl` with subtle bottom border
- Title on the left
- Optional right-side action slot (+ button, settings icon, etc.)
- Responsive max-width container: `max-w-lg md:max-w-6xl` centered
- Back button where appropriate

### PageWrapper

Responsive container for all page content:
- Mobile: `max-w-lg` with `px-4`
- Desktop default: `md:max-w-5xl` with `md:px-8`
- Desktop wide: `md:max-w-7xl` with `md:px-8`
- Bottom padding: `pb-24 md:pb-8`

**This is the single biggest fix.** Right now everything is stuck at ~480px max-width even on desktop. The PageWrapper needs to expand on `md:` breakpoints.

---

## 2. Dashboard — Full Redesign to Match PoolPro

### Hero Section (ADD — currently missing)

```
┌──────────────────────────────────────────────────────┐
│  Good morning                                        │
│  ██ Business Name ██           [View Schedule] [Jobs]│
│  13/04/2026                                          │
└──────────────────────────────────────────────────────┘
```

- Full-width gradient banner: `bg-gradient-to-br from-tree-600 to-tree-800` (dark green gradient)
- White text: greeting, business name (large, bold), today's date
- Two CTA buttons on the right: "View Schedule" (solid white bg) and "Jobs" (outlined white)
- Rounded corners (`rounded-2xl`), padding, margin below
- On mobile: buttons stack below the text

### Desktop Two-Column Layout

```
┌─────────────────────────┬─────────────────────────┐
│  Pipeline Snapshot       │  Recent Activity         │
│  Today's Summary         │                          │
│  Revenue This Month      │                          │
│  Quick Actions           │                          │
└─────────────────────────┴─────────────────────────┘
```

- Left column (~60%): Pipeline, Today's Summary, Revenue
- Right column (~40%): Recent Activity feed
- On mobile: single column, stacked

### Pipeline Snapshot — polish the cards

Current state is functional but visually flat. Match PoolPro's stat card styling:
- Each stage count in a proper `.card` container with subtle shadow
- Stage label below the number in muted text
- Colour-code meaningfully:
  - Enquiries: blue (new leads)
  - Site Visits: amber/orange (action needed)
  - Quoted: purple (awaiting response)
  - Approved: green (ready to go)
  - Scheduled: tree-green (booked)
  - In Progress: tree-green darker (active)
- Numbers should be large and bold, labels small and muted
- Each card tappable → navigates to Jobs filtered by that status
- Desktop: 6 cards in a row (3+3 if needed)
- Mobile: 3 per row (2 rows of 3)

### Today's Summary — match PoolPro's version exactly

PoolPro pattern:
- Section header: "TODAY'S SUMMARY" with date in lighter text
- Progress bar: "X of Y stops completed" with gradient fill bar
- Three stat pills in a row: Site Visits (blue), Jobs (green), Completed (green with checkmark)
- Access notes / hazard warnings from today's job sites
- "View Schedule" link at bottom

### Revenue This Month — clean card

- White card with shadow
- "Revenue This Month" header
- Two rows: "Completed Work: $X,XXX" (green dot), "Pending Quotes: $X,XXX" (amber dot)
- If overdue invoices exist: "Overdue Invoices: $X,XXX" (red dot, red text)

### Quick Action Buttons

- Three buttons in a row: "New Job" (primary gradient green), "New Quote" (secondary outlined), "Add Client" (secondary outlined)
- On desktop: `md:inline-flex` side by side
- On mobile: can stay side by side if they fit, or stack

### Recent Activity — upgrade to PoolPro's ActivityPanel

- Card with "Recent Activity" header + unread count badge + "Mark all read" link
- Each activity item: type icon (coloured), title, timestamp
- Tappable items navigate to linked page (if `link_to` is set)
- Show last 10 items, "View all" link at bottom
- Slide-in `ActivityPanel` when clicking the notification bell in the header (PoolPro pattern)

---

## 3. Schedule Page — Desktop Layout + Visual Polish

### Current issues:
- Stuck at mobile width on desktop
- "No jobs scheduled" empty state is basic
- No visual distinction between site visits and jobs

### Fixes:

**Wider layout on desktop:**
- Use PageWrapper with `width="wide"` → `md:max-w-7xl`
- Cards expand to fill the wider space

**Date picker bar:**
- Full-width card with date centered, prev/next arrows
- "Jump to today" link below date (keep existing)
- Clean, spacious — not cramped

**Tab bar:**
- Today | Week | Upcoming | Map
- Tabs fill width evenly, active tab has tree-green underline
- No horizontal scrollbar on tabs

**Site Visits section:**
- Section label: "SITE VISITS" in muted uppercase (`.section-title` class)
- Cards with left green accent border to distinguish from job cards
- Client name, site address, time, "Navigate" button
- If empty: subtle "No site visits today" text (don't show empty state component)

**Jobs section:**
- Section label: "TODAY'S JOBS" in muted uppercase
- Cards with tree-green left accent border
- Client name, site address, job type badge, time, duration, assigned crew avatar + name, equipment icons
- "Start" or "Navigate" button

**Desktop: cards in a grid**
```jsx
<div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
```

**Travel summary banner:**
- Full-width gradient card (tree-green): "Total Route: XX km · ~XX min travel"
- Map icon on the left
- Same styling as PoolPro's route summary

**Empty state:**
- Friendly illustration + "No jobs scheduled for [day]"
- "Create Job" button below
- Center-aligned, fade-in animation

### Week view:
- Grouped by day with date headers
- Each day shows its site visits + jobs
- Days with no items show a subtle "—" or nothing (don't show empty states for every day)

---

## 4. Jobs Page — Match PoolPro's Work Orders + Pipeline

### Current issues:
- Flat mobile-width list
- No page subtitle explaining what this is
- Filter pills may horizontal scroll (bad)

### Fixes:

**Page header:**
- Title: "Jobs"
- Subtitle: "Your complete pipeline — from enquiry to completion"

**Desktop layout:**
- Wide container (`md:max-w-7xl`)
- Two view toggle buttons top-right: "Pipeline" | "List" (default to List on mobile, Pipeline on desktop)

**List view (mobile default):**
- "+ New Job" primary gradient button (full width on mobile, auto on desktop)
- "+ Quick Quote" secondary button beside it (same pattern as PoolPro's Work Orders page)
- Filter pills below: All | Enquiry | Site Visit | Quoted | Approved | Scheduled | In Progress | Completed
  - Pills WRAP on mobile (`flex flex-wrap gap-2`), do NOT horizontal scroll
  - Each pill shows count: "Quoted (3)"
- Job cards in a responsive grid:
  ```jsx
  <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
  ```
- Each card styled like PoolPro's work order cards:
  - Left side: coloured date strip (tree-green gradient) with date + map pin icon
  - Body: job title (bold), client name, suburb, status badge, time/duration if scheduled
  - Priority badge if urgent/emergency (red/amber)
  - Dollar value if quoted (right-aligned)

**Pipeline / Kanban view (desktop):**
- Horizontal columns, each with a header showing stage name + count
- Cards inside columns are compact (title, client, value)
- Scrollable columns if many items
- Drag-drop between columns (reuse existing HTML5 drag from Schedule)
- On mobile: this view is accessible but shows as a horizontal scroll of columns (acceptable for kanban)

**Unscheduled jobs styling:**
- Jobs without a date: grey card background (`bg-gray-50`), "Not scheduled" label instead of date strip
- Same pattern as PoolPro's unscheduled work orders

---

## 5. Clients Page — Match PoolPro's Design

### Current issues:
- Basic list with "Lead" badge and search
- No status-based filter pills
- Cards are minimal — just name and email
- Stuck at mobile width

### Fixes:

**Page header:**
- Title: "Clients"
- Subtitle: "X customers" (count)
- "+ Add Client" button top-right (primary green)
- "+" icon in header right slot on mobile

**Search bar:**
- Full-width input: "Search by name, email, phone, or address..."
- Properly styled with the `.input` class, search icon

**Filter pills:**
- All (X) | Active Jobs (X) | Quoted (X) | Leads (X) | No Jobs (X)
- Each pill shows count
- `flex flex-wrap gap-2` — no horizontal scroll
- Active pill: tree-green bg, white text
- Colour-coded counts: Active = green, Quoted = amber, Leads = blue

**Client cards — responsive grid:**
```jsx
<div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
```

Each card:
- Left: circular avatar with initials (coloured background, like PoolPro)
  - Generate colour from client name hash (consistent per client)
- Client name (bold) + status badge inline (Active/Quoted/Lead/No Jobs)
- Email below name (muted text)
- Phone number (muted text)
- Bottom: "X jobs" count + "View" chevron right-aligned
- Card is tappable → client detail page
- Cards use `.card` class with hover effect (`.card-interactive`)

---

## 6. Client Detail Page — Polish

### Fixes:

**Header:**
- Back button + client name as title
- Edit + Delete action icons in header right slot

**Client info card:**
- Large circular avatar with initials at top
- Name, email (tappable → email), phone (tappable → call), address
- Notes section
- All editable inline

**Sections below with clear headers:**
- "Job Sites" — existing functionality, add card styling
- "Jobs" — list of jobs for this client with status badges + values
- "Quotes" — list of quotes with amounts + status
- "Invoices" — list of invoices with amounts + status
- Each section: header with "+ Add" button right-aligned

**Desktop: two-column layout**
- Left: client info card + contact details
- Right: job sites, jobs, quotes, invoices (stacked sections)

---

## 7. Job Detail Page — Polish

### Current state:
- JobDetailView component with hero map, header card, info rows, status buttons, reports list
- Functional but needs visual hierarchy

### Fixes:

**Pipeline stepper at top:**
- Horizontal step indicator: Enquiry → Site Visit → Quoted → Approved → Scheduled → In Progress → Completed
- Current stage: tree-green filled circle + bold label
- Completed stages: green checkmark circle
- Future stages: grey outline circle
- Connected by lines between circles
- On mobile: only show current + next + previous (with "..." for rest) to save space

**Section cards:**
- Each section (Job Info, Photos, Quote, Schedule, Reports, Invoice) in a white `.card` container
- Section title as card header with muted text
- Collapsible sections (click header to expand/collapse) — saves vertical space
- Active/relevant sections expanded by default, future sections collapsed

**Action buttons:**
- Primary action at the bottom of the page (sticky on mobile): the NEXT pipeline transition
  - e.g. if job is "approved": big "Schedule Job" button
  - e.g. if job is "in_progress": big "Complete Job" button
- Secondary actions (edit, delete, reschedule) in a "..." overflow menu

---

## 8. Quote Builder — Polish

### Fixes:
- Page title: "New Quote" with back button
- Client + Job Site section in a card
- Line items section in a card
  - Better spacing between rows
  - "+ Add Line Item" in tree-green text
  - "Add from Template" button (secondary) — pulls from job_type_templates + equipment_library
  - Subtotal / GST / Total right-aligned with proper typography (total = large, bold)
- Scope of Work in a card
- Inclusions / Exclusions in a card (if added per the restructure spec)
- Terms & Conditions in a card
- Action buttons at bottom: "Save Draft" (secondary), "Send Quote" (primary gradient)
- On desktop: wider container, two-column layout where it makes sense

---

## 9. Settings Page — Polish

### Fixes:
- Settings hub: grid of cards, each linking to a sub-page
- Each card: icon + title + short description
- Desktop: 2-3 column grid
- Mobile: stacked cards
- Icons should use the tree-green colour

Settings sub-pages (Staff, Equipment, Templates, etc.) should all use:
- PageWrapper with proper max-width
- `.card` containers for content sections
- Consistent header with back button

---

## 10. Global Design Tokens — Verify & Apply

Make sure these are consistently applied everywhere:

### Colours
- Primary: tree-green scale (already in tailwind config)
- Background: `bg-gray-50` or `bg-slate-50` (NOT white for page bg)
- Cards: white with `shadow-card` border
- Text: `text-gray-900` for headings, `text-gray-600` for body, `text-gray-400` for muted

### Typography
- Page titles: `text-xl font-bold` or `text-2xl font-bold`
- Section titles: `text-xs font-semibold uppercase tracking-wider text-gray-400` (`.section-title`)
- Card titles: `text-sm font-semibold`
- Body: `text-sm text-gray-600`
- Numbers/stats: `text-2xl font-bold` or `text-3xl font-bold`

### Spacing
- Page sections: `space-y-6`
- Card internal: `p-4 md:p-6`
- Between cards in a grid: `gap-3`

### Cards
- All content containers: `.card` class (white, rounded-2xl, subtle border, shadow-card)
- Interactive cards: `.card-interactive` (hover lift, darker border on hover)
- Gradient cards (hero, route summary): `.card-gradient` with brand gradient

### Buttons
- Primary: gradient green (`bg-gradient-to-r from-tree-500 to-tree-600`), white text, `rounded-xl`
- Secondary: white bg, tree-green text, subtle border, `rounded-xl`
- Danger: gradient red
- Ghost: no bg, tree-green text
- All buttons: `min-h-[44px]` touch target

### Badges
- Consistent sizing and colours across all pages
- Status badges: green (active/completed), amber (quoted/pending), blue (enquiry/lead), red (urgent/overdue), grey (no schedule/inactive)

### Empty States
- Centered, with fade-in animation
- Subtle illustration or icon (use existing EmptyState component)
- Descriptive title + body text
- CTA button if applicable

### Filter pills
- ALWAYS `flex flex-wrap gap-2` — NEVER horizontal scroll
- Active pill: tree-green bg, white text, bold
- Inactive pill: white bg, gray text, subtle border
- Each pill shows count in parentheses

---

## 11. Responsive Breakpoints Checklist

Every page must be checked at these widths:

- **375px** (mobile) — single column, bottom nav, full-width cards
- **768px** (tablet / md:) — top nav appears, bottom nav hides, containers widen, grids activate (2 cols)
- **1024px** (desktop / lg:) — 3-column grids where applicable, two-column dashboard layout
- **1280px** (wide / xl:) — max container width reached, content doesn't stretch further

**Critical: the `max-w-[480px]` (maxWidth.app) constraint in the tailwind config is killing the desktop layout.** Either remove it or only apply it on mobile. The PageWrapper should handle responsive widths:
- Mobile: `max-w-lg` (512px)
- Desktop: `md:max-w-5xl` (1024px) default, `md:max-w-7xl` (1280px) for wide pages

---

## 12. Page-by-Page Subtitle Guide

Every main page should have a subtle subtitle below the title explaining what it's for:

| Page | Title | Subtitle |
|------|-------|----------|
| Dashboard | Welcome back | Here's your business overview |
| Schedule | Schedule | Your daily site visits and jobs |
| Jobs | Jobs | Track every job from enquiry to completion |
| Clients | Clients | X customers |
| Settings | Settings | Business configuration |
| Work detail | [Job Title] | [Client Name] · [Status] |
| Quotes | Quotes | Sales pipeline and proposals |
| Invoices | Invoices | Billing and payments |

---

## 13. Implementation Priority

1. **PageWrapper + TopNav + responsive containers** — this alone fixes 50% of the problem
2. **Dashboard hero + two-column layout** — biggest visual impact
3. **Card grid layouts on Clients + Jobs** — stops everything being a single-column mobile list
4. **Job cards + status badges + filter pills** — brings Jobs page to PoolPro quality
5. **Client cards with avatars + status badges** — brings Clients page up
6. **Schedule sections + travel banner** — polishes the daily view
7. **Job Detail pipeline stepper + section cards** — makes the project page professional
8. **Settings grid + sub-page consistency** — final polish
9. **Global empty states, loading states, transitions** — attention to detail

**Do NOT change any functionality, data fetching, or business logic.** This is purely visual. Same features, same data, dramatically better presentation.

---

## Reference

Look at PoolPro's `AUDIT.md` sections on:
- Layout shell (AppShell, TopNav, BottomNav, Header, PageWrapper)
- Component classes (.btn, .btn-primary, .card, .card-interactive, .input, .section-title, .glass)
- Tailwind theme (shadows, gradients, animations, spacing)
- Desktop grid pattern (`md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3`)

Replicate these EXACT patterns in TreePro but with the tree-green brand colour instead of pool-blue.
