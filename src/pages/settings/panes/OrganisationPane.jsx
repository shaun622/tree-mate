import { useEffect, useRef, useState } from 'react'
import { Loader2, Check, FileText, Upload, Trash2, Image as ImageIcon } from 'lucide-react'
import { useBusiness } from '../../../hooks/useBusiness'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../contexts/ToastContext'
import { supabase } from '../../../lib/supabase'
import { cn } from '../../../lib/utils'

const HEX_RE = /^#[0-9a-fA-F]{6}$/

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
    // gst_enabled is the master switch: false means we're not GST-
    // registered, so new docs save with rate=0 and the GST line is
    // hidden in totals. Toggling this off keeps the entered rate
    // around so flipping back on is one click.
    gst_enabled: true,
    // GST rate stored as decimal (0.10 = 10%) but edited in the form
    // as a percent so the operator types "10" instead of "0.10". Save
    // converts back to decimal before writing.
    gst_rate_percent: '10',
  })
  const [initial, setInitial] = useState(null)
  const [saving, setSaving] = useState(false)
  const [hexInput, setHexInput] = useState('#22c55e')
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef(null)

  // Hydrate from business when it loads/changes
  useEffect(() => {
    if (!business) return
    // numeric(5,4) arrives from PostgREST as a string ("0.1000") so coerce.
    const ratePct = business.gst_rate != null ? String(+(Number(business.gst_rate) * 100).toFixed(4)) : '10'
    const next = {
      name:             business.name            || '',
      website:          business.website         || '',
      cert_membership:  business.cert_membership || '',
      email:            business.email           || '',
      brand_colour:     business.brand_colour    || '#22c55e',
      // Treat absence as "registered" (current behaviour) for legacy
      // rows that predate the gst_enabled column.
      gst_enabled:      business.gst_enabled !== false,
      gst_rate_percent: ratePct,
    }
    setForm(next)
    setInitial(next)
    setHexInput(next.brand_colour)
  }, [business])

  const dirty = initial && Object.keys(form).some(k => form[k] !== initial[k])

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    if (!dirty || saving) return
    setSaving(true)
    const { gst_rate_percent, ...rest } = form
    // Use Number.isFinite so an empty field falls back to 10%, but
    // explicit 0 is preserved (the previous `|| 10` snapped 0 back
    // to 10, which was the bug operators hit when trying to disable
    // GST by typing 0).
    const pct = Number(gst_rate_percent)
    const gstRate = Number.isFinite(pct) ? Math.max(0, Math.min(1, pct / 100)) : 0.10
    const payload = {
      ...rest,
      gst_enabled: !!form.gst_enabled,
      gst_rate: gstRate,
    }
    const { error } = await updateBusiness(payload)
    setSaving(false)
    if (error) {
      toast.error('Could not save', { description: error.message })
    } else {
      toast.success('Saved')
      setInitial(form)
    }
  }

  // Hex input — sync from typed value if it's a valid hex
  const handleHexChange = (raw) => {
    let v = raw.trim()
    if (v && !v.startsWith('#')) v = '#' + v
    setHexInput(v)
    if (HEX_RE.test(v)) update('brand_colour', v.toLowerCase())
  }

  // Lazy-load jsPDF + open the generated PDF in a new tab
  const handlePreviewPDF = async () => {
    if (generatingPDF) return
    setGeneratingPDF(true)
    try {
      const { generateSampleReportPDF } = await import('../../../lib/sampleReport')
      const url = await generateSampleReportPDF(form)
      window.open(url, '_blank', 'noopener,noreferrer')
      // Revoke later so the new tab has time to load it
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      console.error('PDF generation failed:', err)
      toast.error('Could not generate PDF', { description: err?.message })
    } finally {
      setGeneratingPDF(false)
    }
  }

  // Logo upload — uploads to logos/{userId}/logo.{ext}, saves URL on the business.
  // Auto-saves immediately (doesn't wait for the Save changes button).
  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // reset so re-uploading the same file still fires onChange
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Logo too large', { description: 'Max 4 MB' })
      return
    }
    setUploadingLogo(true)
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `${user.id}/logo.${ext}`
      const { error: upErr } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      // Cache-bust so the new logo shows up immediately even if path is unchanged
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`
      const { error: saveErr } = await updateBusiness({ logo_url: cacheBustedUrl })
      if (saveErr) throw saveErr
      toast.success('Logo updated')
    } catch (err) {
      console.error('Logo upload failed:', err)
      toast.error('Upload failed', { description: err?.message })
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleLogoRemove = async () => {
    if (uploadingLogo) return
    setUploadingLogo(true)
    try {
      const { error } = await updateBusiness({ logo_url: null })
      if (error) throw error
      toast.success('Logo removed')
    } catch (err) {
      console.error('Logo remove failed:', err)
      toast.error('Could not remove logo', { description: err?.message })
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Pane header with right-aligned save button */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow mb-2">Branding · what your customers see</div>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 max-w-prose">
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

      {/* Logo upload */}
      <div>
        <div className="eyebrow mb-2">Logo · shown on PDFs, the customer portal, your invoices</div>
        <div className="card !p-4 flex items-center gap-4 mt-3">
          {/* Preview */}
          <div className="w-16 h-16 rounded-card border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden shrink-0">
            {business?.logo_url ? (
              <img src={business.logo_url} alt="Business logo" className="w-full h-full object-contain" />
            ) : (
              <ImageIcon className="w-6 h-6 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
            )}
          </div>

          {/* Copy + actions */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
              {business?.logo_url ? 'Logo set' : 'No logo yet'}
            </p>
            <p className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-0.5">
              Square PNG or SVG works best · max 4 MB
            </p>
          </div>

          {/* Hidden file input + styled buttons */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoFile}
            className="hidden"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            {business?.logo_url && (
              <button
                onClick={handleLogoRemove}
                disabled={uploadingLogo}
                className="pill-ghost text-[12px] inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200/60 disabled:opacity-50"
                aria-label="Remove logo"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                Remove
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
              className="pill-ghost text-[12px] inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {uploadingLogo
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.2} /> Uploading…</>
                : <><Upload className="w-3.5 h-3.5" strokeWidth={2} /> {business?.logo_url ? 'Replace' : 'Upload logo'}</>}
            </button>
          </div>
        </div>
      </div>

      {/* Tax & invoicing — GST applied to new quotes / invoices */}
      <div>
        <div className="eyebrow mb-2">Tax & invoicing · GST applied to new quotes and invoices</div>

        {/* Master GST toggle. Disabled state greys the rate input
            but keeps the value so flipping back on doesn't lose
            the rate. */}
        <div className="flex items-start justify-between gap-4 rounded-card border border-gray-200 dark:border-gray-800 px-4 py-3 mt-3 mb-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Charge GST</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {form.gst_enabled
                ? 'New quotes and invoices include GST at the rate below.'
                : "Off — new quotes and invoices won't include GST. Turn on once you're GST-registered."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.gst_enabled}
            onClick={() => update('gst_enabled', !form.gst_enabled)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
              form.gst_enabled ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform translate-y-0.5',
                form.gst_enabled ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>

        <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-4', form.gst_enabled ? '' : 'opacity-50 pointer-events-none')}>
          <Field
            label="GST rate (%)"
            value={form.gst_rate_percent}
            onChange={v => update('gst_rate_percent', v)}
            placeholder="10"
            type="number"
          />
        </div>
        <p className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-2">
          Existing quotes and invoices keep the rate they were issued under — this only changes new docs.
        </p>
      </div>

      {/* Brand colour — swatches + hex input + native picker */}
      <div>
        <div className="eyebrow mb-2">Brand colour · used on PDFs, the customer portal, your invoices</div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {BRAND_SWATCHES.map(c => {
            const selected = form.brand_colour === c.value
            return (
              <button
                key={c.value}
                onClick={() => { update('brand_colour', c.value); setHexInput(c.value) }}
                aria-label={c.name}
                className={cn(
                  'w-9 h-9 rounded-card border-2 transition-all',
                  selected
                    ? 'border-gray-900 dark:border-gray-100 ring-2 ring-brand-200/50 scale-105'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500',
                )}
                style={{ backgroundColor: c.value }}
              />
            )
          })}

          {/* Vertical divider */}
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Custom hex input — paired with the native colour picker */}
          <label className="relative">
            <input
              type="color"
              value={HEX_RE.test(hexInput) ? hexInput : '#22c55e'}
              onChange={e => { setHexInput(e.target.value); update('brand_colour', e.target.value) }}
              className="w-9 h-9 rounded-card border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer p-0 appearance-none"
              aria-label="Pick custom colour"
              style={{ backgroundColor: HEX_RE.test(hexInput) ? hexInput : '#ffffff' }}
            />
          </label>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">#</span>
            <input
              type="text"
              value={hexInput.replace(/^#/, '')}
              onChange={e => handleHexChange(e.target.value)}
              placeholder="22c55e"
              maxLength={6}
              className="w-[88px] h-9 rounded-card border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-[13px] tabular-nums text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 uppercase"
            />
          </div>

          <span className="ml-2 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
            {HEX_RE.test(hexInput) ? `Selected · ${hexInput.toLowerCase()}` : 'Enter a 6-digit hex'}
          </span>
        </div>
      </div>

      {/* Sample report preview — visual only for now */}
      <div>
        <div className="eyebrow mb-2">Sample report preview</div>
        <div className="card !p-4 flex items-center justify-between mt-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-card flex items-center justify-center text-white font-bold shrink-0 overflow-hidden"
              style={{ backgroundColor: business?.logo_url ? 'transparent' : form.brand_colour }}
            >
              {business?.logo_url
                ? <img src={business.logo_url} alt="" className="w-full h-full object-contain" />
                : (form.name || 'T').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: form.brand_colour }}>
                AS 4373 ready certified
              </div>
              <div className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 mt-0.5 truncate">
                {form.name || 'Your Tree Services Ltd'}
              </div>
              <div className="text-[11.5px] text-gray-500 dark:text-gray-400">
                Site visit report · sample · REF TM-2041
              </div>
            </div>
          </div>
          <button
            onClick={handlePreviewPDF}
            disabled={generatingPDF}
            className="pill-ghost text-[12px] shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {generatingPDF
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.2} /> Generating…</>
              : <><FileText className="w-3.5 h-3.5" strokeWidth={2} /> Preview PDF</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
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
