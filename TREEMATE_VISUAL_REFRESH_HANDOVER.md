# TreeMate — Visual refresh handover (FieldSuite design system)

> **What this is.** A complete ledger of what changed on top of the original
> shared TreeMate / PoolPro / sibling-app starting point during the FieldSuite
> visual-identity refresh. Hand this file to a new Claude session working on
> any of the other 5 *Mate apps and tell it:
>
> > *"Apply this refresh to this app. Keep all existing routes, data hooks,
> > business logic, and edge functions untouched. Replace the visual layer +
> > Settings shell only. Work through §17 checklist in order. Verify the app
> > still builds + runs after each step."*
>
> Treat this as a **theme + chassis swap**, not a feature rewrite.
> Every domain-specific reference (trees / arborist / AS 4373) should be
> swapped for that app's trade equivalent — see §13.

---

## Table of contents

0. How to use this brief
1. Design philosophy
2. Tooling & dependencies
3. Colour system & surface tokens
4. Dark mode
5. Typography
6. Spacing · radii · shadows · motion
7. Layout shell (TopNav / BottomNav / MoreSheet / PageWrapper)
8. Core UI primitives
9. New primitives unique to this round
10. Page composition patterns
11. Page-level rebuilds (Dashboard / Schedule / Jobs / Clients / Quotes / Invoices / Analytics)
12. Settings — nested-route shell (architectural change)
13. Domain-specific fields (per app)
14. Sweeps — alert() → toast, confirm() → ConfirmModal, photo inputs
15. Sample report PDF generator
16. Things NOT to do
17. Hard-won field lessons
18. Port checklist (in-order)
19. Reference files

---

## 0. How to use this brief

The recipient app should already share the original TreeMate / PoolPro chassis
(React + Vite + Tailwind + Supabase). This brief assumes that and only
documents the deltas.

Key rule: **every primitive you build, you immediately APPLY on a real page in
the same step.** The previous attempt at this refresh shipped a load of
infrastructure (CSS variables, ThemeContext, FOUC, three-mode toggle,
ConfirmModal, FilterChips) that wasn't wired into any page — the visual diff
in light mode was minimal until the patterns were actually used. Don't repeat
that. Build → apply → verify.

The doc reads top-to-bottom in execution order, but you can read §1 + §17 first
to get the shape of the work before digging into the recipes.

---

## 1. Design philosophy

Twelve principles applied consistently. Port these first — everything else is
implementation detail.

1. **Soft over hard.** Multi-layer, low-opacity drop shadows (4–8% black)
   instead of bold borders.
2. **Rounded, not rectangular.** `rounded-card` (10px) for inner surfaces,
   `rounded-xl` (12px) for buttons / inputs / interactive pills,
   `rounded-shell` (24px) reserved for outermost containers (used sparingly),
   `rounded-full` for chips, badges, dots, avatars.
3. **Warm cream over cool slate.** Page surface is `#f8f6ef` (oklch warm
   off-white), NOT cool gray. Cards on top of it are pure `#ffffff`. The
   contrast is the visual hierarchy.
4. **Mono numerals + tabular nums.** Every count, ref, price, percentage,
   delta uses Geist Mono with `font-variant-numeric: tabular-nums` so
   columns of figures align vertically.
5. **Editorial eyebrow above every page title.** Mono caps + accent green +
   18×1px horizontal-line prefix. Quiet, authoritative, never decorative.
6. **Smooth motion with custom easing.** `cubic-bezier(0.22, 1, 0.36, 1)` —
   decelerating without overshoot. Respects `prefers-reduced-motion`.
7. **Dynamic theming via CSS variables.** Brand colours and warm surfaces
   are RGB triplets on `<html>`, consumed by Tailwind via
   `rgb(var(--token) / <alpha-value>)` so opacity modifiers just work
   (`bg-brand-500/40`).
8. **Dark mode is first-class.** Every component has light + dark variants.
   Three-way toggle (Light / System / Dark) persisted in localStorage.
   Inline FOUC-prevention script in `index.html` prevents white flash on
   reload.
9. **Mobile-first, desktop-enhanced.** Bottom nav on mobile, top tabs on
   desktop. Master-detail layouts collapse to single-column on mobile.
   Modal is a bottom sheet on mobile, a centred card on desktop.
10. **Semantic colour discipline.** Success = emerald, warning = amber,
    danger = red. Never replace the accent-green for "good" states.
11. **44px tap targets.** `min-h-tap` / `min-w-tap` (44px) on every
    interactive element. iOS HIG minimum.
12. **Quiet > loud.** Body text 14–16px. Labels 10–12px mono caps. Page
    titles ~26–30px Geist 600. Almost everything else is `text-sm` /
    `text-xs`. Loud type screams; quiet type is read.

---

## 2. Tooling & dependencies

```json
{
  "dependencies": {
    "@fontsource-variable/geist":       "^5.x",
    "@fontsource-variable/geist-mono":  "^5.x",
    "@fontsource-variable/inter":       "^5.x",  // fallback only — kept loaded
    "@fontsource-variable/jetbrains-mono": "^5.x",
    "lucide-react":     "^0.468.0",
    "clsx":             "^2.x",
    "tailwind-merge":   "^2.x",
    "jspdf":            "^2.x",  // lazy-loaded only when sample PDF is generated
    "jspdf-autotable":  "^3.x"   // lazy-loaded
  },
  "devDependencies": {
    "tailwindcss": "^3.x",
    "postcss":     "^8.x",
    "autoprefixer":"^10.x"
  }
}
```

- **Geist Variable** is body + display.
- **Geist Mono Variable** for refs, eyebrows, numbers, badges.
- **Inter Variable** kept as a fallback in `font-family` and via main.jsx
  import — it's already there and has no cost to leave.
- **lucide-react** is the only icon library. Don't mix Heroicons or Feather.
  All inline-SVG icons in pages should be migrated to lucide.
- **`cn()` utility** lives in `src/lib/utils.js` — must be `clsx + tailwind-merge`,
  not a hand-rolled `classes.filter(Boolean).join(' ')`. The merge behaviour
  is required so `<Card className="!p-0">` actually overrides the default.

```js
// src/lib/utils.js
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
export const cn = (...args) => twMerge(clsx(...args))
```

---

## 3. Colour system & surface tokens

### 3.1 Surface tokens — RGB triplets on `<html>`

**`src/index.css`** — the surface stack lives here:

```css
:root {
  /* Brand (per-app accent — RGB triplets so Tailwind's
     rgb(var(--brand-N) / <alpha-value>) works) */
  --brand-50:  240 253 244;   /* tree green; replace per app */
  --brand-100: 220 252 231;
  --brand-200: 187 247 208;
  --brand-300: 134 239 172;
  --brand-400:  74 222 128;
  --brand-500:  34 197  94;
  --brand-600:  22 163  74;
  --brand-700:  21 128  61;
  --brand-800:  22 101  52;
  --brand-900:  20  83  45;
  --brand-950:   5  46  22;

  /* FieldSuite warm-cream surface stack — RGB triplets */
  --surface:      248 246 239;   /* page bg, also dashboard bg (#f8f6ef) */
  --surface-2:    244 241 233;   /* mid bg / alt sections (#f4f1e9) */
  --surface-3:    237 233 222;   /* deeper / hover (#ede9de) */
  --surface-card: 255 255 255;   /* PURE WHITE card on top of cream */

  /* Legacy aliases — keep .bg-canvas / .bg-shell utilities working
     during migration. canvas and shell both point at the same warm cream
     now (no double-frame). */
  --canvas:    248 246 239;
  --canvas-2:  244 241 233;
  --shell:     248 246 239;
  --shell-2:   244 241 233;
  --shell-3:   237 233 222;

  /* Ink (text) — warm-cool neutral. Used as raw oklch (no alpha-modifier
     needed, these are the foreground colours, not opacity-aware). */
  --ink-1:  oklch(0.18 0.012 250);
  --ink-2:  oklch(0.32 0.010 250);
  --ink-3:  oklch(0.50 0.008 250);
  --ink-4:  oklch(0.65 0.006 250);

  --line:   oklch(0.90 0.005 250);
  --line-2: oklch(0.94 0.004 250);

  --ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1);
}

.dark {
  --surface:      5  8 16;       /* deep night #050810 */
  --surface-2:   10 16 24;
  --surface-3:   19 25 39;
  --surface-card: 14 19 28;      /* slate-zinc card surface */
  /* mirrored legacy aliases */
  --canvas:    5  8 16;
  --canvas-2: 10 16 24;
  --shell:     5  8 16;
  --shell-2:  10 16 24;
  --shell-3:  19 25 39;

  --ink-1:  #f3f4f6;
  --ink-2:  #d1d5db;
  --ink-3:  #9ca3af;
  --ink-4:  #6b7280;
  --line:   rgba(255,255,255,0.08);
  --line-2: rgba(255,255,255,0.05);
}
```

### 3.2 Tailwind consumer config

**`tailwind.config.js`:**

```js
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  'rgb(var(--brand-50)  / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          950: 'rgb(var(--brand-950) / <alpha-value>)',
        },
        // Legacy alias to a per-app trade name (tree-* for trees, pool-* for
        // pool, pest-* for pest etc) — keeps existing pages working until
        // they migrate to brand-*.
        // Example: tree-{N} aliases brand-{N}.
      },
      fontFamily: {
        sans:    ['"Geist Variable"', '"Inter Variable"', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['"Geist Mono Variable"', '"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
        display: ['"Geist Variable"', '"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      spacing:   { tap: '44px' },
      minHeight: { tap: '44px' },
      minWidth:  { tap: '44px' },
      borderRadius: {
        card:    '10px',     // INNER cards
        'card-lg':'14px',
        shell:   '24px',     // OUTER container if you ever need one
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      boxShadow: {
        card:          '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.03)',
        'card-hover':  '0 4px 12px 0 rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)',
        elevated:      '0 8px 24px -4px rgba(0,0,0,0.08), 0 4px 8px -4px rgba(0,0,0,0.04)',
        'soft-lift':   '0 10px 30px -10px rgba(0,0,0,0.12)',
        glow:          '0 0 20px rgb(var(--brand-500) / 0.15)',
        'glow-lg':     '0 0 40px rgb(var(--brand-500) / 0.20)',
        nav:           '0 -1px 12px 0 rgba(0,0,0,0.06)',
        'inner-soft':  'inset 0 2px 4px 0 rgba(0,0,0,0.04)',
        button:        '0 2px 8px -2px rgb(var(--brand-500) / 0.4)',
        'button-hover':'0 4px 16px -2px rgb(var(--brand-500) / 0.5)',
      },
      backgroundImage: {
        'gradient-brand':       'linear-gradient(135deg, rgb(var(--brand-500)) 0%, rgb(var(--brand-700)) 100%)',
        'gradient-brand-soft':  'linear-gradient(135deg, rgb(var(--brand-100)) 0%, rgb(var(--brand-50)) 100%)',
        'gradient-brand-light': 'linear-gradient(135deg, rgb(var(--brand-100)) 0%, rgb(var(--brand-50)) 100%)',
        'gradient-success':     'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-danger':      'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        'gradient-warm':        'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
        'gradient-glass':       'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)',
        'gradient-page':        'linear-gradient(180deg, rgb(248 246 239) 0%, rgb(244 241 233) 50%, rgb(237 233 222) 100%)',
        'gradient-hero':        'linear-gradient(135deg, rgb(var(--brand-500)) 0%, rgb(var(--brand-700)) 50%, rgb(var(--brand-800)) 100%)',
      },
      animation: {
        'fade-in':       'fadeIn 0.25s ease-out',
        'slide-up':      'slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in':      'scaleIn 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-right':'slideInRight 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'count-up':      'countUp 0.6s ease-out',
        'shimmer':       'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn:       { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp:      { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        scaleIn:      { '0%': { transform: 'scale(0.95)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        slideInRight: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        countUp:      { '0%': { transform: 'translateY(8px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        shimmer:      { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}
```

### 3.3 Surface utility classes

Defined in `index.css` as utilities so they're tree-shakeable:

```css
.bg-surface       { background: rgb(var(--surface)); }
.bg-surface-2     { background: rgb(var(--surface-2)); }
.bg-surface-3     { background: rgb(var(--surface-3)); }
.bg-surface-card  { background: rgb(var(--surface-card)); }
/* Legacy aliases */
.bg-canvas    { background: rgb(var(--canvas)); }
.bg-canvas-2  { background: rgb(var(--canvas-2)); }
.bg-shell     { background: rgb(var(--shell)); }
.bg-shell-2   { background: rgb(var(--shell-2)); }
.bg-shell-3   { background: rgb(var(--shell-3)); }

.text-ink-1   { color: var(--ink-1); }
.text-ink-2   { color: var(--ink-2); }
.text-ink-3   { color: var(--ink-3); }
.text-ink-4   { color: var(--ink-4); }
.border-line   { border-color: var(--line); }
.border-line-2 { border-color: var(--line-2); }
```

### 3.4 Semantic status colours

Use stock Tailwind palettes — don't invent new ones.

| Meaning | Palette | Light 50/700 | Dark 950/300 |
|---|---|---|---|
| Primary / info  | `brand-*`   | bg-brand-50 / text-brand-700     | bg-brand-950/40 / text-brand-300   |
| Success         | `emerald-*` | bg-emerald-50 / text-emerald-700 | bg-emerald-950/40 / text-emerald-300 |
| Warning         | `amber-*`   | bg-amber-50 / text-amber-700     | bg-amber-950/40 / text-amber-300   |
| Danger          | `red-*`     | bg-red-50 / text-red-700         | bg-red-950/40 / text-red-300       |
| Info            | `sky-*`     | bg-sky-50 / text-sky-700         | bg-sky-950/40 / text-sky-300       |
| Neutral         | `gray-*`    | bg-gray-100 / text-gray-600      | bg-gray-800 / text-gray-300        |

---

## 4. Dark mode

### 4.1 Strategy
- `darkMode: 'class'` in tailwind.config.
- Class lives on `<html>`.
- `localStorage` key per app: `appname:theme-mode`. Values: `light` | `dark` | `system`.
- Default `system`.

### 4.2 FOUC prevention (do not skip)

Inline script in `index.html` `<head>` **before** any stylesheets:

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('treemate:theme-mode') || 'system';
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (t === 'dark' || (t === 'system' && prefersDark)) {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {}
  })();
</script>
```

Without this you get a white flash on every reload.

### 4.3 ThemeContext

`src/contexts/ThemeContext.jsx`:

```jsx
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({ mode: 'system', setMode: () => {}, isDark: false })
const STORAGE_KEY = 'treemate:theme-mode'

function applyMode(mode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
  return isDark
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'system' } catch { return 'system' }
  })
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    setIsDark(applyMode(mode))
    try { localStorage.setItem(STORAGE_KEY, mode) } catch {}
  }, [mode])

  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setIsDark(applyMode('system'))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  return (
    <ThemeContext.Provider value={{ mode, setMode: setModeState, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

Wrap the root in `<ThemeProvider>` (just inside whatever's at the top — Auth /
Business / etc). See §17 step 6 for provider stack order.

### 4.4 ThemeToggle — two variants

Keep both. Compact for the header (light ↔ dark toggle, no system option).
Full segmented control for Settings → Appearance (3-mode: Light / System / Dark).

The Compact toggle has an `onBrand` prop for use on coloured/gradient
backgrounds (e.g. a hero block, a brand-tinted card) — it switches to a
white-overlay variant.

```jsx
// Compact — just for header
<ThemeToggleCompact />
<ThemeToggleCompact onBrand />  // when sitting on a coloured surface

// Full — Settings → Appearance only
<ThemeToggleFull />
```

---

## 5. Typography

### 5.1 Fonts loaded in `src/main.jsx` (top of file)

```js
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource-variable/inter'        // fallback
import '@fontsource-variable/jetbrains-mono' // fallback
```

### 5.2 Body feature flags (`index.css`)

```css
body {
  font-family: 'Geist Variable', 'Inter Variable', system-ui, -apple-system, sans-serif;
  font-feature-settings: 'cv11', 'ss01';
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: rgb(var(--surface));
  color: var(--ink-1);
}
```

### 5.3 Scale

| Use | Class | Size | Weight |
|---|---|---|---|
| Page title (PageHero H1) | `text-[26px] sm:text-[30px] font-semibold tracking-tight leading-[1.05]` | 26 → 30 | 600 |
| Stat number (StatCard)   | `text-[28px] font-semibold tabular-nums` | 28 | 600 |
| Card heading             | `text-[14-16px] font-semibold` | 14–16 | 600 |
| Body / form input        | (default) | 16 (14 in dense tables) | 400 |
| Form label               | `text-sm font-medium text-ink-2` | 14 | 500 |
| Eyebrow (accent)         | `.eyebrow` | 11 | 500 (mono caps + accent + 18×1px line) |
| Eyebrow (muted)          | `.eyebrow-muted` | 11 | 500 (mono caps + ink-3) |
| Section title            | `.section-title` | 10.5 | 500 (mono caps) |
| Status pill / badge      | `text-[10.5px] font-mono font-medium` | 10.5 | 500 |
| Mono ref (TM-2041 etc)   | `text-[10px] font-mono font-medium tracking-wider` | 10 | 500 |
| Metadata                 | `text-xs text-ink-3` | 12 | 400 |

### 5.4 Eyebrow utility (the FieldSuite signature)

```css
.eyebrow {
  font-family: 'Geist Mono Variable', 'JetBrains Mono Variable', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--brand-600));
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-feature-settings: "ss01", "ss02";
}
.dark .eyebrow { color: rgb(var(--brand-400)); }
.eyebrow::before {
  content: "";
  width: 18px;
  height: 1px;
  background: currentColor;
  display: inline-block;
}

/* Neutral variant — same shape, no accent colour */
.eyebrow-muted {
  font-family: 'Geist Mono Variable', 'JetBrains Mono Variable', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}

/* Section title — 10.5px, used as a small label above grouped content */
.section-title {
  font-family: 'Geist Mono Variable', 'JetBrains Mono Variable', ui-monospace, monospace;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
```

**iOS rule:** every form input must be `font-size: 16px`. Anything smaller
triggers auto-zoom on focus. `Input.jsx` enforces this via inline style.

---

## 6. Spacing · radii · shadows · motion

### 6.1 Radii

| Element | Class | Value |
|---|---|---|
| Inner cards (StatCard, kanban cards, table cards, list rows) | `rounded-card` | 10px |
| Buttons / inputs / pills (interactive) | `rounded-xl` | 12px |
| Bigger surfaces (modals desktop) | `rounded-2xl` | 16px |
| Modal top (mobile sheet) | `rounded-t-3xl` | 20px |
| Outer shell (rare) | `rounded-shell` | 24px |
| Pills, dots, avatars, sub-second eyebrow chips | `rounded-full` | 9999px |

### 6.2 Shadows

- Resting cards: `shadow-card`
- Hover cards: `shadow-card-hover` + `-translate-y-0.5`
- Modals / floating sheets: `shadow-elevated`
- Glow accents (empty states): `shadow-glow`

### 6.3 Motion

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` exposed as `--ease-out-expo`.
- Durations: 180ms (small), 250ms (default), 350ms (theme/page transitions).
- Global transition rules in `index.css`:

```css
html { transition: background-color 0.35s var(--ease-out-expo), color 0.35s var(--ease-out-expo); }
html * {
  transition-property: background-color, border-color, color, fill, stroke, box-shadow;
  transition-duration: 0.25s;
  transition-timing-function: var(--ease-out-expo);
}
@media (prefers-reduced-motion: reduce) {
  html, html * { transition: none !important; animation: none !important; }
}
```

### 6.4 Safe areas (PWA / mobile)

```jsx
<header style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>…</header>
<nav    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>…</nav>
```

`.safe-top` and `.safe-bottom` utilities in index.css.

---

## 7. Layout shell

### 7.1 Provider stack (App.jsx)

```jsx
<ThemeProvider>
  <ToastProvider>
    <ConfirmProvider>
      <AuthProvider>
        <BusinessProvider>
          <ScrollToTop />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>...</Routes>
          </Suspense>
        </BusinessProvider>
      </AuthProvider>
    </ConfirmProvider>
  </ToastProvider>
</ThemeProvider>
```

### 7.2 TopNav (desktop) — two-row

```jsx
// Row 1: brand wordmark (left) + centered green TreeMate brand pill +
//        search icon + theme toggle + avatar (right)
// Row 2: 8 underline tabs (Home / Schedule / Clients / Jobs / Quotes /
//        Invoices / Analytics / Settings) — active = border-b-2 -mb-px brand-500
```

Brand row left:
- 8×8 rounded-card monogram + wordmark + "BY FIELDSUITE" mono caps subtitle.

Brand row centre:
- A green pill `<Link to="/" className="brand-pill">` containing the trade-icon
  + app name. This is the visual anchor — like a logo lockup floating in
  the header.

Brand row right (in order):
- Search icon button (toggles a ⌘K-aware GlobalSearch dropdown)
- ThemeToggleCompact
- Avatar/account link

Tab underline rule: `border-b-2 -mb-px transition-colors`. The `-mb-px`
hides the tab's own bottom border against the nav's bottom border —
without it you get a 2px gap below the underline.

### 7.3 BottomNav (mobile) — 4 + More

Five slots: 4 primary tabs + a More button that opens MoreSheet. Active
indicator is a 2px brand-500 line at the **TOP** of the active slot.

```js
const PRIMARY = [
  { path: '/',         label: 'Home',     Icon: Home,      end: true },
  { path: '/schedule', label: 'Schedule', Icon: Calendar },
  { path: '/jobs',     label: 'Jobs',     Icon: Briefcase },
  { path: '/clients',  label: 'Clients',  Icon: Users },
]
const MORE_ITEMS = [
  { to: '/quotes',         label: 'Quotes',    description: '…', Icon: FileText, color: 'blue'    },
  { to: '/invoices',       label: 'Invoices',  description: '…', Icon: Receipt,  color: 'amber'   },
  { to: '/recurring-jobs', label: 'Recurring', description: '…', Icon: Repeat,   color: 'cyan'    },
  { to: '/reports',        label: 'Reports',   description: '…', Icon: BarChart3, color: 'violet' },
  { to: '/settings',       label: 'Settings',  description: '…', Icon: Settings,  color: 'gray'   },
]
```

The "More" button highlights when current path matches any overflow item.

### 7.4 MoreSheet

Bottom-sheet portal'd to `document.body` with `rounded-t-3xl`,
`animate-slide-up`, list of remaining nav items each with the icon-box
pattern (10×10 rounded-card tinted bg + tinted icon).

`safe-area-inset-bottom` padding applied so iPhone home indicator doesn't
clip rows.

### 7.5 PageWrapper

Single warm-cream surface (no double-frame). Mobile renders edge-to-edge
on the cream canvas; desktop centres content within `max-w-{lg|2xl|4xl|7xl}`.

```jsx
const WIDTH_CLASSES = {
  default: 'max-w-lg md:max-w-5xl',
  wide:    'max-w-lg md:max-w-7xl',
  full:    'max-w-full',
}

export default function PageWrapper({ children, className = '', width = 'default' }) {
  return (
    <div className={cn('min-h-screen pb-28 md:pb-12 bg-surface animate-fade-in', className)}>
      <div className={cn(WIDTH_CLASSES[width], 'mx-auto md:px-6 md:pt-2')}>
        {children}
      </div>
    </div>
  )
}
```

`pb-28 md:pb-12` is critical — mobile content needs clearance for the fixed
bottom nav + safe-area inset.

### 7.6 Header (per-detail-page only, mobile-prominent)

Sticky top, used on detail pages (ClientDetail, JobDetail, builders, etc).
On the LIST pages we don't render Header on desktop — PageHero takes over.
Pattern:

```jsx
<div className="md:hidden">
  <Header title="…" subtitle="…" back="/jobs" rightAction={…} />
</div>
<div className="hidden md:block">
  <PageHero eyebrow="Jobs board" title="11 active across 7 clients" action={…} />
</div>
```

---

## 8. Core UI primitives

Port in this order. Every page composition downstream assumes they exist.

### 8.1 Card (10px radius, hairline, white-on-cream)

```jsx
export default function Card({ children, className = '', onClick, hover = false, tinted = false, ...props }) {
  const Comp = onClick ? 'button' : 'div'
  const interactive = !!onClick || hover
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'block w-full text-left rounded-card border bg-surface-card border-line p-3.5',
        'transition-all duration-200',
        tinted && 'bg-brand-50 dark:bg-brand-950/30 border-brand-200/40 dark:border-brand-800/40',
        interactive && 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0',
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}
```

Rules:
- Card is **PURE WHITE** (`bg-surface-card`) sitting on the cream page.
- `tinted` prop = brand-50 background (use sparingly — Revenue MTD card,
  highlighted CTA cards).
- Pass `className="!p-0"` to remove padding for cards that wrap a divided
  list (the cn() / tailwind-merge upgrade is what makes `!p-0` actually win).

### 8.2 StatCard

Mono uppercase eyebrow label → big 28px Geist 600 number → optional trend pill.
Top-right corner ghost icon (default `ArrowUpRight`) is an affordance, not a
button — opacity goes 60 → 100 on hover.

Has an animated count-up via `useAnimatedNumber` (counts from 0 over 600ms).
Currency format option for revenue values.

### 8.3 Badge

Five variants (primary / success / warning / danger / info / neutral) PLUS two
filled accents (`success-solid`, `brand-solid`) for high-emphasis "Accepted /
Paid" states. ~10.5px Geist Mono pill, `ring-1 ring-inset` for the tinted edge.

### 8.4 Button

**Four variants only**, three sizes. Uses `lucide-react` icons via
`leftIcon` / `rightIcon` props (pass component refs, not JSX).

```js
const VARIANTS = {
  primary:   'bg-gradient-brand text-white shadow-button hover:shadow-button-hover',
  secondary: 'bg-white text-gray-700 border border-gray-200 shadow-card hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800',
  danger:    'bg-gradient-danger text-white shadow-md hover:brightness-110',
  ghost:     'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
}
const SIZES = {
  sm: 'px-3 py-2 text-xs min-h-[36px]',
  md: 'px-5 py-3 text-sm min-h-tap min-w-tap',
  lg: 'px-6 py-4 text-base min-h-tap',
}
```

Don't add a fifth variant. If you need a tertiary action use `pill-ghost` (see §8.10).

### 8.5 Input / TextArea / Select

Single `.input` base class. `font-size: 16px` enforced inline via
`INPUT_STYLE = { fontSize: '16px' }` so iOS doesn't auto-zoom. Lucide Eye /
EyeOff for the password reveal toggle (built into Input — any `type="password"`
gets it free).

### 8.6 Modal — bottom sheet on mobile, centered on desktop

```jsx
<Modal open={open} onClose={onClose} size="md" zLayer={50}>
  …
</Modal>
```

Properties:
- `zLayer` — defaults to 50. Inner modal uses 60. For triple-nested use 70.
- `createPortal` to `document.body` so modals render above any sticky nav.
- iOS-safe scroll lock — locks `<html>` with `position: fixed` + saved scroll
  position, **not** `body { overflow: hidden }` (which collapses the viewport
  on iOS). The saved scroll restores on close.
- **No `backdrop-blur`** on the overlay — kills Safari perf. Use solid
  `bg-gray-900/40` light / `bg-black/60` dark.
- Drag handle bar visible on mobile only.

### 8.7 ConfirmModal (replaces every `window.confirm`)

Centered icon + title + description + Cancel/Confirm row. `destructive` flag
swaps icon-box red and primary button to danger gradient. `zLayer={60}` by
default so it renders above any open parent modal.

### 8.8 FilterChips

Auto-centring active chip via `scrollIntoView({ behavior: 'smooth', inline: 'center' })`.
Optional count badge per chip. `-mx-4 px-4` lets the row bleed to the screen
edges while keeping buttons clickable inside the padded region.

```jsx
<FilterChips
  options={[
    { value: 'all',     label: 'All',     count: 24 },
    { value: 'active',  label: 'Active',  count: 12 },
  ]}
  value={filter}
  onChange={setFilter}
  ariaLabel="Job status"
/>
```

### 8.9 EmptyState

Big rounded-2xl icon-box with `shadow-glow`, centred title + description
(max-w-xs), optional action button. Never leave a list blank — always
EmptyState.

### 8.10 PageHero

```jsx
<PageHero
  eyebrow="Jobs board"                      // optional — uses .eyebrow utility
  title="11 active across 7 clients"        // dynamic, content-aware
  subtitle={null}                            // usually null when eyebrow is set
  action={<Button>+ New job</Button>}        // right-aligned ghost or primary
/>
```

Title is 26–30px Geist 600 with tracking-tight. The eyebrow lives ABOVE the
title with `mb-1.5`. The action slot is right-aligned and shrink-0.

### 8.11 Pill helpers (utility classes in index.css)

```css
.pill-ghost {
  @apply inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5
         text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors
         dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800;
}
.brand-pill {
  @apply inline-flex items-center gap-2 rounded-full px-4 py-1.5
         text-sm font-semibold text-white shadow-button;
  background: rgb(var(--brand-500));
}
```

`pill-ghost` = secondary action. `brand-pill` = the centered TopNav brand
badge / primary navigation pill.

---

## 9. New primitives unique to this round

### 9.1 ToastProvider + `useToast()`

`src/contexts/ToastContext.jsx`. Replaces every `window.alert()`. 4 variants:
`success / error / warning / info`. Auto-dismiss 4 seconds, manual X.
Bottom-center on mobile, top-right on desktop. Portal'd to body.

```jsx
const toast = useToast()
toast.success('Quote sent')
toast.error('Failed to send', { description: 'Check your network' })
```

Wire `<ToastProvider>` just inside `<ThemeProvider>` in the provider stack.
Sweep all `alert()` calls in the codebase — there should be zero left after
the port. Common spots:
- `DocumentUploader.jsx` — upload error
- Onboarding — upload + create-business errors
- Any try/catch that ends in `alert(err.message)`

### 9.2 Skeleton family

`src/components/ui/Skeleton.jsx` — shimmer-animated placeholders:

```jsx
<Skeleton className="h-4 w-32" />     // single bar
<SkeletonCard />                       // card-shape (eyebrow + value + trend)
<SkeletonList count={5} />             // stack of card placeholders
<SkeletonRow />                        // table row with 4 column bars
<SkeletonStatGrid count={4} />         // KPI grid placeholder
```

Apply on every list page's `loading ? ... : data.length === 0 ? ...` block.
Replaces the old "centered spinner" pattern.

### 9.3 SignaturePad

`src/components/ui/SignaturePad.jsx` — pointer-events canvas. Mouse + touch +
pen unified. High-DPI aware. No external deps.

```jsx
<SignaturePad onSave={(dataUrl) => uploadSignature(dataUrl)} />

{readOnlyUrl && <SignaturePad value={readOnlyUrl} readOnly />}
```

`onSave` receives a transparent PNG dataURL — wire to upload to a private
Supabase storage bucket. `readOnly` mode renders an existing signed URL
on the canvas (used in completed job reports).

NOT yet wired into the actual job-completion flow in TreeMate — primitive is
built, the composition into the flow is left for the next sprint.

### 9.4 AutosaveIndicator

`src/components/ui/AutosaveIndicator.jsx` — small mono pill for builder sticky
headers.

```jsx
const [status, setStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
const [lastSavedAt, setLastSavedAt] = useState(null)

<AutosaveIndicator status={status} lastSavedAt={lastSavedAt} />
```

States: spinner during saving, check during saved, alert during error.
Falls back to relative-time text when idle with last-saved timestamp.

NOT yet wired into QuoteBuilder / InvoiceBuilder — primitive is built, the
debounced-autosave composition is left for next sprint.

### 9.5 Sample report PDF generator

`src/lib/sampleReport.js` — a lazy-loadable jsPDF + autotable generator that
builds a branded sample site-visit/work-report PDF using the live business
form values (name, brand colour, cert/membership, website, email).

Used in Settings → Organisation pane on the "Preview PDF" button. The 390KB
jsPDF + 31KB autotable bundles are lazy-imported on click — they don't ship
on the main JS.

For sibling apps: copy `sampleReport.js` and edit the **content sections** to
match the trade. Tree has species/DBH/height/spread/AS-4373; pest has
chemicals/HSE; fire has BS 8214 11-section pass/fail; etc. The chrome
(brand strip, header, signatures, footer) stays identical.

---

## 10. Page composition patterns

### 10.1 Page skeleton

```jsx
<PageWrapper width="wide">
  {/* Mobile-only Header */}
  <div className="md:hidden">
    <Header title="…" subtitle="…" rightAction={…} />
  </div>

  <div className="px-4 md:px-6 py-5 md:py-6 space-y-5">
    {/* Desktop hero */}
    <div className="hidden md:block">
      <PageHero
        eyebrow="…"
        title="…"
        action={<Button>+ New …</Button>}
      />
    </div>

    {/* Filters */}
    <FilterChips … />

    {/* Content sections */}
    <section className="space-y-3">
      {items.map(x => <RowCard key={x.id} … />)}
    </section>
  </div>
</PageWrapper>
```

### 10.2 Master-detail (Clients, Quotes)

Desktop: 12-col grid. Left col-span-7/8 has the table; right col-span-4/5 has
the detail panel that swaps based on the selected row.

```jsx
<div className="hidden md:grid md:grid-cols-12 gap-4">
  <div className="md:col-span-7 xl:col-span-8 card !p-0 overflow-hidden">
    {/* Table header + rows. Selected row gets bg-brand-50 dark:bg-brand-950/30 */}
  </div>
  <div className="md:col-span-5 xl:col-span-4">
    <div className="card !p-5 sticky top-24">
      {/* Detail panel for the selected row */}
    </div>
  </div>
</div>
```

Mobile collapses to a card grid (no detail pane — tap to navigate to a
detail page instead).

### 10.3 Kanban (Jobs)

Desktop 4 columns. Each column is JUST a header (eyebrow + count + hairline
below) with a stack of white cards inside — **no column container background**.
The column blends into the cream page; only the cards are white. The
"in-progress" column highlights its cards with `bg-surface-3` (deeper cream)
to differentiate.

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
  {columns.map(col => (
    <div key={col.key} className="min-h-[280px]">
      <div className="flex items-center justify-between pb-2 border-b border-line mb-2.5">
        <div className="eyebrow-muted">{col.label}</div>
        <span className="text-[11px] font-mono tabular-nums text-ink-3">{count}</span>
      </div>
      <div className="space-y-2">
        {jobs.map(job => (
          <div className={cn(
            'cursor-pointer rounded-card border p-3',
            tinted ? 'bg-surface-3 border-line' : 'bg-surface-card border-line',
          )}>…</div>
        ))}
      </div>
    </div>
  ))}
</div>
```

### 10.4 Activity feed row

Tiny green dot left + bold message line + relative time muted below + green
category pill on the right. ALL pills use the same `bg-brand-50 text-brand-700`
green tint regardless of category — visual rhythm beats colour-coded variation.

```jsx
<div className="flex items-start gap-2.5">
  <div className="mt-1.5 shrink-0">
    <span className="block w-1.5 h-1.5 rounded-full bg-brand-500" />
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-[13px] font-medium text-ink-1 truncate">{title}</p>
    <p className="text-[11.5px] text-ink-3 mt-0.5">{relativeTime(created_at)}</p>
  </div>
  <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-[10.5px] font-mono font-medium tracking-tight">
    {pillLabel}
  </span>
</div>
```

### 10.5 Today rows (Dashboard)

Label left + count in a subtle gray pill on the right. **No bottom borders
between rows.**

```jsx
<div className="flex items-center justify-between py-1">
  <span className="text-[13px] text-ink-2">Scheduled</span>
  <span className="inline-flex items-center justify-center min-w-[26px] px-1.5 py-0.5 rounded-full bg-surface-3 text-[11px] font-mono font-medium tabular-nums text-ink-2">
    3
  </span>
</div>
```

### 10.6 Table column rule

Every table-style row uses `grid grid-cols-12 gap-3` — `gap-3` is mandatory
to stop the Value column from squishing against the State pill. `text-right`
on numeric columns is fine; just give them their own gap-padded space first.

---

## 11. Page-level rebuilds

### 11.1 Dashboard

Layout:
1. **PageHero** (eyebrow `Good morning`, title = business name, subtitle =
   pithy line, action = `+ New job`)
2. **KPI strip** — 4 StatCards (Jobs this week / Active jobs / Pending quotes / Overdue)
3. **Row 2** (3-col grid): col-span-2 Revenue MTD card (eyebrow
   "REVENUE (MONTH TO DATE)" + big tabular number) + col-span-1 Clients card
   (counts + Open CRM link)
4. **Row 3** (3-col grid): col-span-1 Today card (Scheduled / Completed / Overdue
   rows with gray pill counts + "Open schedule →" link) + col-span-2 Recent
   Activity card (green dot + bold message + relative time + green pill on right)

### 11.2 Schedule

Default view on **desktop is `week`**, mobile is `today`:
```jsx
const [view, setView] = useState(() =>
  typeof window !== 'undefined' && window.innerWidth >= 768 ? 'week' : 'today'
)
```

PageHero on desktop shows the week date range as title with eyebrow
"WEEK VIEW". The action slot contains:
- ‹ Prev / This week / Next › ghost pills
- Tiny `Week | Day | Map` selector (gray-900 active, ink-3 inactive)

Desktop week grid is one big white card with internal 7-column dividers:
- Day headers row (mono caps day-of-week + bold day number — today is
  brand-coloured)
- Day cells row (min-h-[180px], job blocks with brand-500 left border + brand-50
  tinted background + mono accent time)

Below the week grid, a TODAY list card with eyebrow + count, and rows of
mono-time / title / address / state pill on the right.

Mobile keeps the stacked-by-day list with a different view-toggle pill strip
at the top.

### 11.3 Jobs

Default view on **desktop is `pipeline` (kanban)**:
```jsx
const [viewMode, setViewMode] = useState(() =>
  typeof window !== 'undefined' && window.innerWidth >= 768 ? 'pipeline' : 'list'
)
```

PageHero: eyebrow `Jobs board`, title `${active} active across ${distinctClients} client${s}`,
action = `Board / List` toggle ghost pill + `+ New job` primary.

4 kanban columns: Quoted / Scheduled / In progress / Done · awaiting invoice.
See §10.3 for column structure. Each card shows mono ref (TM-XXXX),
bold title, client name, mono value-or-date + age-or-crew.

Mobile keeps the FilterChips + list-view rendering for one-thumb scrolling.

### 11.4 Clients

Master-detail on desktop (see §10.2). Left table: Client / Type / Sites /
YTD spend, with a 1.5×1.5 brand-500 dot indicator on "hot" clients (have an
active or quoted job). Right detail panel: client name, badge, KPI grid
(Sites / YTD spend), recent jobs list, "Open profile →" link.

Mobile collapses to card grid (existing behaviour).

### 11.5 Quotes

Master-detail. Left table: REF / CLIENT / WORK / VALUE / STATE pill / age.
Right detail card has the **trade-domain meta grid** — for trees:
```
SPECIES / DBH / HEIGHT / SPREAD / AS 4373 PRUNE CODE / HAZARDS
```
Plus warning-tone hazard pills (Power lines / Heritage status / etc),
line items table, big TOTAL in accent green.

For sibling apps: keep the meta-grid + line items + total structure, swap
the field labels to match the trade. Per-trade fields suggested in §13.

### 11.6 Invoices

3-card summary strip at top: Paid this month (Healthy badge) / Outstanding
(Pending) / Overdue (Action red).

Below it, a single white card containing the invoice table — `grid grid-cols-12 gap-3`:
- col-span-2 REF (mono accent)
- col-span-3 CLIENT
- col-span-2 VALUE (tabular)
- col-span-3 STATE pill
- col-span-2 PAID date (right-aligned mono)

### 11.7 Analytics (was Reports)

4 KPI cards with mono delta indicators (`+12% vs Mar`).

Middle row: 6-month bar chart (last bar in accent green, value label above) +
revenue mix progress bars per category.

Bottom: crew leaderboard table with mono rank `01/02/03` + name + role +
job count + total billed.

Hand-rolled SVG chart is fine (no library required) — if the app uses
recharts, keep it but match the visual end-state.

---

## 12. Settings — nested-route shell

This is the **architectural change** that makes Settings feel like a single
app rather than 8 separate pages.

### 12.1 Routes (App.jsx)

```jsx
<Route path="/settings" element={<Settings />}>
  <Route index                  element={<SettingsOrganisationPane />} />
  <Route path="branding"        element={<SettingsBrandingPane />} />
  <Route path="compliance"      element={<SettingsCompliancePane />} />
  <Route path="staff"           element={<Staff />} />
  <Route path="equipment"       element={<EquipmentLibrary />} />
  <Route path="templates"       element={<CommunicationTemplates />} />
  <Route path="job-types"       element={<JobTypeTemplates />} />
  <Route path="automations"     element={<Automations />} />
  <Route path="surveys"         element={<SurveyResults />} />
  <Route path="integrations"    element={<Integrations />} />
  <Route path="import"          element={<ImportData />} />
  <Route path="billing"         element={<Subscription />} />
</Route>
```

Old `/subscription` redirects to `/settings/billing`.

### 12.2 Settings.jsx is now a layout

- Persistent left sidebar (`md:col-span-3`), NavLink with active highlight
  (`bg-brand-50 dark:bg-brand-950/40 text-brand-700`).
- Right pane (`md:col-span-9 card !p-6`) wraps `<Suspense fallback>` around
  `<Outlet />`.
- Sign-out footer at the bottom of every pane.
- PageHero title swaps to the active sidebar item label.

### 12.3 Sub-pages stripped of chrome

Each existing `/settings/*` sub-page must lose its `<PageWrapper>` and
`<Header>` wrappers — they render INSIDE the right pane card. They still own
their own `<ConfirmModal>`, `<Modal>`, `<EmptyState>`, etc.

Use `scripts/strip-settings-chrome.mjs` (preserved in TreeMate repo) to do
the mechanical removal — but expect 1-2 files to need a manual fix-up because
the regex over-strips when a Header has nested SVG content. The
`scripts/fix-settings-orphans.mjs` script catches the common orphan pattern.

### 12.4 Mobile behaviour

Settings.jsx on mobile shows a row-link card list at `/settings` root. When
on a sub-route (`/settings/staff`, etc), mobile shows the Outlet directly
(full-bleed sub-page) with the Settings Header back-button.

```jsx
const onSettingsRoot = location.pathname === '/settings'

{!onSettingsRoot && (
  <div className="md:hidden">
    <Suspense fallback={…}><Outlet /></Suspense>
  </div>
)}

<div className={cn('md:hidden space-y-4', !onSettingsRoot && 'hidden')}>
  {/* row-link card list */}
</div>
```

### 12.5 Pane-owned save buttons

The active pane manages its own dirty state and Save button. The Settings
layout has no global Save (we tried — it created confusion about which form
was being saved).

Pattern in OrganisationPane:
```jsx
const dirty = initial && Object.keys(form).some(k => form[k] !== initial[k])
const [saving, setSaving] = useState(false)

const handleSave = async () => {
  if (!dirty || saving) return
  setSaving(true)
  const { error } = await updateBusiness(form)
  setSaving(false)
  if (error) toast.error('Could not save', { description: error.message })
  else { toast.success('Saved'); setInitial(form) }
}

<button disabled={!dirty || saving} onClick={handleSave}>
  {saving ? <><Loader2 className="animate-spin" /> Saving…</>
   : dirty ? 'Save changes'
   : <><Check /> Saved</>}
</button>
```

---

## 13. Domain-specific fields (per app)

Each *Mate app has its own quote-detail meta grid. The structure stays
identical (4-6 mono caps labels above bold values) — only the content swaps.

| App | Quote-detail meta fields | Cert / standard |
|---|---|---|
| **TreeMate** (built) | species · DBH · height · spread · AS 4373 prune code · hazards array | AS 4373 |
| **PoolMate** | pool size · chemistry readings (free Cl, total Cl, pH, ALK, CYA) · sanitiser type · last service | PWTAG · HSG282 |
| **PestMate** | bait points · target species · chemicals + HSE numbers · BPCA-aware notes | BPCA · BRCGS |
| **FireMate** | door ref · floor · rating (FD30/30S/60/60S/90/120) · BS 8214 11-section pass/fail · re-inspection due | BS 8214:2016 |
| **HygieneMate** | zone · ATP swab spec · TR/19 extraction · BICSc category · chemicals traceability | BICSc · TR/19 |
| **LocksmithMate** | BS 3621 lock spec · TS 007 cylinder · property type · turnover ref | MLA · BS 3621 · TS 007 |

DB columns to add to the `quotes` table per app — the migration runner script
(see TreeMate `scripts/migrate.js`) handles idempotent ALTER TABLE.

For TreeMate added: `species`, `dbh`, `height`, `spread`, `hazards JSONB`,
`prune_code`, `site_address`. Mirror the equivalent for each sibling.

---

## 14. Sweeps — alert() → toast, confirm() → ConfirmModal, photo inputs

Three mechanical sweeps that should net zero `alert()` and zero
`window.confirm()` in the codebase after the port.

### 14.1 alert() → toast

Search: `\balert\s*\(`. Replace each call with `toast.error(...)` /
`toast.success(...)` / `toast.info(...)`. Use `description` for the second
line where the original alert had a multi-part message.

### 14.2 confirm() → ConfirmModal or useConfirm

Search: `\bconfirm\s*\(`. Two patterns to handle:

**Pattern A — single-button delete:**
```jsx
// before
<button onClick={() => { if (confirm('Delete?')) handleDelete(id) }}>…</button>

// after — state-driven ConfirmModal
const [deleteId, setDeleteId] = useState(null)
<button onClick={() => setDeleteId(id)}>…</button>

<ConfirmModal
  open={!!deleteId}
  onClose={() => setDeleteId(null)}
  title="Delete this …?"
  description="This cannot be undone."
  destructive
  confirmLabel="Delete"
  onConfirm={async () => { await handleDelete(deleteId) }}
/>
```

**Pattern B — mid-flow `if (!confirm(...)) return`:**
Use the `useConfirm()` hook from `src/contexts/ConfirmContext.jsx` — it
returns a Promise<boolean> for inline-await:

```jsx
const confirm = useConfirm()
const ok = await confirm({
  title: 'Quote already accepted',
  description: 'Send an amended quote?',
  confirmLabel: 'Send amended',
})
if (!ok) return
```

`<ConfirmProvider>` wraps just inside `<ToastProvider>` in the provider stack.

### 14.3 Camera-direct photo capture

Every `<input type="file" accept="image/*">` that's used for capturing job-site
or evidence photos should add `capture="environment"` so the rear camera
opens directly on phones (no file picker step).

Pages that need it: NewJobReport, JobDetailView, settings/Staff (avatar), and
DocumentUploader (which now accepts a `capture` prop).

NOT needed on logo upload / file imports / generic uploads.

---

## 15. Sample report PDF generator

`src/lib/sampleReport.js`. Lazy-import on click:

```jsx
const handlePreviewPDF = async () => {
  setGeneratingPDF(true)
  try {
    const { generateSampleReportPDF } = await import('../../../lib/sampleReport')
    const url = await generateSampleReportPDF(form)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    toast.error('Could not generate PDF', { description: err?.message })
  } finally {
    setGeneratingPDF(false)
  }
}
```

The generator uses `business.brand_colour`, `business.name`,
`business.cert_membership`, `business.website`, `business.email` to render
a branded sample. Modify the content sections per app to match the trade.

This proves the brand colour pipeline: change colour → save → preview PDF →
strip + monogram + total all render in the new colour.

For real production PDFs (actual quotes, invoices, job reports), the same
generator pattern can be hoisted into `quotes.js` / `invoices.js` /
`reports.js` lib files and wired into `send-quote` / `send-invoice` /
`complete-job-report` edge functions. That's flow work, not visual-refresh
work — left for a separate sprint.

---

## 16. Things NOT to do

1. **Don't use mint canvas + cream shell.** Tried it; it made the cards
   look like cream-on-cream. Use single warm-cream surface (`--surface
   = 248 246 239`) with PURE WHITE cards on top.
2. **Don't use 16px on inner cards.** `rounded-card` (10px) reads as
   "professional tool", `rounded-2xl` (16px) reads as "consumer app".
3. **Don't use sharp corners.** Minimum `rounded-card` on inputs / cards / buttons.
4. **Don't introduce a 5th button variant.** primary / secondary / danger / ghost
   is enough. If you need a tertiary, use `pill-ghost`.
5. **Don't use raw black or pure white in light-mode text.** Top out at
   `var(--ink-1)` for darkest, `var(--ink-4)` for lightest muted.
6. **Don't use shadows other than the defined tokens.** card / card-hover /
   elevated / nav / glow / glow-lg / soft-lift / button / button-hover.
7. **Don't put more than 4+1 items in BottomNav.** 4 primary + More.
8. **Don't forget `pb-28 md:pb-12` on PageWrapper** — mobile content will
   hide under the bottom nav.
9. **Don't use `backdrop-blur` inside Modal overlays** — Safari perf dies.
   Solid `bg-gray-900/40` / `bg-black/60` only.
10. **Don't use `body { overflow: hidden }` for modal scroll lock on iOS** —
    it collapses the viewport. Use `<html style="position: fixed">` + saved
    scroll position. The Modal.jsx primitive does this correctly already.
11. **Don't use `window.alert` / `window.confirm` / `window.prompt`** for
    anything user-facing. Always toast / ConfirmModal / styled prompt.
12. **Don't import framer-motion or any animation library.** Tailwind
    transitions + custom easing handle everything.
13. **Don't forget `min-h-tap` / `min-w-tap` on interactive elements.** iOS
    HIG minimum 44px.
14. **Don't use `rounded-full` on buttons.** Only for pills, badges, dots,
    nav indicators.
15. **Don't hardcode brand colours.** Always use `brand-*` Tailwind tokens
    backed by CSS variables.
16. **Don't skip the FOUC script.** A theme flash on every reload is the
    single most visible "cheap app" tell.
17. **Don't put the global Save button in the Settings layout PageHero.**
    Each pane manages its own dirty state and Save. Tried it; created
    confusion about which form would save.
18. **Don't render the kanban column as a tinted card container.** Columns
    are transparent; only the JOB CARDS inside them are white. Otherwise
    you get cream-on-cream cards that don't read.
19. **Don't put `text-right` on a numeric column without `gap-3` on the
    grid row.** The number squishes against the next column (we hit this
    with Invoices Value/State).
20. **Don't load jsPDF / heavy libs eagerly.** Lazy-import on demand —
    `await import('./sampleReport')` only when the user clicks Preview PDF.

---

## 17. Hard-won field lessons

- **`backdrop-blur` inside Modals** lags badly on iOS Safari. Solid backdrop only.
- **iOS `body` scroll lock breaks**, html `position: fixed` + saved Y works.
- **iOS input zoom**: any input < 16px font-size triggers auto-zoom. `.input` enforces 16px inline.
- **CSS-variable brand colours** are essential for dark mode and per-app theming.
  Don't try to do it with Tailwind classes alone — you'd duplicate every component.
- **Inline FOUC script** must be the FIRST thing in `<head>`. Deferring to
  React mount flashes the wrong theme on every reload.
- **Three-mode theme toggle beats two-mode** in Settings — gives the user
  respect for their OS preference while still letting them override.
- **`scrollIntoView({ inline: 'center' })`** on active chip change in
  FilterChips is the tiny detail that makes the strip feel considered.
- **Nav active state**: underline border (`border-b-2 -mb-px border-brand-500`)
  on desktop tabs beats pill-bg, text-only, and dot-below. On mobile bottom
  nav, the 2px top line wins.
- **`!p-0` on Cards that wrap divided lists** — needs `cn = clsx + tailwind-merge`
  to actually win. The hand-rolled `classes.filter().join()` cn won't override.
- **Tabular numerals on body** is one CSS line that makes prices, counts,
  and stats look professional.
- **Geist Mono with `ss01`/`ss02` feature settings + tight tracking** is
  what gives refs and prices their editorial feel. Don't drop these.
- **Eyebrow + 18×1px line prefix + accent green** is THE FieldSuite signature.
  More distinctive than the colour itself.
- **Default-to-week-on-desktop for Schedule** matches user mental model on a
  big screen. Phone gets Today by default. Use a width check in
  `useState(() => …)` initialiser.
- **Default-to-pipeline-on-desktop for Jobs** for the same reason. Phone
  list view, desktop kanban.
- **Toast + ConfirmModal sweeps must be mechanical** — find every `alert()`
  / `confirm()` and replace. Half-done sweeps are worse than not doing them.
- **Strip-and-fix scripts** are useful for batch settings sub-page chrome
  removal but expect manual cleanup in 1-2 files where the regex breaks.
  Keep both scripts in `scripts/` for the next port.
- **Lazy-loaded PDF chunk** keeps main bundle slim. The 390KB + 31KB jsPDF
  bundles only load on click. Verify in `vite build` output.
- **Pane-owned save buttons** beat layout-level save buttons. Each pane is
  its own form context.
- **Settings sidebar should highlight the active item with `bg-brand-50
  text-brand-700 font-medium`** — NOT a chevron arrow. The active background
  is the affordance.

---

## 18. Port checklist (in-order)

Verify the app builds + runs after each step. Don't batch.

1. **Install deps**: `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`,
   `lucide-react`, `clsx`, `tailwind-merge`, `jspdf`, `jspdf-autotable`.
   (Inter + JetBrains Mono should already be there — keep as fallback.)
2. **Update `tailwind.config.js`** with §3.2 — `darkMode: 'class'`, brand-*
   CSS-var consumer, `font-sans` Geist Variable + fallbacks, radii (card 10px,
   shell 24px), shadow set, gradient-page swapped to warm cream stack,
   animations.
3. **Update `src/index.css`** — `:root` with `--surface`/`--surface-2`/
   `--surface-3`/`--surface-card` RGB triplets, brand-* triplets,
   `--canvas`/`--shell` legacy aliases, ink/line tokens, `.dark` overrides,
   global transitions w/ `--ease-out-expo`, `.eyebrow`/`.eyebrow-muted`/
   `.section-title`/`.input`/`.card`/`.card-interactive`/`.btn-*`/`.pill-ghost`/
   `.brand-pill`/`.scrollbar-none`, `.bg-surface*` utilities.
4. **Add fonts to `main.jsx`**: imports at top.
5. **Add FOUC script** to `index.html` `<head>` (use app-specific storage key
   like `poolmate:theme-mode` etc).
6. **Add ThemeContext, ToastContext, ConfirmContext** at
   `src/contexts/`. Wrap providers in App.jsx — `<ThemeProvider><ToastProvider>
   <ConfirmProvider><AuthProvider><BusinessProvider>`.
7. **Upgrade `cn()` utility** to `clsx + tailwind-merge` if not already.
8. **Port primitives in this order:** Card → Badge → Button → Input/TextArea/Select →
   Modal (with zLayer + portal + iOS scroll lock) → ConfirmModal → FilterChips →
   EmptyState → StatCard → PageHero → Skeleton family → SignaturePad →
   AutosaveIndicator. After each, swap its usages on at least ONE page and verify.
9. **Port ThemeToggle (Compact + Full + onBrand variant) + GlobalSearch**.
   GlobalSearch is per-app — adapt the parallel-query block to whatever
   entities the trade has (clients/jobs/quotes/invoices/pools/doors/etc).
10. **Build the layout shell**: Header → TopNav (two-row brand pill +
    underline tabs) → BottomNav (4 + More) → MoreSheet → PageWrapper.
11. **Sweep `window.confirm` → ConfirmModal/useConfirm**. Should net 0 left.
12. **Sweep `alert()` → toast**. Should net 0 left.
13. **Add `capture="environment"`** to every photo-capture file input.
14. **Rebuild Settings** per §12 — nested-route shell, sidebar + Outlet,
    strip PageWrapper+Header from sub-pages, build Organisation/Branding/
    Compliance panes.
15. **Rebuild each list page** per §11 in priority order: Dashboard →
    Schedule → Jobs (kanban) → Clients (master-detail) → Quotes (master-detail
    + trade meta grid) → Invoices (3-card summary + table) → Analytics.
16. **Add the trade-specific quote-detail fields** per §13 — DB migration
    + form fields in QuoteBuilder + display in the Quotes detail panel.
17. **Wire Sample Report PDF** in Settings → Organisation pane. Adapt the
    content sections of `sampleReport.js` to the trade.
18. **Real PWA icons** — replace placeholders with the trade monogram in
    192/512/maskable variants.
19. **Smoke-test in light + dark** at 375px and 1280px:
    - Header, tabs, page content, bottom nav all render correctly.
    - FilterChips centre the active chip on change.
    - Modals bottom-sheet on mobile, centre on desktop, no Safari blur jank.
    - Focus rings visible on all interactive elements.
    - ⌘K opens GlobalSearch from anywhere.
    - Toast pops on save success / error / upload error.
    - ConfirmModal replaces every native confirm.
    - Sample Report PDF generates with live brand colour.
    - No console errors, no layout jumps, no FOUC on reload.

---

## 19. Reference files (in TreeMate repo)

When in doubt, copy-paste from these. All paths relative to TreeMate root.

| What | Path |
|---|---|
| Tailwind config | `tailwind.config.js` |
| Global CSS (tokens + utilities) | `src/index.css` |
| FOUC script + HTML head | `index.html` |
| `cn()` utility | `src/lib/utils.js` |
| ThemeContext | `src/contexts/ThemeContext.jsx` |
| ToastContext + useToast | `src/contexts/ToastContext.jsx` |
| ConfirmContext + useConfirm | `src/contexts/ConfirmContext.jsx` |
| TopNav (two-row, brand pill, underline tabs) | `src/components/layout/TopNav.jsx` |
| BottomNav (4 + More) | `src/components/layout/BottomNav.jsx` |
| MoreSheet | `src/components/layout/MoreSheet.jsx` |
| PageWrapper | `src/components/layout/PageWrapper.jsx` |
| Header (per-detail-page) | `src/components/layout/Header.jsx` |
| PageHero | `src/components/layout/PageHero.jsx` |
| ThemeToggleCompact + Full + onBrand | `src/components/layout/ThemeToggle.jsx` |
| GlobalSearch | `src/components/layout/GlobalSearch.jsx` |
| Card / Badge / Button / Input / Modal / ConfirmModal / FilterChips / EmptyState / StatCard | `src/components/ui/` |
| Skeleton family | `src/components/ui/Skeleton.jsx` |
| SignaturePad | `src/components/ui/SignaturePad.jsx` |
| AutosaveIndicator | `src/components/ui/AutosaveIndicator.jsx` |
| ActivityPanel (green dot + relative time + green pill) | `src/components/ui/ActivityPanel.jsx` |
| Sample report PDF generator | `src/lib/sampleReport.js` |
| Dashboard layout | `src/pages/Dashboard.jsx` |
| Schedule (week grid + today list) | `src/pages/Schedule.jsx` |
| Jobs (kanban + list) | `src/pages/Jobs.jsx` |
| Clients (master-detail) | `src/pages/Clients.jsx` |
| Quotes (master-detail + trade meta) | `src/pages/Quotes.jsx` |
| Invoices (summary + table) | `src/pages/Invoices.jsx` |
| Analytics | `src/pages/Reports.jsx` |
| Settings layout (sidebar + Outlet) | `src/pages/settings/Settings.jsx` |
| OrganisationPane (dirty-aware Save + hex input + PDF) | `src/pages/settings/panes/OrganisationPane.jsx` |
| BrandingPane / CompliancePane | `src/pages/settings/panes/` |
| Routes config | `src/App.jsx` |
| Strip-settings-chrome script | `scripts/strip-settings-chrome.mjs` |
| Fix-settings-orphans script | `scripts/fix-settings-orphans.mjs` |
| Dark-mode sweep script | `scripts/dark-mode-sweep.mjs` |
| Dedupe dark-classes script | `scripts/dedupe-dark-classes.mjs` |

---

## 20. One-paragraph summary

Replace the target app's visual layer with: warm-cream surface tokens
(`#f8f6ef` page, pure-white cards on top, no double-frame), CSS-variable-driven
brand RGB triplets, class-based dark mode with FOUC-safe init script, Geist
Variable + Geist Mono with tabular numerals, `rounded-card` 10px / `rounded-xl`
12px shapes with soft multi-layer shadows, a two-row sticky TopNav (brand
wordmark + centered green brand pill + search/theme/avatar above 8 underline
tabs), a 4-slot mobile BottomNav with a More sheet, a kanban Jobs board and
master-detail Clients/Quotes layouts, mono-accent eyebrow with a 18×1px line
prefix above every page title, a 4-variant Button + 5-variant Badge + 10.5px
mono pills, a Toast + Skeleton + SignaturePad + AutosaveIndicator primitive
set, a Settings sidebar+Outlet shell that swaps panes in place without page
jumps, an Organisation pane that's actually wired (form state + dirty Save +
hex input + lazy-loaded sample PDF generator), and a clean sweep of every
`alert()` and `window.confirm` → toast / ConfirmModal. Everything else in the
target — its routes, data hooks, auth, business logic, edge functions —
stays untouched.

**Tagline:** *Warm cream surfaces. Pure white cards. Mono accent eyebrows.
Geist everywhere. Nothing fancier than it needs to be.*
