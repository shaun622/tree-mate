import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import { Plus, Search, ArrowRight } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import PageHero from '../components/layout/PageHero'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Input, TextArea } from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import AddressAutocomplete from '../components/ui/AddressAutocomplete'
import { cn, formatCurrency } from '../lib/utils'

function getClientBadge(clientJobs) {
  if (!clientJobs || clientJobs.length === 0) return { label: 'No jobs', variant: 'neutral' }
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
  const [clientJobs, setClientJobs] = useState({})
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    if (!business?.id) return
    supabase.from('jobs').select('id, client_id, status, total, created_at')
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

  const displayed = useMemo(
    () => clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [clients, search],
  )

  // Auto-select first client on desktop
  useEffect(() => {
    if (selectedId == null && displayed.length > 0) setSelectedId(displayed[0].id)
  }, [displayed, selectedId])

  const selected = clients.find(c => c.id === selectedId)
  const recurringCount = clients.filter(c => clientJobs[c.id]?.some(j => j.status === 'in_progress' || j.status === 'scheduled')).length

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
      <div className="md:hidden">
        <Header title="Clients" subtitle={`${clients.length} customer${clients.length !== 1 ? 's' : ''}`} rightAction={
          <button onClick={() => setShowModal(true)} className="p-2 hover:bg-black/5 rounded-xl transition-colors duration-150 active:scale-95">
            <Plus className="w-6 h-6 text-brand-600" strokeWidth={2.2} />
          </button>
        } />
      </div>

      <div className="px-4 md:px-6 py-5 md:py-6 space-y-4">
        <div className="hidden md:block">
          <PageHero
            eyebrow="Clients"
            title={`${clients.length} client${clients.length === 1 ? '' : 's'} · ${recurringCount} active recurring`}
            subtitle={null}
            action={
              <Button onClick={() => setShowModal(true)}>
                <span className="text-[13px]">+ Add client</span>
              </Button>
            }
          />
        </div>

        {/* Mobile search + grid */}
        <div className="md:hidden">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9"
              style={{ fontSize: '16px' }}
            />
          </div>
          {displayed.length === 0 ? (
            <EmptyState
              title="No clients yet"
              description="Add your first client to get started"
              actionLabel="Add Client"
              onAction={() => setShowModal(true)}
            />
          ) : (
            <div className="space-y-2">
              {displayed.map(client => {
                const badge = getClientBadge(clientJobs[client.id])
                const initials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                const hue = client.name.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % 360
                return (
                  <Card key={client.id} onClick={() => navigate(`/clients/${client.id}`)} className="!p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: `hsl(${hue}, 55%, 50%)` }}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-ink-1 truncate">{client.name}</p>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </div>
                        <p className="text-[12.5px] text-ink-3 truncate">{client.email || client.phone || '—'}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-ink-4 flex-shrink-0" strokeWidth={2} />
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Desktop master-detail */}
        <div className="hidden md:grid md:grid-cols-12 gap-4">
          {/* Left: sortable table */}
          <div className="md:col-span-7 xl:col-span-8 card !p-0 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-line-2 bg-shell-2 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-ink-3" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent border-0 outline-none flex-1 text-[13px] text-ink-1 placeholder:text-ink-4"
              />
            </div>
            <div className="grid grid-cols-12 px-4 py-2 border-b border-line-2 bg-shell-2 section-title">
              <div className="col-span-5">Client</div>
              <div className="col-span-3">Type</div>
              <div className="col-span-1 text-right">Sites</div>
              <div className="col-span-3 text-right">YTD spend</div>
            </div>
            <div className="divide-y divide-line-2">
              {displayed.length === 0 ? (
                <div className="p-8 text-center text-ink-3 text-sm">No clients match your search</div>
              ) : displayed.map(client => {
                const badge = getClientBadge(clientJobs[client.id])
                const isHot = badge.variant === 'success' || badge.variant === 'warning'
                const ytd = (clientJobs[client.id] || []).reduce((s, j) => s + (j.total || 0), 0)
                const sites = clientJobs[client.id]?.length || 0
                const isSelected = selectedId === client.id
                return (
                  <button
                    key={client.id}
                    onClick={() => setSelectedId(client.id)}
                    className={cn(
                      'grid grid-cols-12 w-full text-left px-4 py-3 items-center transition-colors',
                      isSelected ? 'bg-brand-50 dark:bg-brand-950/30' : 'hover:bg-shell-2',
                    )}
                  >
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      {isHot && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
                      <span className="text-[13.5px] font-medium text-ink-1 truncate">{client.name}</span>
                    </div>
                    <div className="col-span-3 text-[12.5px] text-ink-3 truncate">{client.notes?.slice(0, 30) || 'Residential'}</div>
                    <div className="col-span-1 text-[12.5px] text-ink-2 tabular-nums text-right">{sites || '—'}</div>
                    <div className="col-span-3 text-[12.5px] font-medium text-ink-1 tabular-nums text-right">{ytd > 0 ? formatCurrency(ytd) : '—'}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: detail panel */}
          <div className="md:col-span-5 xl:col-span-4">
            {selected ? (
              <div className="card !p-5 sticky top-24">
                <div className="flex items-start justify-between mb-3">
                  <div className="eyebrow">Client detail</div>
                  <Badge variant={getClientBadge(clientJobs[selected.id]).variant}>
                    {getClientBadge(clientJobs[selected.id]).label}
                  </Badge>
                </div>
                <h2 className="text-[20px] font-semibold tracking-tight text-ink-1">{selected.name}</h2>
                <p className="text-[12.5px] text-ink-3 mt-0.5">{selected.email || selected.phone || '—'}</p>

                <div className="grid grid-cols-2 gap-3 mt-4 pb-4 border-b border-line-2">
                  <div>
                    <div className="eyebrow-muted">Sites</div>
                    <div className="text-[20px] font-semibold tabular-nums text-ink-1 mt-1">
                      {clientJobs[selected.id]?.length || 0}
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow-muted">YTD spend</div>
                    <div className="text-[20px] font-semibold tabular-nums text-ink-1 mt-1">
                      {formatCurrency((clientJobs[selected.id] || []).reduce((s, j) => s + (j.total || 0), 0))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3">
                  <div className="eyebrow-muted mb-2">Recent jobs</div>
                  <div className="space-y-1.5">
                    {(clientJobs[selected.id] || []).slice(0, 4).map(j => (
                      <div key={j.id} className="flex items-center justify-between text-[12px]">
                        <span className="text-ink-2 truncate">Job · {j.status}</span>
                        <span className="text-ink-3 font-mono tabular-nums">{j.created_at ? new Date(j.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}</span>
                      </div>
                    ))}
                    {(clientJobs[selected.id]?.length || 0) === 0 && (
                      <div className="text-[12px] text-ink-4 italic">No jobs yet</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-line-2 flex gap-2">
                  <button onClick={() => navigate(`/clients/${selected.id}`)} className="pill-ghost text-[12px]">Open profile →</button>
                </div>
              </div>
            ) : (
              <div className="card !p-8 text-center text-ink-3 text-sm">Select a client to view details</div>
            )}
          </div>
        </div>
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
