import { format } from 'date-fns'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ── Class Names ──────────────────────────────────────────────────────────────
// clsx handles conditionals; tailwind-merge resolves conflicts so later classes
// win (e.g. cn('p-4', '!p-0') → 'p-0').
export function cn(...args) {
  return twMerge(clsx(...args))
}

// ── Date Formatting (Australian) ─────────────────────────────────────────────
export function formatDate(date) {
  if (!date) return ''
  return format(new Date(date), 'dd/MM/yyyy')
}

export function formatDateTime(date) {
  if (!date) return ''
  return format(new Date(date), 'dd/MM/yyyy HH:mm')
}

// ── Currency (AUD) ───────────────────────────────────────────────────────────
export function formatCurrency(amount) {
  if (amount == null) return ''
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount)
}

// ── GST (10% Australian) ────────────────────────────────────────────────────
export function calculateGST(subtotal) {
  const gst = subtotal * 0.1
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    total: Math.round((subtotal + gst) * 100) / 100,
  }
}

// ── Job Pipeline ────────────────────────────────────────────────────────────
export const JOB_STATUSES = [
  'enquiry', 'site_visit', 'quoted', 'approved',
  'scheduled', 'in_progress', 'completed', 'invoiced', 'paid',
]

export const JOB_PRIORITIES = ['normal', 'urgent', 'emergency']

export const ESTIMATED_DURATIONS = [
  { value: 'half_day', label: 'Half Day' },
  { value: 'full_day', label: 'Full Day' },
  { value: 'two_days', label: '2 Days' },
  { value: 'three_plus', label: '3+ Days' },
]

export const PRIORITY_STYLES = {
  normal:    { bg: '', text: '' }, // no badge for normal
  urgent:    { bg: 'bg-amber-100', text: 'text-amber-700' },
  emergency: { bg: 'bg-red-100', text: 'text-red-700' },
}

// ── Status Colours (Tailwind) ────────────────────────────────────────────────
const STATUS_STYLES = {
  // Job pipeline statuses
  enquiry:        { bg: 'bg-purple-100 text-purple-700',   dot: 'bg-purple-500' },
  site_visit:     { bg: 'bg-sky-100 text-sky-700',         dot: 'bg-sky-500' },
  quoted:         { bg: 'bg-indigo-100 text-indigo-700',   dot: 'bg-indigo-500' },
  approved:       { bg: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-500' },
  scheduled:      { bg: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
  in_progress:    { bg: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
  completed:      { bg: 'bg-green-100 text-green-700',     dot: 'bg-green-500' },
  invoiced:       { bg: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-500' },
  paid:           { bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  // Legacy
  on_hold:        { bg: 'bg-gray-100 text-gray-700',    dot: 'bg-gray-400' },
  // Quote statuses
  draft:          { bg: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
  sent:           { bg: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  viewed:         { bg: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  follow_up:      { bg: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  accepted:       { bg: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  declined:       { bg: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
  // Client pipeline stages
  lead:           { bg: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  active:         { bg: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  lost:           { bg: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
  // Tree health
  healthy:        { bg: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  declining:      { bg: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  dead:           { bg: 'bg-gray-200 text-gray-700',     dot: 'bg-gray-500' },
  hazardous:      { bg: 'bg-red-100 text-red-700',       dot: 'bg-red-600' },
  storm_damaged:  { bg: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  // Invoice statuses
  overdue:        { bg: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
}

const DEFAULT_STYLE = { bg: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }

export function statusColor(status) {
  return (STATUS_STYLES[status] || DEFAULT_STYLE).bg
}

export function statusDot(status) {
  return (STATUS_STYLES[status] || DEFAULT_STYLE).dot
}

export function statusLabel(status) {
  if (!status) return ''
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Constants ────────────────────────────────────────────────────────────────

export const SITE_TYPES = ['residential', 'commercial', 'rural', 'council', 'strata', 'roadside']
export const SITE_ACCESS = ['easy', 'moderate', 'difficult', 'crane_required']
export const HAZARDS = ['power_lines', 'structures_nearby', 'steep_slope', 'confined_space', 'heritage_tree', 'protected_species', 'asbestos_fence']
export const MAINTENANCE_FREQUENCIES = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'biannual', 'annual']
export const PHOTO_TAGS = ['before', 'during', 'after', 'hazard', 'stump', 'equipment']
export const HEALTH_CONDITIONS = ['healthy', 'declining', 'dead', 'hazardous', 'storm_damaged']
export const ACTIONS_TAKEN = ['removed', 'pruned', 'lopped', 'stump_ground', 'treated', 'assessed_only']
export const STAFF_ROLES = ['arborist', 'climber', 'groundsman', 'operator', 'manager', 'owner']
export const PIPELINE_STAGES = ['lead', 'quoted', 'active', 'on_hold', 'lost']

export const DEFAULT_TASKS = [
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

export const SUGGESTED_JOB_TYPES = [
  { name: 'Tree Removal', description: 'Complete removal of tree including trunk sections', default_tasks: ['Set up exclusion zone', 'Check for hazards & services', 'Plan fall direction', 'Remove branches in sections', 'Fell trunk', 'Cut into manageable sections', 'Chip branches', 'Stack/remove timber', 'Clean up site'], estimated_duration_minutes: 240, color: '#22C55E' },
  { name: 'Stump Grinding', description: 'Grind stump below ground level', default_tasks: ['Locate underground services', 'Clear area around stump', 'Grind stump to depth', 'Collect grindings', 'Backfill hole', 'Level ground', 'Clean up debris'], estimated_duration_minutes: 90, color: '#92400E' },
  { name: 'Tree Pruning', description: 'Selective pruning for health, clearance, or aesthetics', default_tasks: ['Assess tree structure', 'Identify branches to remove', 'Set up work zone', 'Prune to Australian Standard AS4373', 'Shape canopy', 'Chip branches', 'Clean up'], estimated_duration_minutes: 120, color: '#16A34A' },
  { name: 'Hedge Trimming', description: 'Trim and shape hedges to desired height and form', default_tasks: ['Assess hedge condition', 'Set up drop sheets', 'Trim to height', 'Shape sides', 'Collect clippings', 'Clean up', 'Dispose of green waste'], estimated_duration_minutes: 60, color: '#65A30D' },
  { name: 'Emergency Storm Damage', description: 'Urgent response for storm-damaged trees', default_tasks: ['Assess hazards', 'Secure area', 'Remove fallen limbs', 'Make safe hanging branches', 'Clear access ways', 'Remove debris', 'Document damage', 'Tarp/secure if needed'], estimated_duration_minutes: 180, color: '#DC2626' },
  { name: 'Site Assessment / Quote', description: 'Initial visit to assess trees and provide a quote', default_tasks: ['Inspect trees', 'Measure trunk diameters', 'Estimate heights', 'Check access', 'Identify hazards', 'Take photos', 'Discuss with client', 'Prepare quote'], estimated_duration_minutes: 45, color: '#0EA5E9' },
  { name: 'Land Clearing', description: 'Clear vegetation from a designated area', default_tasks: ['Survey site boundaries', 'Check for protected species', 'Mark exclusion zones', 'Remove undergrowth', 'Fell trees', 'Grind stumps', 'Chip all material', 'Grade and level'], estimated_duration_minutes: 480, color: '#D97706' },
  { name: 'Palm Cleaning', description: 'Remove dead fronds and seed pods from palms', default_tasks: ['Set up access equipment', 'Remove dead fronds', 'Remove seed pods', 'Trim skirt', 'Clean trunk', 'Collect debris', 'Dispose of waste'], estimated_duration_minutes: 60, color: '#059669' },
]

export const SUGGESTED_EQUIPMENT = [
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

export const EQUIPMENT_CATEGORIES = [
  { value: '', label: 'No category' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'grinding', label: 'Grinding' },
  { value: 'chipping', label: 'Chipping' },
  { value: 'lifting', label: 'Lifting / Access' },
  { value: 'transport', label: 'Transport' },
  { value: 'safety', label: 'Safety' },
  { value: 'other', label: 'Other' },
]

export const CATEGORY_COLORS = {
  cutting: 'bg-tree-100 text-tree-700',
  grinding: 'bg-amber-100 text-amber-700',
  chipping: 'bg-emerald-100 text-emerald-700',
  lifting: 'bg-blue-100 text-blue-700',
  transport: 'bg-cyan-100 text-cyan-700',
  safety: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-700',
}
