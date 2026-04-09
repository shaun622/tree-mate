import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import { statusLabel, formatDate, MAINTENANCE_FREQUENCIES } from '../lib/utils'

export default function RecurringJobs() {
  const { business } = useBusiness()
  const { clients } = useClients(business?.id)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ client_id: '', job_type: '', frequency: 'monthly', next_run_at: '', active: true })

  useEffect(() => {
    if (!business?.id) return
    supabase.from('recurring_job_profiles').select('*').eq('business_id', business.id).order('created_at', { ascending: false })
      .then(({ data }) => { setProfiles(data || []); setLoading(false) })
  }, [business?.id])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase.from('recurring_job_profiles').insert({ ...form, business_id: business.id }).select().single()
    if (!error) setProfiles(prev => [data, ...prev])
    setSaving(false)
    setShowModal(false)
    setForm({ client_id: '', job_type: '', frequency: 'monthly', next_run_at: '', active: true })
  }

  const toggleActive = async (id, active) => {
    const { data } = await supabase.from('recurring_job_profiles').update({ active }).eq('id', id).select().single()
    if (data) setProfiles(prev => prev.map(p => p.id === id ? data : p))
  }

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))

  return (
    <PageWrapper>
      <Header title="Recurring Jobs" back="/jobs" rightAction={
        <button onClick={() => setShowModal(true)} className="p-2 hover:bg-gray-100 rounded-full">
          <svg className="w-6 h-6 text-tree-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      } />

      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : profiles.length === 0 ? (
          <EmptyState title="No recurring jobs" description="Set up recurring job profiles for maintenance contracts" actionLabel="Add Profile" onAction={() => setShowModal(true)} />
        ) : (
          profiles.map(p => (
            <Card key={p.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{p.job_type || 'Job'}</p>
                  <p className="text-sm text-gray-500">{clientMap[p.client_id]?.name || ''}</p>
                  <p className="text-xs text-gray-400">{p.frequency} — Next: {p.next_run_at ? formatDate(p.next_run_at) : 'Not set'}</p>
                </div>
                <button onClick={() => toggleActive(p.id, !p.active)} className={`relative w-11 h-6 rounded-full transition-colors ${p.active ? 'bg-tree-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${p.active ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Recurring Job">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select label="Client" value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))} options={[{ value: '', label: 'Select...' }, ...clients.map(c => ({ value: c.id, label: c.name }))]} required />
          <Input label="Job Type" placeholder="e.g. Hedge Trimming" value={form.job_type} onChange={e => setForm(p => ({ ...p, job_type: e.target.value }))} required />
          <Select label="Frequency" value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))} options={MAINTENANCE_FREQUENCIES.map(f => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))} />
          <Input label="Next Run Date" type="date" value={form.next_run_at} onChange={e => setForm(p => ({ ...p, next_run_at: e.target.value }))} />
          <Button type="submit" loading={saving} className="w-full">Create Profile</Button>
        </form>
      </Modal>
    </PageWrapper>
  )
}