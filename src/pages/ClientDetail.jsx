import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useJobSites } from '../hooks/useJobSites'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Input, TextArea, Select } from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import { statusLabel, SITE_TYPES, SITE_ACCESS, HAZARDS, MAINTENANCE_FREQUENCIES, formatCurrency } from '../lib/utils'

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { business } = useBusiness()
  const { createJobSite, getJobSitesByClient } = useJobSites(business?.id)
  const [client, setClient] = useState(null)
  const [clientJobs, setClientJobs] = useState([])
  const [clientQuotes, setClientQuotes] = useState([])
  const [clientInvoices, setClientInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSiteModal, setShowSiteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [siteForm, setSiteForm] = useState({
    address: '', site_type: 'residential', site_access: 'easy', hazards: [],
    notes: '', regular_maintenance: false, maintenance_frequency: 'monthly', next_due_at: ''
  })

  const sites = getJobSitesByClient(id)

  useEffect(() => {
    const fetchAll = async () => {
      const [clientRes, jobsRes, quotesRes, invoicesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('jobs').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('quotes').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      ])
      setClient(clientRes.data)
      setClientJobs(jobsRes.data || [])
      setClientQuotes(quotesRes.data || [])
      setClientInvoices(invoicesRes.data || [])
      setLoading(false)
    }
    fetchAll()
  }, [id])

  // Auto-open Add Job Site modal from URL param
  useEffect(() => {
    if (searchParams.get('addSite') === '1') setShowSiteModal(true)
  }, [searchParams])

  const handleAddSite = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = { ...siteForm, client_id: id, hazards: siteForm.hazards }
    if (!siteForm.regular_maintenance) {
      delete payload.maintenance_frequency
      delete payload.next_due_at
    }
    await createJobSite(payload)
    setSaving(false)
    setShowSiteModal(false)
    setSiteForm({ address: '', site_type: 'residential', site_access: 'easy', hazards: [], notes: '', regular_maintenance: false, maintenance_frequency: 'monthly', next_due_at: '' })
  }

  const handleEditClient = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('clients').update({
      name: client.name, email: client.email, phone: client.phone,
      address: client.address, notes: client.notes, pipeline_stage: client.pipeline_stage
    }).eq('id', id)
    setSaving(false)
    setShowEditModal(false)
  }

  const toggleHazard = (h) => {
    setSiteForm(prev => ({
      ...prev,
      hazards: prev.hazards.includes(h) ? prev.hazards.filter(x => x !== h) : [...prev.hazards, h]
    }))
  }

  if (loading) return <PageWrapper><div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-tree-500 border-t-transparent rounded-full animate-spin" /></div></PageWrapper>

  const pipelineColor = { lead: 'info', quoted: 'warning', active: 'success', on_hold: 'neutral', lost: 'danger' }

  return (
    <PageWrapper>
      <Header title={client?.name || 'Client'} back="/clients" rightAction={
        <button onClick={() => setShowEditModal(true)} className="p-2 hover:bg-gray-100 rounded-full">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
      } />

      <div className="px-4 md:px-0 py-4 space-y-6">
        {/* Two-column desktop layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column — Client info */}
          <div className="lg:w-2/5 space-y-4">
            <Card className="p-4 md:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">{client?.name}</h2>
                <Badge variant={pipelineColor[client?.pipeline_stage] || 'neutral'}>{statusLabel(client?.pipeline_stage)}</Badge>
              </div>
              {client?.email && (
                <a href={`mailto:${client.email}`} className="text-sm text-gray-500 hover:text-tree-600 transition-colors block">{client.email}</a>
              )}
              {client?.phone && (
                <a href={`tel:${client.phone}`} className="text-sm text-gray-500 hover:text-tree-600 transition-colors block">{client.phone}</a>
              )}
              {client?.address && <p className="text-sm text-gray-500">{client.address}</p>}
              {client?.notes && <p className="text-sm text-gray-400 italic mt-2">{client.notes}</p>}
            </Card>

            {/* Add Job Site Button */}
            <button onClick={() => setShowSiteModal(true)} className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-tree-50 border-2 border-dashed border-tree-200 text-tree-700 font-medium hover:bg-tree-100 hover:border-tree-300 transition-all duration-200 active:scale-[0.99]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Job Site
            </button>

            {/* Job Sites */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Job Sites ({sites.length})</h3>
              {sites.length === 0 ? (
                <EmptyState title="No job sites" description="Add a job site to start tracking work" />
              ) : (
                <div className="space-y-2">
                  {sites.map(site => (
                    <Card key={site.id} hover onClick={() => navigate(`/sites/${site.id}`)} className="p-4">
                      <p className="font-medium text-gray-900">{site.address}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="neutral">{statusLabel(site.site_type)}</Badge>
                        <Badge variant={site.site_access === 'easy' ? 'success' : site.site_access === 'difficult' ? 'warning' : site.site_access === 'crane_required' ? 'danger' : 'neutral'}>
                          {statusLabel(site.site_access)}
                        </Badge>
                        {site.regular_maintenance && <Badge variant="primary">Maintenance</Badge>}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column — Jobs, Quotes, Invoices */}
          <div className="flex-1 lg:w-3/5 space-y-6">
            {/* Jobs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Jobs ({clientJobs.length})</h3>
                <button onClick={() => navigate('/jobs')} className="text-xs font-semibold text-tree-600 hover:text-tree-700 transition-colors">+ New Job</button>
              </div>
              {clientJobs.length === 0 ? (
                <p className="text-sm text-gray-400">No jobs yet</p>
              ) : (
                <div className="space-y-2">
                  {clientJobs.slice(0, 5).map(job => (
                      <Card key={job.id} hover onClick={() => navigate(`/jobs/${job.id}`)} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{job.job_type || 'Job'}</p>
                            <p className="text-xs text-gray-400">{job.scheduled_date || new Date(job.created_at).toLocaleDateString('en-AU')}</p>
                          </div>
                          <Badge variant={['completed', 'paid'].includes(job.status) ? 'neutral' : ['in_progress', 'scheduled', 'approved'].includes(job.status) ? 'success' : job.status === 'quoted' ? 'warning' : 'info'}>
                            {statusLabel(job.status)}
                          </Badge>
                        </div>
                      </Card>
                  ))}
                  {clientJobs.length > 5 && <p className="text-xs text-gray-400 text-center">+{clientJobs.length - 5} more</p>}
                </div>
              )}
            </div>

            {/* Quotes */}
            {clientQuotes.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Quotes ({clientQuotes.length})</h3>
                <div className="space-y-2">
                  {clientQuotes.slice(0, 5).map(q => (
                    <Card key={q.id} hover onClick={() => navigate(`/quotes/${q.id}`)} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{q.scope?.split('\n')[0] || 'Quote'}</p>
                          <p className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString('en-AU')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(q.total)}</p>
                          <p className="text-xs text-gray-400">{statusLabel(q.status)}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Invoices */}
            {clientInvoices.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Invoices ({clientInvoices.length})</h3>
                <div className="space-y-2">
                  {clientInvoices.slice(0, 5).map(inv => {
                    const isOverdue = inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < new Date()
                    return (
                      <Card key={inv.id} hover onClick={() => navigate(`/invoices/${inv.id}`)} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{inv.invoice_number || 'Invoice'}</p>
                            <p className="text-xs text-gray-400">{inv.due_date ? `Due ${new Date(inv.due_date).toLocaleDateString('en-AU')}` : ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{formatCurrency(inv.total)}</p>
                            <p className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                              {isOverdue ? 'Overdue' : statusLabel(inv.status)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Job Site Modal */}
      <Modal open={showSiteModal} onClose={() => setShowSiteModal(false)} title="Add Job Site" size="lg">
        <form onSubmit={handleAddSite} className="space-y-4">
          <Input label="Address" placeholder="123 Main St, Sydney NSW" value={siteForm.address} onChange={e => setSiteForm(p => ({ ...p, address: e.target.value }))} required />
          <Select label="Site Type" options={SITE_TYPES.map(t => ({ value: t, label: statusLabel(t) }))} value={siteForm.site_type} onChange={e => setSiteForm(p => ({ ...p, site_type: e.target.value }))} />
          <Select label="Site Access" options={SITE_ACCESS.map(a => ({ value: a, label: statusLabel(a) }))} value={siteForm.site_access} onChange={e => setSiteForm(p => ({ ...p, site_access: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hazards</label>
            <div className="flex flex-wrap gap-2">
              {HAZARDS.map(h => (
                <button key={h} type="button" onClick={() => toggleHazard(h)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${siteForm.hazards.includes(h) ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                  {statusLabel(h)}
                </button>
              ))}
            </div>
          </div>
          <TextArea label="Notes" placeholder="Access notes, special instructions..." value={siteForm.notes} onChange={e => setSiteForm(p => ({ ...p, notes: e.target.value }))} />

          {/* Ongoing Maintenance Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
            <span className="text-sm font-medium text-gray-700">Ongoing Maintenance</span>
            <button type="button" onClick={() => setSiteForm(p => ({ ...p, regular_maintenance: !p.regular_maintenance }))} className={`relative w-11 h-6 rounded-full transition-colors ${siteForm.regular_maintenance ? 'bg-tree-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${siteForm.regular_maintenance ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {siteForm.regular_maintenance && (
            <>
              <Select label="Frequency" options={MAINTENANCE_FREQUENCIES.map(f => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))} value={siteForm.maintenance_frequency} onChange={e => setSiteForm(p => ({ ...p, maintenance_frequency: e.target.value }))} />
              <Input label="Next Visit" type="date" value={siteForm.next_due_at} onChange={e => setSiteForm(p => ({ ...p, next_due_at: e.target.value }))} />
            </>
          )}

          <Button type="submit" loading={saving} className="w-full">Add Site</Button>
        </form>
      </Modal>

      {/* Edit Client Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Client">
        {client && (
          <form onSubmit={handleEditClient} className="space-y-4">
            <Input label="Name" value={client.name} onChange={e => setClient(p => ({ ...p, name: e.target.value }))} required />
            <Input label="Email" type="email" value={client.email || ''} onChange={e => setClient(p => ({ ...p, email: e.target.value }))} />
            <Input label="Phone" type="tel" value={client.phone || ''} onChange={e => setClient(p => ({ ...p, phone: e.target.value }))} />
            <Input label="Address" value={client.address || ''} onChange={e => setClient(p => ({ ...p, address: e.target.value }))} />
            <Select label="Pipeline Stage" value={client.pipeline_stage} onChange={e => setClient(p => ({ ...p, pipeline_stage: e.target.value }))} options={[{ value: 'lead', label: 'Lead' }, { value: 'quoted', label: 'Quoted' }, { value: 'active', label: 'Active' }, { value: 'on_hold', label: 'On Hold' }, { value: 'lost', label: 'Lost' }]} />
            <TextArea label="Notes" value={client.notes || ''} onChange={e => setClient(p => ({ ...p, notes: e.target.value }))} />
            <Button type="submit" loading={saving} className="w-full">Save Changes</Button>
          </form>
        )}
      </Modal>
    </PageWrapper>
  )
}
