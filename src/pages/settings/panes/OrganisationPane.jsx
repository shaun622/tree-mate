import { useBusiness } from '../../../hooks/useBusiness'
import { useAuth } from '../../../hooks/useAuth'
import { cn } from '../../../lib/utils'

const BRAND_SWATCHES = [
  { value: '#22c55e', name: 'Tree green' },
  { value: '#16a34a', name: 'Forest' },
  { value: '#0ea5e9', name: 'Sky' },
  { value: '#f97316', name: 'Orange' },
  { value: '#dc2626', name: 'Red' },
  { value: '#0b0b0d', name: 'Black' },
]

export default function OrganisationPane() {
  const { business } = useBusiness()
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-2">Branding · what your customers see</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
          <Field label="Trading name" value={business?.name || ''} placeholder="Your Tree Services Ltd" />
          <Field label="Domain"        value={business?.website || ''} placeholder="yourtree.com.au" />
          <Field label="Cert / membership" value={business?.cert || 'Arboricultural Assoc · #4471'} />
          <Field label="Public email"  value={business?.email || user?.email || ''} />
        </div>
      </div>

      <div>
        <div className="eyebrow mb-2">Brand colour · used on PDFs, the customer portal, your invoices</div>
        <div className="flex items-center gap-2 mt-3">
          {BRAND_SWATCHES.map(c => (
            <button
              key={c.value}
              className={cn(
                'w-9 h-9 rounded-card border-2 transition-all',
                c.value === '#22c55e' ? 'border-ink-1 ring-2 ring-brand-200/50' : 'border-line hover:border-ink-3',
              )}
              style={{ backgroundColor: c.value }}
              aria-label={c.name}
            />
          ))}
          <span className="ml-3 text-[12px] font-mono text-ink-3 tabular-nums">Selected · #22c55e</span>
        </div>
      </div>

      <div>
        <div className="eyebrow mb-2">Sample report preview</div>
        <div className="card !p-4 flex items-center justify-between mt-3 cursor-pointer hover:shadow-card-hover">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-card bg-gradient-brand flex items-center justify-center text-white font-bold">
              {business?.name?.charAt(0) || 'T'}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-brand-600 dark:text-brand-400">AS 4373 ready certified</div>
              <div className="text-[14px] font-semibold text-ink-1 mt-0.5 truncate">{business?.name || 'Your Tree Services Ltd'}</div>
              <div className="text-[11.5px] text-ink-3">Site visit report · 28 Apr 2026 · REF TM-2041</div>
            </div>
          </div>
          <span className="pill-ghost text-[12px] shrink-0">Open PDF</span>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, placeholder }) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-wider text-ink-3 mb-1.5">{label}</label>
      <input
        defaultValue={value}
        placeholder={placeholder}
        className="input"
        style={{ fontSize: '14px' }}
      />
    </div>
  )
}
