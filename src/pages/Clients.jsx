import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import { Plus, Search, ArrowRight, ChevronRight, Users, Briefcase, Wallet } from 'lucide-react'
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

// Deterministic soft-tone avatar palette — matches MOBILE_ROW_COLORS pattern in Settings.
// Same client always gets the same tone, but the spread reads as on-brand variety.
const AVATAR_TONES = ['brand', 'blue', 'amber', 'emerald', 'violet', 'pink', 'teal']
const AVATAR_TONE_CLASSES = {
  brand:   'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300',
  blue:    'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  amber:   'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  violet:  'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  pink:    'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300',
  teal:    'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
}
function avatarTone(name) {
  const sum = (name || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return AVATAR_TONES[sum % AVATAR_TONES.length]
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

  // KPI: total YTD revenue across all clients
  const ytdTotal = Object.values(clientJobs).flat().reduce((s, j) => s + (j.total || 0), 0)
  const activeJobsTotal = Object.values(clientJobs).flat().filter(j => ['scheduled','in_progress','approved'].includes(j.status)).length

  return (
    <PageWrapper width="wide" className="!bg-slate-50 dark:!bg-gray-950">
      <div className="md:hidden">
        <Header title="Clients" subtitle={`${clients.length} customer${clients.length !== 1 ? 's' : ''}`} rightAction={
          <button onClick={() => setShowModal(true)} className="p-2 hover:bg-black/5 rounded-xl transition-colors duration-150 active:scale-95">
            <Plus className="w-6 h-6 text-brand-600" strokeWidth={2.2} />
          </button>
        } />
      </div>

      <div className="px-4 md:px-6 py-5 md:py-6 space-y-5">
        <div className="hidden md:block">
          <PageHero
            eyebrow={
              <span className="inline-flex items-center gap-2">
                <Users className="w-3.5 h-3.5" strokeWidth={2.5} />
                CRM
              </span>
            }
            title={`${clients.length} client${clients.length === 1 ? '' : 's'}${recurringCount > 0 ? ` · ${recurringCount} active` : ''}`}
            subtitle={null}
            action={
              <Button onClick={() => setShowModal(true)} leftIcon={Plus}>
                <span className="text-[13px]">Add client</span>
              </Button>
            }
          />
        </div>

        {/* KPI strip — desktop only, mirrors Dashboard pattern */}
        <div className="hidden md:grid grid-cols-3 gap-3">
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total clients</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100 leading-none">{clients.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                <Users className="w-5 h-5" strokeWidth={2} />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Active jobs</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100 leading-none">{activeJobsTotal}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                <Briefcase className="w-5 h-5" strokeWidth={2} />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-brand-200/60 dark:border-brand-800/40 p-4 bg-gradient-brand-soft dark:bg-brand-950/20 shadow-card">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">YTD revenue</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-gray-900 dark:text-gray-100 leading-none">{formatCurrency(ytdTotal)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-brand-100/70 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                <Wallet className="w-5 h-5" strokeWidth={2} />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile — KPI strip + search + list */}
        <div className="md:hidden space-y-4">
          {/* Compact 2-up KPI: Active jobs + YTD revenue (brand-soft hero) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card !p-3.5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Active jobs</p>
                  <p className="mt-1.5 text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100 leading-none">{activeJobsTotal}</p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                  <Briefcase className="w-4 h-4" strokeWidth={2} />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-brand-200/60 dark:border-brand-800/40 p-3.5 bg-gradient-brand-soft dark:bg-brand-950/20 shadow-card">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">YTD Revenue</p>
                  <p className="mt-1.5 text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100 leading-none">{formatCurrency(ytdTotal)}</p>
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-brand-100/70 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  <Wallet className="w-4 h-4" strokeWidth={2} />
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* List or empty state */}
          {displayed.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8" strokeWidth={1.5} />}
              title={search ? 'No matches' : 'No clients yet'}
              description={search ? `Nothing matches "${search}"` : 'Add your first client to get started'}
              actionLabel={search ? null : 'Add Client'}
              onAction={search ? null : () => setShowModal(true)}
            />
          ) : (
            <div className="space-y-2">
              {displayed.map(client => {
                const badge = getClientBadge(clientJobs[client.id])
                const isHot = badge.variant === 'success' || badge.variant === 'warning'
                const initials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                const tone = avatarTone(client.name)
                const ytd = (clientJobs[client.id] || []).reduce((s, j) => s + (j.total || 0), 0)
                return (
                  <Card key={client.id} onClick={() => navigate(`/clients/${client.id}`)} className="!p-3.5">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-card flex items-center justify-center text-sm font-bold flex-shrink-0', AVATAR_TONE_CLASSES[tone])}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {isHot && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">{client.name}</p>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-[12.5px] text-gray-500 dark:text-gray-400 truncate flex-1 min-w-0">
                            {client.email || client.phone || '—'}
                          </p>
                          {ytd > 0 && (
                            <p className="text-[12.5px] font-semibold tabular-nums text-gray-700 dark:text-gray-300 shrink-0">
                              {formatCurrency(ytd)}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" strokeWidth={2} />
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
          <div className="md:col-span-7 xl:col-span-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent border-0 outline-none flex-1 text-[13px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <div className="grid grid-cols-12 px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 section-title">
              <div className="col-span-5">Client</div>
              <div className="col-span-3">Type</div>
              <div className="col-span-1 text-right">Sites</div>
              <div className="col-span-3 text-right">YTD spend</div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {displayed.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">No clients match your search</div>
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
                      isSelected ? 'bg-brand-50 dark:bg-brand-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                    )}
                  >
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      {isHot && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
                      <span className="text-[13.5px] font-semibold text-gray-900 dark:text-gray-100 truncate">{client.name}</span>
                    </div>
                    <div className="col-span-3 text-[12.5px] text-gray-500 dark:text-gray-400 truncate">{client.notes?.slice(0, 30) || 'Residential'}</div>
                    <div className="col-span-1 text-[12.5px] text-gray-700 dark:text-gray-300 tabular-nums text-right">{sites || '—'}</div>
                    <div className="col-span-3 text-[12.5px] font-semibold text-gray-900 dark:text-gray-100 tabular-nums text-right">{ytd > 0 ? formatCurrency(ytd) : '—'}</div>
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
                  <div className="eyebrow">
                    <Users className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Client detail
                  </div>
                  <Badge variant={getClientBadge(clientJobs[selected.id]).variant}>
                    {getClientBadge(clientJobs[selected.id]).label}
                  </Badge>
                </div>
                <h2 className="text-[20px] font-bold tracking-tight text-gray-900 dark:text-gray-100">{selected.name}</h2>
                <p className="text-[12.5px] text-gray-500 dark:text-gray-400 mt-0.5">{selected.email || selected.phone || '—'}</p>

                <div className="grid grid-cols-2 gap-3 mt-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <div className="eyebrow-muted">Sites</div>
                    <div className="text-[20px] font-bold tabular-nums text-gray-900 dark:text-gray-100 mt-1">
                      {clientJobs[selected.id]?.length || 0}
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow-muted">YTD spend</div>
                    <div className="text-[20px] font-bold tabular-nums text-gray-900 dark:text-gray-100 mt-1">
                      {formatCurrency((clientJobs[selected.id] || []).reduce((s, j) => s + (j.total || 0), 0))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3">
                  <div className="eyebrow-muted mb-2">
                    <Briefcase className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Recent jobs
                  </div>
                  <div className="space-y-1.5">
                    {(clientJobs[selected.id] || []).slice(0, 4).map(j => (
                      <div key={j.id} className="flex items-center justify-between text-[12px]">
                        <span className="text-gray-700 dark:text-gray-300 truncate">Job · {j.status}</span>
                        <span className="text-gray-500 dark:text-gray-400 tabular-nums">{j.created_at ? new Date(j.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}</span>
                      </div>
                    ))}
                    {(clientJobs[selected.id]?.length || 0) === 0 && (
                      <div className="text-[12px] text-gray-400 dark:text-gray-500 italic">No jobs yet</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                  <button
                    onClick={() => navigate(`/clients/${selected.id}`)}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 hover:gap-1.5 transition-all"
                  >
                    Open profile <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="card !p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Select a client to view details</div>
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
