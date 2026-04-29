import { useEffect, useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { useBusiness } from '../../../hooks/useBusiness'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../contexts/ToastContext'
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
  const { business, updateBusiness } = useBusiness()
  const { user } = useAuth()
  const toast = useToast()

  const [form, setForm] = useState({
    name: '',
    website: '',
    cert_membership: '',
    email: '',
    brand_colour: '#22c55e',
  })
  const [initial, setInitial] = useState(null)
  const [saving, setSaving] = useState(false)

  // Hydrate from business when it loads/changes
  useEffect(() => {
    if (!business) return
    const next = {
      name:            business.name            || '',
      website:         business.website         || '',
      cert_membership: business.cert_membership || '',
      email:           business.email           || '',
      brand_colour:    business.brand_colour    || '#22c55e',
    }
    setForm(next)
    setInitial(next)
  }, [business])

  const dirty = initial && Object.keys(form).some(k => form[k] !== initial[k])

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    if (!dirty || saving) return
    setSaving(true)
    const { error } = await updateBusiness(form)
    setSaving(false)
    if (error) {
      toast.error('Could not save', { description: error.message })
    } else {
      toast.success('Saved')
      setInitial(form)
    }
  }

  return (
    <div className="space-y-6">
      {/* Pane header with right-aligned save button */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow mb-2">Branding · what your customers see</div>
          <p className="text-[12px] text-ink-3 max-w-prose">
            Trading name, public email and your accreditation appear on every quote, invoice and customer portal page.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className={cn(
            'pill-ghost text-[12px] inline-flex items-center gap-1.5 shrink-0',
            dirty
              ? 'text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800/50 bg-brand-50 dark:bg-brand-950/30 hover:bg-brand-100'
              : 'opacity-50 cursor-not-allowed',
          )}
        >
          {saving
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.2} /> Saving…</>
            : dirty
              ? 'Save changes'
              : <><Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Saved</>}
        </button>
      </div>

      {/* Branding fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Field
          label="Trading name"
          value={form.name}
          onChange={v => update('name', v)}
          placeholder="Your Tree Services Ltd"
        />
        <Field
          label="Domain"
          value={form.website}
          onChange={v => update('website', v)}
          placeholder="yourtree.com.au"
        />
        <Field
          label="Cert / membership"
          value={form.cert_membership}
          onChange={v => update('cert_membership', v)}
          placeholder="Arboricultural Assoc · #4471"
        />
        <Field
          label="Public email"
          value={form.email}
          onChange={v => update('email', v)}
          placeholder={user?.email || 'jobs@yourtree.com.au'}
          type="email"
        />
      </div>

      {/* Brand colour */}
      <div>
        <div className="eyebrow mb-2">Brand colour · used on PDFs, the customer portal, your invoices</div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {BRAND_SWATCHES.map(c => {
            const selected = form.brand_colour === c.value
            return (
              <button
                key={c.value}
                onClick={() => update('brand_colour', c.value)}
                aria-label={c.name}
                className={cn(
                  'w-9 h-9 rounded-card border-2 transition-all',
                  selected
                    ? 'border-ink-1 ring-2 ring-brand-200/50 scale-105'
                    : 'border-line hover:border-ink-3',
                )}
                style={{ backgroundColor: c.value }}
              />
            )
          })}
          <span className="ml-3 text-[12px] font-mono text-ink-3 tabular-nums">
            Selected · {form.brand_colour}
          </span>
        </div>
      </div>

      {/* Sample report preview — visual only for now */}
      <div>
        <div className="eyebrow mb-2">Sample report preview</div>
        <div className="card !p-4 flex items-center justify-between mt-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-card flex items-center justify-center text-white font-bold shrink-0"
              style={{ backgroundColor: form.brand_colour }}
            >
              {(form.name || 'T').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: form.brand_colour }}>
                AS 4373 ready certified
              </div>
              <div className="text-[14px] font-semibold text-ink-1 mt-0.5 truncate">
                {form.name || 'Your Tree Services Ltd'}
              </div>
              <div className="text-[11.5px] text-ink-3">
                Site visit report · sample · REF TM-2041
              </div>
            </div>
          </div>
          <button
            onClick={() => toast.info('PDF generation coming soon', { description: 'Tracked under Compliance.' })}
            className="pill-ghost text-[12px] shrink-0"
          >
            Preview PDF
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-wider text-ink-3 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input"
        style={{ fontSize: '14px' }}
      />
    </div>
  )
}
