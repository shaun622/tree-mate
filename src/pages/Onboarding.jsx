import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBusiness } from '../hooks/useBusiness'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', abn: '', phone: '', email: '', logo_url: '', brand_colour: '#22c55e', timezone: 'Australia/Brisbane' })
  const { createBusiness, business, loading: bizLoading } = useBusiness()
  const { user } = useAuth()
  const navigate = useNavigate()

  // If user already has a business, skip onboarding
  useEffect(() => {
    if (!bizLoading && business) navigate('/', { replace: true })
  }, [bizLoading, business, navigate])

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop()
    const path = `${user.id}/logo.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (error) { alert('Upload failed'); return }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
    update('logo_url', publicUrl)
  }

  const handleFinish = async () => {
    setLoading(true)
    const { error } = await createBusiness(form)
    if (error) alert(error.message)
    else navigate('/')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-page flex flex-col">
      <div className="max-w-app mx-auto w-full flex-1 flex flex-col">
        <div className="bg-gradient-hero px-6 pt-20 pb-14 text-center relative overflow-hidden safe-top">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/20" />
          </div>
          <div className="relative">
            <h1 className="text-2xl font-bold text-white mb-1">Set Up Your Business</h1>
            <p className="text-white/70 text-sm font-medium">Step {step} of 2</p>
            <div className="flex gap-2 justify-center mt-4">
              <div className={`h-1.5 w-12 rounded-full transition-colors duration-150 ${step >= 1 ? 'bg-white' : 'bg-white/30'}`} />
              <div className={`h-1.5 w-12 rounded-full transition-colors duration-150 ${step >= 2 ? 'bg-white' : 'bg-white/30'}`} />
            </div>
          </div>
        </div>

        <div className="px-5 -mt-8 pb-8 relative">
          <div className="bg-white rounded-3xl shadow-elevated p-6 space-y-5 ring-1 ring-black/[0.03]">
            {step === 1 ? (
              <>
                <h2 className="text-xl font-bold text-gray-900">Business Details</h2>
                <Input label="Business Name" placeholder="e.g. Smith Tree Services" value={form.name} onChange={e => update('name', e.target.value)} required />
                <Input label="ABN" placeholder="XX XXX XXX XXX" value={form.abn} onChange={e => update('abn', e.target.value)} />
                <Input label="Phone" type="tel" placeholder="04XX XXX XXX" value={form.phone} onChange={e => update('phone', e.target.value)} />
                <Input label="Email" type="email" placeholder="info@yourbusiness.com.au" value={form.email} onChange={e => update('email', e.target.value)} />
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Timezone</label>
                  <select
                    value={form.timezone}
                    onChange={e => update('timezone', e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 text-sm font-medium text-gray-900 bg-white focus:border-tree-400 focus:ring-2 focus:ring-tree-100 outline-none transition-colors duration-150 appearance-none"
                  >
                    <option value="Australia/Brisbane">Brisbane (AEST)</option>
                    <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                    <option value="Australia/Melbourne">Melbourne (AEST/AEDT)</option>
                    <option value="Australia/Adelaide">Adelaide (ACST/ACDT)</option>
                    <option value="Australia/Perth">Perth (AWST)</option>
                    <option value="Australia/Darwin">Darwin (ACST)</option>
                    <option value="Australia/Hobart">Hobart (AEST/AEDT)</option>
                    <option value="Pacific/Auckland">Auckland (NZST)</option>
                    <option value="Asia/Singapore">Singapore (SGT)</option>
                    <option value="America/New_York">New York (EST)</option>
                    <option value="America/Los_Angeles">Los Angeles (PST)</option>
                    <option value="Europe/London">London (GMT)</option>
                  </select>
                </div>
                <Button onClick={() => setStep(2)} className="w-full" disabled={!form.name}>Next</Button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900">Branding</h2>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Logo</label>
                  {form.logo_url ? (
                    <div className="flex items-center gap-4">
                      <img src={form.logo_url} alt="Logo" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-gray-100" />
                      <button onClick={() => update('logo_url', '')} className="text-sm text-red-500 font-medium">Remove</button>
                    </div>
                  ) : (
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-tree-50 file:text-tree-700 hover:file:bg-tree-100 file:transition-colors" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Brand Colour</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={form.brand_colour} onChange={e => update('brand_colour', e.target.value)} className="w-12 h-12 rounded-xl border-2 border-gray-100 cursor-pointer" />
                    <span className="text-sm text-gray-400 font-mono">{form.brand_colour}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button onClick={handleFinish} loading={loading} className="flex-1">Finish Setup</Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
