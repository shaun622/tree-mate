import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import { useJobSites } from '../hooks/useJobSites'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Input, TextArea } from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import AddressAutocomplete from '../components/ui/AddressAutocomplete'

// Compute client badge based on their jobs
function getClientBadge(clientJobs) {
  if (!clientJobs || clientJobs.length === 0) return { label: 'No Jobs', variant: 'neutral' }
  const hasActive = clientJobs.some(j => ['scheduled', 'in_progress', 'approved'].includes(j.status))
  if (hasActive) return { label: 'Active', variant: 'success' }
  const hasQuoted = clientJobs.some(j => j.status === 'quoted')
  if (hasQuoted) return { label: 'Quoted', variant: 'warning' }
  const hasEnquiry = clientJobs.some(j => ['enquiry', 'site_visit'].includes(j.status))
  if (hasEnquiry) return { label: 'Lead', variant: 'info' }
  return { label: 'Completed', variant: 'neutral' }
}

export default function Clients() {
  const { business } = useBusiness()
  const { clients, createClient } = useClients(business?.id)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [clientJobs, setClientJobs] = useState({}) // clientId -> jobs[]

  // Fetch jobs for all clients to compute badges
  useEffect(() => {
    if (!business?.id) return
    supabase.from('jobs').select('id, client_id, status')
      .eq('business_id', business.id)
      .then(({ data }) => {
        const map = {}
        for (const j of (data || [])) {
          if (!j.client_id) continue
          if (!map[j.client_id]) map[j.client_id] = []
          map[j.client_id].push(j)
        }
        setClientJobs(map)
      })
  }, [business?.id, clients])

  const displayed = useMemo(() => {
    return clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  }, [clients, search])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await createClient(form)
    setSaving(false)
    if (!error && data) {
      setShowModal(false)
      setForm({ name: '', email: '', phone: '', address: '', notes: '' })
      navigate(`/clients/${data.id}?addSite=1`)
    }
  }

  return (
    <PageWrapper width="wide">
      <Header title="Clients" subtitle={`${clients.length} customer${clients.length !== 1 ? 's' : ''}`} rightAction={
        <button onClick={() => setShowModal(true)} className="p-2 hover:bg-black/5 rounded-xl transition-all duration-200 active:scale-95">
          <svg className="w-6 h-6 text-tree-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      } />

      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <input type="text" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 bg-gray-50/50 text-sm focus:outline-none focus:ring-4 focus:ring-tree-50 focus:border-tree-400 focus:bg-white transition-all duration-200" />

        {displayed.length === 0 ? (
          <EmptyState
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            title="No clients yet"
            description="Add your first client to get started"
            actionLabel="Add Client"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
            {displayed.map(client => {
              const badge = getClientBadge(clientJobs[client.id])
              const jobCount = (clientJobs[client.id] || []).length
              const initials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              const hue = client.name.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % 360
              return (
                <Card key={client.id} hover onClick={() => navigate(`/clients/${client.id}`)} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: `hsl(${hue}, 55%, 50%)` }}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">{client.name}</p>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{client.email || client.phone || 'No contact info'}</p>
                      {jobCount > 0 && <p className="text-xs text-gray-400 mt-0.5">{jobCount} job{jobCount > 1 ? 's' : ''}</p>}
                    </div>
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Client">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Name" placeholder="Client name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <Input label="Email" type="email" placeholder="client@email.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          <Input label="Phone" type="tel" placeholder="04XX XXX XXX" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          <AddressAutocomplete label="Address" placeholder="Street address" value={form.address} onChange={(addr) => setForm(p => ({ ...p, address: addr }))} />
          <TextArea label="Notes" placeholder="Any notes..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          <Button type="submit" loading={saving} className="w-full">Add Client</Button>
        </form>
      </Modal>
    </PageWrapper>
  )
}
