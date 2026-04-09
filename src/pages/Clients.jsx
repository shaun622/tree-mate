import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { statusLabel } from '../lib/utils'

export default function Clients() {
  const { business } = useBusiness()
  const { clients, createClient } = useClients(business?.id)
  const { jobSites } = useJobSites(business?.id)
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const clientsWithSites = useMemo(() => {
    const siteClientIds = new Set(jobSites.map(s => s.client_id))
    return clients.filter(c => siteClientIds.has(c.id))
  }, [clients, jobSites])

  const displayed = (showAll ? clients : clientsWithSites)
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  const pipelineColor = (stage) => {
    const map = { lead: 'info', quoted: 'warning', active: 'success', on_hold: 'neutral', lost: 'danger' }
    return map[stage] || 'neutral'
  }

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
    <PageWrapper>
      <Header title="Clients" rightAction={
        <button onClick={() => setShowModal(true)} className="p-2 hover:bg-gray-100 rounded-full">
          <svg className="w-6 h-6 text-tree-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      } />

      <div className="px-4 py-4 space-y-4">
        <div className="flex gap-2">
          <input type="text" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-tree-500" />
          <button onClick={() => setShowAll(!showAll)} className={`px-3 py-2 rounded-xl text-xs font-medium border ${showAll ? 'bg-tree-50 border-tree-200 text-tree-700' : 'bg-white border-gray-200 text-gray-600'}`}>
            {showAll ? 'Active Only' : 'View All'}
          </button>
        </div>

        {displayed.length === 0 ? (
          <EmptyState
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            title="No clients yet"
            description="Add your first client to get started"
            actionLabel="Add Client"
            onAction={() => setShowModal(true)}
          />
        ) : (
          <div className="space-y-2">
            {displayed.map(client => (
              <Card key={client.id} hover onClick={() => navigate(`/clients/${client.id}`)} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{client.name}</p>
                    <p className="text-sm text-gray-500 truncate">{client.email || client.phone || 'No contact info'}</p>
                  </div>
                  <Badge variant={pipelineColor(client.pipeline_stage)}>{statusLabel(client.pipeline_stage)}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Client">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Name" placeholder="Client name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <Input label="Email" type="email" placeholder="client@email.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          <Input label="Phone" type="tel" placeholder="04XX XXX XXX" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          <Input label="Address" placeholder="Street address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          <TextArea label="Notes" placeholder="Any notes..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          <Button type="submit" loading={saving} className="w-full">Add Client</Button>
        </form>
      </Modal>
    </PageWrapper>
  )
}
