import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { useClients } from '../hooks/useClients'
import { useJobSites } from '../hooks/useJobSites'
import { useStaff } from '../hooks/useStaff'
import PageWrapper from '../components/layout/PageWrapper'
import Header from '../components/layout/Header'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Input, TextArea } from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import FilterChips from '../components/ui/FilterChips'
import PageHero from '../components/layout/PageHero'
import { useConfirm } from '../contexts/ConfirmContext'
import ClientPicker from '../components/pickers/ClientPicker'
import JobSitePicker from '../components/pickers/JobSitePicker'
import JobTypePicker from '../components/pickers/JobTypePicker'
import JobDetailView from '../components/jobs/JobDetailView'
import Card from '../components/ui/Card'
import { statusLabel, statusColor, formatCurrency, calculateGST, PRIORITY_STYLES, cn } from '../lib/utils'

// 4-stage pipeline: Quoted → Scheduled → Invoice → Completed
const LIST_FILTERS = [
  { key: 'quoted', label: 'Quoted', statuses: ['enquiry', 'site_visit', 'quoted', 'approved'] },
  { key: 'scheduled', label: 'Scheduled', statuses: ['scheduled', 'in_progress'] },
  { key: 'invoice', label: 'Invoice', statuses: ['completed', 'invoiced'] },
  { key: 'completed', label: 'Completed', statuses: ['paid'] },
]


export default function Jobs() {
  const confirm = useConfirm()
  const { business } = useBusiness()
  const { clients, createClient, updateClient } = useClients(business?.id)
  const { jobSites, createJobSite, updateJobSite, getJobSitesByClient } = useJobSites(business?.id)
  const { staff } = useStaff(business?.id)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [jobs, setJobs] = useState([])
  const [quotes, setQuotes] = useState({}) // quote_id -> quote
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(() => {
    const param = searchParams.get('status')
    if (!param) return 'quoted'
    // Map DB statuses to simplified filter keys
    const filterForStatus = LIST_FILTERS.find(f => f.statuses?.includes(param))
    return filterForStatus ? filterForStatus.key : 'quoted'
  })
  const [viewMode, setViewMode] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= 768 ? 'pipeline' : 'list'
  ) // 'list' | 'pipeline'
  const [showModal, setShowModal] = useState(!!searchParams.get('new'))
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: searchParams.get('client_id') || '', job_site_id: '', job_type: '',
    scheduled_date: '', scheduled_time: '09:00', notes: '',
  })
  const [jobTypes, setJobTypes] = useState([])
  const [previewJob, setPreviewJob] = useState(null) // job detail modal
  const [previewData, setPreviewData] = useState({ client: null, site: null, quote: null, reports: [] })
  const [previewUpdating, setPreviewUpdating] = useState(false)
  // Quote editor modal
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [quoteEditId, setQuoteEditId] = useState(null)
  const [quoteLinkedJobId, setQuoteLinkedJobId] = useState(null)
  const [quoteForm, setQuoteForm] = useState({
    client_id: '', job_site_id: '', scope: '', terms: 'Payment due within 14 days of invoice.\nAll prices include GST.\nQuote valid for 30 days.',
    line_items: [{ description: '', quantity: 1, unit_price: 0 }], inclusions: '', exclusions: '',
  })
  const [quoteStatus, setQuoteStatus] = useState(null)
  const [quoteSaving, setQuoteSaving] = useState(false)
  const [quoteSending, setQuoteSending] = useState(false)
  // New Job modal step (1 = job form, 2 = add quote)
  const [newJobStep, setNewJobStep] = useState(1)
  const [newJobQuoteForm, setNewJobQuoteForm] = useState({
    line_items: [{ description: '', quantity: 1, unit_price: 0 }],
    scope: '', inclusions: '', exclusions: '',
    terms: 'Payment due within 14 days of invoice.\nAll prices include GST.\nQuote valid for 30 days.',
  })

  useEffect(() => {
    if (!business?.id) return
    const fetchJobs = async () => {
      const { data } = await supabase.from('jobs').select('*').eq('business_id', business.id).order('created_at', { ascending: false })
      const jobList = data || []
      setJobs(jobList)
      setLoading(false)

      // Fetch linked quotes for value display
      const quoteIds = [...new Set(jobList.filter(j => j.quote_id).map(j => j.quote_id))]
      if (quoteIds.length) {
        const { data: quotesData } = await supabase.from('quotes').select('id,total,status').in('id', quoteIds)
        setQuotes(Object.fromEntries((quotesData || []).map(q => [q.id, q])))
      }
    }
    const fetchJobTypes = async () => {
      const { data } = await supabase.from('job_type_templates').select('*').eq('business_id', business.id)
      setJobTypes(data || [])
    }
    fetchJobs()
    fetchJobTypes()
  }, [business?.id])

  const activeFilter = LIST_FILTERS.find(f => f.key === filter) || LIST_FILTERS[0]
  const filtered = jobs.filter(j => activeFilter.statuses.includes(j.status))
  const isCompletedView = filter === 'completed'

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))
  const siteMap = Object.fromEntries(jobSites.map(s => [s.id, s]))
  const clientSites = form.client_id ? getJobSitesByClient(form.client_id) : []

  const createJobTypeTemplate = async (name) => {
    const { data, error } = await supabase
      .from('job_type_templates')
      .insert({ business_id: business.id, name })
      .select()
      .single()
    if (!error && data) setJobTypes(prev => [...prev, data])
  }

  // ── Job Preview Modal ──────────────────────────────────────────────────────
  const openPreview = async (job) => {
    setPreviewJob(job)
    const [c, s, q, r] = await Promise.all([
      job.client_id ? supabase.from('clients').select('*').eq('id', job.client_id).single() : { data: null },
      job.job_site_id ? supabase.from('job_sites').select('*').eq('id', job.job_site_id).single() : { data: null },
      job.quote_id ? supabase.from('quotes').select('*').eq('id', job.quote_id).single() : { data: null },
      supabase.from('job_reports').select('*').eq('job_id', job.id).order('created_at', { ascending: false }),
    ])
    setPreviewData({ client: c.data, site: s.data, quote: q.data, reports: r.data || [] })
  }

  const closePreview = () => {
    setPreviewJob(null)
    setPreviewData({ client: null, site: null, quote: null, reports: [] })
  }

  const previewStatusChange = async (status) => {
    if (!previewJob) return
    setPreviewUpdating(true)
    const updates = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    if (status === 'paid') updates.completed_at = updates.completed_at || new Date().toISOString()
    const { data } = await supabase.from('jobs').update(updates).eq('id', previewJob.id).select().single()
    if (data) {
      setJobs(prev => prev.map(j => j.id === data.id ? data : j))
    }
    setPreviewUpdating(false)
    closePreview()
  }

  const previewAcceptQuote = async () => {
    if (!previewData.quote?.id || !previewJob) return
    setPreviewUpdating(true)
    const { data: updatedQuote } = await supabase.from('quotes').update({ status: 'accepted' }).eq('id', previewData.quote.id).select().single()
    if (updatedQuote) setPreviewData(prev => ({ ...prev, quote: updatedQuote }))
    const { data: updatedJob } = await supabase.from('jobs').update({ status: 'approved' }).eq('id', previewJob.id).select().single()
    if (updatedJob) {
      setPreviewJob(updatedJob)
      setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j))
    }
    setPreviewUpdating(false)
  }

  // ── Quote Editor Modal ─────────────────────────────────────────────────────
  const openQuoteModal = async (quoteId, jobId) => {
    setQuoteEditId(quoteId || null)
    setQuoteLinkedJobId(jobId || null)
    setQuoteStatus(null)
    if (quoteId) {
      const { data } = await supabase.from('quotes').select('*').eq('id', quoteId).single()
      if (data) {
        setQuoteForm({
          client_id: data.client_id || '', job_site_id: data.job_site_id || '',
          scope: data.scope || '', terms: data.terms || 'Payment due within 14 days of invoice.\nAll prices include GST.\nQuote valid for 30 days.',
          line_items: data.line_items || [{ description: '', quantity: 1, unit_price: 0 }],
          inclusions: data.inclusions || '', exclusions: data.exclusions || '',
        })
        setQuoteStatus(data.status)
        if (data.job_id) setQuoteLinkedJobId(data.job_id)
      }
    } else if (jobId) {
      const { data: job } = await supabase.from('jobs').select('*').eq('id', jobId).single()
      if (job) {
        setQuoteForm(prev => ({
          ...prev, client_id: job.client_id || '', job_site_id: job.job_site_id || '',
          scope: job.job_type ? `${job.job_type}${job.notes ? ` - ${job.notes}` : ''}` : '',
          line_items: [{ description: '', quantity: 1, unit_price: 0 }],
          inclusions: '', exclusions: '',
        }))
      }
    } else {
      setQuoteForm({
        client_id: '', job_site_id: '', scope: '', terms: 'Payment due within 14 days of invoice.\nAll prices include GST.\nQuote valid for 30 days.',
        line_items: [{ description: '', quantity: 1, unit_price: 0 }], inclusions: '', exclusions: '',
      })
    }
    setShowQuoteModal(true)
  }

  const closeQuoteModal = () => {
    setShowQuoteModal(false)
    setQuoteEditId(null)
    setQuoteLinkedJobId(null)
  }

  const quoteSubtotal = quoteForm.line_items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
  const { gst: quoteGst, total: quoteTotal } = calculateGST(quoteSubtotal)

  const saveQuote = async (status = 'draft') => {
    const payload = {
      business_id: business.id, client_id: quoteForm.client_id || null, job_site_id: quoteForm.job_site_id || null,
      scope: quoteForm.scope, terms: quoteForm.terms, line_items: quoteForm.line_items,
      subtotal: quoteSubtotal, gst: quoteGst, total: quoteTotal, status,
      inclusions: quoteForm.inclusions || null, exclusions: quoteForm.exclusions || null,
      job_id: quoteLinkedJobId || null,
    }
    if (quoteEditId) {
      await supabase.from('quotes').update(payload).eq('id', quoteEditId)
      return { id: quoteEditId }
    } else {
      const { data } = await supabase.from('quotes').insert(payload).select().single()
      if (data) {
        if (quoteLinkedJobId) {
          await supabase.from('jobs').update({ quote_id: data.id, status: 'quoted' }).eq('id', quoteLinkedJobId)
        } else {
          const { data: newJob } = await supabase.from('jobs').insert({
            business_id: business.id, client_id: quoteForm.client_id || null, job_site_id: quoteForm.job_site_id || null,
            quote_id: data.id, status: 'quoted', job_type: quoteForm.scope?.split('\n')[0]?.substring(0, 50) || 'Quote',
          }).select().single()
          if (newJob) {
            await supabase.from('quotes').update({ job_id: newJob.id }).eq('id', data.id)
            setQuoteLinkedJobId(newJob.id)
          }
        }
        return data
      }
    }
    return { id: quoteEditId }
  }

  const handleQuoteSave = async () => {
    setQuoteSaving(true)
    await saveQuote('draft')
    setQuoteSaving(false)
    closeQuoteModal()
    refreshJobs()
  }

  const handleQuoteSend = async () => {
    const hasValidItem = quoteForm.line_items.some(item => item.description?.trim() && Number(item.unit_price) > 0)
    const clientEmail = clients.find(c => c.id === quoteForm.client_id)?.email
    if (!hasValidItem || !clientEmail) return
    if (quoteStatus === 'accepted') {
      const ok = await confirm({
        title: 'Quote already accepted',
        description: 'Send an amended quote to the client?',
        confirmLabel: 'Send amended',
      })
      if (!ok) return
    } else if (quoteStatus === 'sent' || quoteStatus === 'viewed') {
      const ok = await confirm({
        title: 'Quote already sent',
        description: 'Send it again? The client will receive another email.',
        confirmLabel: 'Send again',
      })
      if (!ok) return
    }
    setQuoteSending(true)
    const quote = await saveQuote('sent')
    if (quote?.id) {
      await supabase.functions.invoke('send-quote', { body: { quote_id: quote.id } })
    }
    setQuoteSending(false)
    closeQuoteModal()
    refreshJobs()
  }

  const refreshJobs = async () => {
    const { data } = await supabase.from('jobs').select('*').eq('business_id', business.id).order('created_at', { ascending: false })
    const jobList = data || []
    setJobs(jobList)
    const quoteIds = [...new Set(jobList.filter(j => j.quote_id).map(j => j.quote_id))]
    if (quoteIds.length) {
      const { data: quotesData } = await supabase.from('quotes').select('id,total,status').in('id', quoteIds)
      setQuotes(Object.fromEntries((quotesData || []).map(q => [q.id, q])))
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.client_id) return
    setSaving(true)
    const hasDate = !!form.scheduled_date
    let scheduled_start = null
    let scheduled_end = null
    if (hasDate && form.scheduled_time) {
      const startDt = new Date(`${form.scheduled_date}T${form.scheduled_time}`)
      scheduled_start = startDt.toISOString()
      scheduled_end = new Date(startDt.getTime() + 60 * 60000).toISOString()
    }
    const { data, error } = await supabase.from('jobs').insert({
      business_id: business.id,
      client_id: form.client_id || null,
      job_site_id: form.job_site_id || null,
      job_type: form.job_type || null,
      scheduled_date: hasDate ? form.scheduled_date : null,
      scheduled_start: hasDate ? scheduled_start : null,
      scheduled_end: hasDate ? scheduled_end : null,
      notes: form.notes || null,
      status: hasDate ? 'scheduled' : 'enquiry',
      priority: 'normal',
    }).select().single()
    if (!error) {
      setJobs(prev => [data, ...prev])
      closeNewJobModal()
    }
    setSaving(false)
  }

  const handleCreateWithQuote = async (send = false) => {
    if (!form.client_id) return
    if (send && !newJobQuoteForm.line_items.some(item => item.description?.trim() && Number(item.unit_price) > 0)) return
    setSaving(true)
    const hasDate = !!form.scheduled_date
    let scheduled_start = null
    let scheduled_end = null
    if (hasDate && form.scheduled_time) {
      const startDt = new Date(`${form.scheduled_date}T${form.scheduled_time}`)
      scheduled_start = startDt.toISOString()
      scheduled_end = new Date(startDt.getTime() + 60 * 60000).toISOString()
    }
    const { data: jobData, error } = await supabase.from('jobs').insert({
      business_id: business.id,
      client_id: form.client_id || null,
      job_site_id: form.job_site_id || null,
      job_type: form.job_type || null,
      scheduled_date: hasDate ? form.scheduled_date : null,
      scheduled_start: hasDate ? scheduled_start : null,
      scheduled_end: hasDate ? scheduled_end : null,
      notes: form.notes || null,
      status: 'quoted',
      priority: 'normal',
    }).select().single()
    if (!error && jobData) {
      const njqSubtotal = newJobQuoteForm.line_items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
      const { gst: njqGst, total: njqTotal } = calculateGST(njqSubtotal)
      const { data: quoteData } = await supabase.from('quotes').insert({
        business_id: business.id,
        client_id: form.client_id || null,
        job_site_id: form.job_site_id || null,
        job_id: jobData.id,
        scope: newJobQuoteForm.scope || null,
        terms: newJobQuoteForm.terms || null,
        line_items: newJobQuoteForm.line_items,
        subtotal: njqSubtotal, gst: njqGst, total: njqTotal,
        inclusions: newJobQuoteForm.inclusions || null,
        exclusions: newJobQuoteForm.exclusions || null,
        status: send ? 'sent' : 'draft',
      }).select().single()
      if (quoteData) {
        await supabase.from('jobs').update({ quote_id: quoteData.id }).eq('id', jobData.id)
        if (send) {
          await supabase.functions.invoke('send-quote', { body: { quote_id: quoteData.id } })
        }
        jobData.quote_id = quoteData.id
      }
      setJobs(prev => [jobData, ...prev])
      closeNewJobModal()
      await refreshJobs()
    }
    setSaving(false)
  }

  const closeNewJobModal = () => {
    setShowModal(false)
    setNewJobStep(1)
    setForm({ client_id: '', job_site_id: '', job_type: '', scheduled_date: '', scheduled_time: '09:00', notes: '' })
    setNewJobQuoteForm({
      line_items: [{ description: '', quantity: 1, unit_price: 0 }],
      scope: '', inclusions: '', exclusions: '',
      terms: 'Payment due within 14 days of invoice.\nAll prices include GST.\nQuote valid for 30 days.',
    })
  }

  // Extract suburb from full address
  const getSuburb = (address) => {
    if (!address) return ''
    const parts = address.split(',').map(p => p.trim())
    return parts.length >= 2 ? parts[parts.length - 3] || parts[0] : parts[0]
  }

  // ── Job Card (shared between list and pipeline) ────────────────────────────
  const JobCard = ({ job, compact = false, done = false, invoiceView = false, quotedView = false, scheduledView = false }) => {
    const jc = clientMap[job.client_id]
    const js = siteMap[job.job_site_id]
    const quote = quotes[job.quote_id]
    const staffMember = staff.find(s => s.id === job.staff_id)
    const showPriority = job.priority && job.priority !== 'normal'
    const pStyle = PRIORITY_STYLES[job.priority] || {}

    const handleClick = () => {
      openPreview(job)
    }

    const handleQuickEdit = (e) => {
      e.stopPropagation()
      openPreview(job)
    }

    const handleQuickAccept = async (e) => {
      e.stopPropagation()
      if (!job.quote_id) return
      const { data: updatedQuote } = await supabase.from('quotes').update({ status: 'accepted' }).eq('id', job.quote_id).select().single()
      if (updatedQuote) setQuotes(prev => ({ ...prev, [updatedQuote.id]: updatedQuote }))
      const { data: updatedJob } = await supabase.from('jobs').update({ status: 'approved' }).eq('id', job.id).select().single()
      if (updatedJob) setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j))
    }

    const handleQuickComplete = async (e) => {
      e.stopPropagation()
      const { data: updatedJob } = await supabase.from('jobs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', job.id).select().single()
      if (updatedJob) setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j))
    }

    return (
      <div className={`w-full text-left bg-white dark:bg-gray-900 rounded-2xl shadow-card overflow-hidden border border-gray-100/80 hover:border-brand-200 hover:shadow-card-hover hover:-translate-y-0.5 transition-colors duration-150 ${done ? 'opacity-60' : ''}`}>
        <button
          type="button"
          onClick={handleClick}
          className="w-full text-left active:scale-[0.995] transition-colors duration-150"
        >
        {compact ? (
          /* Pipeline compact card */
          <div className="p-3">
            <div className="flex items-start justify-between gap-1.5 mb-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{job.job_type || 'Job'}</p>
              {showPriority && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${pStyle.bg} ${pStyle.text}`}>
                  {job.priority === 'emergency' ? '!!!' : '!!'}
                </span>
              )}
            </div>
            {jc && <p className="text-xs text-gray-600 dark:text-gray-500 truncate">{jc.name}</p>}
            {js?.address && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{getSuburb(js.address)}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {quote?.total > 0 && (
                <span className="text-[11px] font-bold text-brand-600">{formatCurrency(quote.total)}</span>
              )}
              {job.scheduled_date && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {new Date(job.scheduled_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
              )}
              {staffMember && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{staffMember.name}</span>
              )}
            </div>
          </div>
        ) : (
          /* List full card */
          <div className="flex">
            <div className={`w-16 ${done ? 'bg-gray-300' : 'bg-gradient-to-br from-brand-500 to-brand-700'} flex flex-col items-center justify-center text-white flex-shrink-0`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {job.scheduled_date && (
                <p className="text-[10px] font-bold mt-1 leading-tight text-center px-1">
                  {new Date(job.scheduled_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
            <div className="flex-1 p-3 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <p className={`font-bold truncate ${done ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>{job.job_type || 'Job'}</p>
                  {showPriority && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${pStyle.bg} ${pStyle.text}`}>
                      {statusLabel(job.priority)}
                    </span>
                  )}
                </div>
                {invoiceView ? (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap ${job.status === 'invoiced' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {job.status === 'invoiced' ? 'Invoice Sent' : 'Not Sent'}
                  </span>
                ) : quotedView ? (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap ${job.status === 'approved' ? 'bg-green-100 text-green-700' : job.status === 'quoted' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-500'}`}>
                    {job.status === 'approved' ? 'Quote Accepted' : job.status === 'quoted' ? 'Quote Sent' : statusLabel(job.status)}
                  </span>
                ) : (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap ${statusColor(job.status)}`}>
                    {statusLabel(job.status)}
                  </span>
                )}
              </div>
              {jc && (
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {jc.name}
                </p>
              )}
              {js?.address && (
                <p className="text-xs text-gray-500 dark:text-gray-500 truncate flex items-center gap-1.5 mt-0.5">
                  <svg className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {js.address}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500 dark:text-gray-500 flex-wrap">
                {quote?.total > 0 && (
                  <span className="font-bold text-brand-600">{formatCurrency(quote.total)}</span>
                )}
                {job.scheduled_start && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg>
                    {new Date(job.scheduled_start).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                )}
                {job.duration_minutes && <span>· {job.duration_minutes}m</span>}
                {staffMember && <span>· {staffMember.name}</span>}
              </div>
            </div>
          </div>
        )}
        </button>
        {/* Quick actions for Quoted view */}
        {quotedView && !compact && (
          <div className="flex border-t border-gray-100 dark:border-gray-800">
            {job.status === 'approved' ? (
              <>
                <button
                  onClick={handleQuickEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900/50 transition-colors duration-150"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit Job
                </button>
                <div className="w-px bg-gray-100 dark:bg-gray-800" />
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-brand-600 hover:text-white hover:bg-brand-600 transition-colors duration-150"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Schedule
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleQuickEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900/50 transition-colors duration-150"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  {job.quote_id ? 'Edit Quote' : 'Create Quote'}
                </button>
                {job.quote_id && (
                  <>
                    <div className="w-px bg-gray-100 dark:bg-gray-800" />
                    <button
                      onClick={handleQuickAccept}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-brand-600 hover:text-white hover:bg-brand-600 transition-colors duration-150"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Accept
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
        {/* Quick actions for Scheduled view */}
        {scheduledView && !compact && (
          <div className="flex border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleQuickEdit}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900/50 transition-colors duration-150"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit Job
            </button>
            <div className="w-px bg-gray-100 dark:bg-gray-800" />
            <button
              onClick={handleQuickComplete}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-brand-600 hover:text-white hover:bg-brand-600 transition-colors duration-150"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Complete Job
            </button>
          </div>
        )}
        {/* Quick actions for Invoice view */}
        {invoiceView && !compact && (
          <div className="flex border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleQuickEdit}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 dark:bg-gray-900/50 transition-colors duration-150"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit Job
            </button>
            <div className="w-px bg-gray-100 dark:bg-gray-800" />
            <button
              onClick={(e) => { e.stopPropagation(); job.status === 'invoiced' ? openPreview(job) : navigate(`/invoices/new?job_id=${job.id}`) }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-brand-600 hover:text-white hover:bg-brand-600 transition-colors duration-150"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {job.status === 'invoiced' ? 'Mark Paid' : 'Create Invoice'}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Pipeline Kanban View ──────────────────────────────────────────────────
  const PipelineView = () => {
    const columns = [
      { key: 'quoted',    label: 'Quoted',                 statuses: ['enquiry','site_visit','quoted','approved'] },
      { key: 'scheduled', label: 'Scheduled',              statuses: ['scheduled','in_progress'] },
      { key: 'progress',  label: 'In progress',            statuses: ['in_progress'] },
      { key: 'done',      label: 'Done · awaiting invoice',statuses: ['completed','invoiced'] },
    ]
    // Avoid scheduled+in_progress duplicating — separate them properly:
    const filteredColumns = [
      { key: 'quoted',    label: 'Quoted',                 statuses: ['enquiry','site_visit','quoted','approved'] },
      { key: 'scheduled', label: 'Scheduled',              statuses: ['scheduled'] },
      { key: 'progress',  label: 'In progress',            statuses: ['in_progress'] },
      { key: 'done',      label: 'Done · awaiting invoice',statuses: ['completed','invoiced'] },
    ]
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {filteredColumns.map(col => {
          const colJobs = jobs.filter(j => col.statuses.includes(j.status))
          return (
            <div key={col.key} className="bg-shell-2 rounded-card border border-line p-3 min-h-[280px]">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-line-2">
                <div className="eyebrow-muted">{col.label}</div>
                <span className="text-[11px] font-mono tabular-nums text-ink-3">{colJobs.length}</span>
              </div>
              <div className="space-y-2">
                {colJobs.length === 0 ? (
                  <div className="text-[11px] text-ink-4 italic px-1 py-2">—</div>
                ) : (
                  colJobs.map(job => {
                    const ref = `TM-${String(job.id).slice(0, 4).toUpperCase()}`
                    const value = quotes[job.quote_id]?.total
                    const tinted = col.key === 'progress'
                    return (
                      <div
                        key={job.id}
                        onClick={() => openPreview(job)}
                        className={cn(
                          'cursor-pointer rounded-card border p-3 transition-all hover:-translate-y-0.5',
                          tinted
                            ? 'bg-brand-50 dark:bg-brand-950/30 border-brand-200/60 dark:border-brand-800/40 hover:shadow-card-hover'
                            : 'bg-shell border-line hover:shadow-card-hover'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-medium text-brand-600 dark:text-brand-400 tracking-wider">{ref}</span>
                        </div>
                        <p className="text-[13px] font-semibold text-ink-1 leading-snug mb-1">
                          {job.job_type || 'Job'}
                        </p>
                        <p className="text-[11.5px] text-ink-3 mb-2">{clientMap[job.client_id]?.name || '—'}</p>
                        <div className="flex items-center justify-between text-[10.5px] font-mono text-ink-3 tabular-nums">
                          <span className="text-ink-2 font-medium">
                            {value != null ? formatCurrency(value) : (job.scheduled_date || job.scheduled_start ? new Date(job.scheduled_start || job.scheduled_date).toLocaleDateString('en-AU', { weekday:'short', hour:'2-digit', minute:'2-digit' }) : '—')}
                          </span>
                          <span>{job.staff_id ? '·' : (job.created_at ? `${Math.floor((Date.now() - new Date(job.created_at).getTime()) / 86400000)}d` : '')}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <PageWrapper width="wide">
      <div className="md:hidden">
      <Header title="Jobs" subtitle="Track every job from enquiry to completion" rightAction={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'pipeline' : 'list')}
            className="p-2 hover:bg-black/5 rounded-xl transition-colors duration-150"
            title={viewMode === 'list' ? 'Pipeline view' : 'List view'}
          >
            {viewMode === 'list' ? (
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
            ) : (
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            )}
          </button>
          <button onClick={() => openQuoteModal(null, null)} className="px-3 py-1.5 text-xs font-semibold text-brand-600 border-2 border-brand-200 rounded-xl hover:bg-brand-50 transition-colors duration-150 active:scale-95">
            Quick Quote
          </button>
          <button onClick={() => setShowModal(true)} className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 shadow-button transition-colors duration-150 active:scale-95 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            New Job
          </button>
        </div>
      } />
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Desktop hero — mobile uses Header above */}
        <div className="hidden md:block">
          <PageHero
            eyebrow="Jobs board"
            title={(() => {
              const active = jobs.filter(j => !['paid','completed','invoiced'].includes(j.status)).length
              const distinctClients = new Set(jobs.map(j => j.client_id).filter(Boolean)).size
              return `${active} active across ${distinctClients} client${distinctClients === 1 ? '' : 's'}`
            })()}
            action={
              <div className="flex items-center gap-2">
                <button onClick={() => setViewMode(viewMode === 'list' ? 'pipeline' : 'list')} className="pill-ghost">
                  {viewMode === 'pipeline' ? 'List' : 'Board'}
                </button>
                <Button onClick={() => setShowModal(true)}>
                  <span className="text-[13px]">+ New job</span>
                </Button>
              </div>
            }
          />
        </div>

        {viewMode === 'list' && (
          <FilterChips
            options={LIST_FILTERS.map(f => ({
              value: f.key,
              label: f.label,
              count: jobs.filter(j => f.statuses.includes(j.status)).length,
            }))}
            value={filter}
            onChange={setFilter}
            ariaLabel="Job pipeline stage"
          />
        )}

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            title="No jobs" description="Create your first job to get started"
            actionLabel="Create Job" onAction={() => setShowModal(true)}
          />
        ) : viewMode === 'pipeline' ? (
          <PipelineView />
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400 dark:text-gray-500">No {activeFilter.label.toLowerCase()} jobs</p>
          </div>
        ) : (
          <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
            {filtered.map(job => <JobCard key={job.id} job={job} done={isCompletedView} invoiceView={filter === 'invoice'} quotedView={filter === 'quoted'} scheduledView={filter === 'scheduled'} />)}
          </div>
        )}
      </div>

      {/* Job Preview Modal (Quoted tab) */}
      <Modal open={!!previewJob} onClose={closePreview} title={previewJob?.job_type || 'Job'} size="lg">
        {previewJob && (
          <JobDetailView
            job={previewJob}
            client={previewData.client}
            site={previewData.site}
            quote={previewData.quote}
            staff={staff}
            reports={previewData.reports}
            updating={previewUpdating}
            compact
            readOnly
            onStatusChange={previewStatusChange}
            onEditQuote={previewData.quote ? () => { closePreview(); openQuoteModal(previewData.quote.id, previewJob.id) } : null}
            onAcceptQuote={previewData.quote ? previewAcceptQuote : null}
            onCreateQuote={() => { closePreview(); openQuoteModal(null, previewJob.id) }}
            onCreateInvoice={() => { closePreview(); navigate(`/invoices/new?job_id=${previewJob.id}`) }}
            onEdit={() => { closePreview(); navigate(`/jobs/${previewJob.id}`) }}
          />
        )}
      </Modal>

      {/* Quote Editor Modal */}
      <Modal open={showQuoteModal} onClose={closeQuoteModal} title={quoteEditId ? 'Edit Quote' : 'New Quote'} size="lg">
        <div className="space-y-4">
          {quoteStatus === 'accepted' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-800">This quote has been accepted</p>
                <p className="text-[11px] text-amber-600">Changes will require resending to the customer.</p>
              </div>
            </div>
          )}
          <Card className="p-4 space-y-3">
            <ClientPicker
              clients={clients}
              value={quoteForm.client_id}
              onChange={(id) => setQuoteForm(p => ({ ...p, client_id: id, job_site_id: '' }))}
              onCreate={createClient}
              onUpdate={updateClient}
            />
            <JobSitePicker
              sites={quoteForm.client_id ? getJobSitesByClient(quoteForm.client_id) : []}
              client={clients.find(c => c.id === quoteForm.client_id)}
              clientId={quoteForm.client_id}
              value={quoteForm.job_site_id}
              onChange={(id) => setQuoteForm(p => ({ ...p, job_site_id: id }))}
              onCreate={createJobSite}
              onUpdate={updateJobSite}
            />
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Line Items</h3>
            {quoteForm.line_items.map((item, i) => (
              <div key={i} className="space-y-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0 last:mb-0">
                <Input placeholder="Description" value={item.description} onChange={e => {
                  const items = [...quoteForm.line_items]; items[i] = { ...items[i], description: e.target.value }
                  setQuoteForm(p => ({ ...p, line_items: items }))
                }} />
                <div className="flex gap-2 items-end">
                  <Input label="Qty" type="number" min="1" value={item.quantity} onChange={e => {
                    const items = [...quoteForm.line_items]; items[i] = { ...items[i], quantity: e.target.value }
                    setQuoteForm(p => ({ ...p, line_items: items }))
                  }} className="w-20" />
                  <Input label="Unit Price" type="number" min="0" step="0.01" value={item.unit_price} onChange={e => {
                    const items = [...quoteForm.line_items]; items[i] = { ...items[i], unit_price: e.target.value }
                    setQuoteForm(p => ({ ...p, line_items: items }))
                  }} className="flex-1" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 pb-3 w-24 text-right">{formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}</p>
                  {quoteForm.line_items.length > 1 && (
                    <button type="button" onClick={() => setQuoteForm(p => ({ ...p, line_items: p.line_items.filter((_, idx) => idx !== i) }))} className="pb-3 text-red-400 hover:text-red-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setQuoteForm(p => ({ ...p, line_items: [...p.line_items, { description: '', quantity: 1, unit_price: 0 }] }))} className="w-full py-2 text-sm text-brand-600 font-medium hover:bg-brand-50 rounded-lg transition-colors">+ Add Line Item</button>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-500">Subtotal</span><span>{formatCurrency(quoteSubtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-500">GST (10%)</span><span>{formatCurrency(quoteGst)}</span></div>
              <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatCurrency(quoteTotal)}</span></div>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <TextArea label="Scope of Work" placeholder="Describe the work to be performed..." value={quoteForm.scope} onChange={e => setQuoteForm(p => ({ ...p, scope: e.target.value }))} />
            <TextArea label="Inclusions" placeholder="What's included..." value={quoteForm.inclusions} onChange={e => setQuoteForm(p => ({ ...p, inclusions: e.target.value }))} rows={3} />
            <TextArea label="Exclusions" placeholder="What's NOT included..." value={quoteForm.exclusions} onChange={e => setQuoteForm(p => ({ ...p, exclusions: e.target.value }))} rows={3} />
            <TextArea label="Terms & Conditions" value={quoteForm.terms} onChange={e => setQuoteForm(p => ({ ...p, terms: e.target.value }))} />
          </Card>

          {(() => {
            const hasValidItem = quoteForm.line_items.some(item => item.description?.trim() && Number(item.unit_price) > 0)
            const selectedClient = clients.find(c => c.id === quoteForm.client_id)
            const clientEmail = selectedClient?.email
            return (
              <>
                {clientEmail && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 text-center">Sending to: <span className="font-medium text-gray-700 dark:text-gray-300">{clientEmail}</span></p>
                )}
                {quoteForm.client_id && !clientEmail && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">No email on file for this client. Quote cannot be sent.</p>
                )}
                {!hasValidItem && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Add at least 1 line item with a description and price to send the quote.</p>
                )}
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleQuoteSave} loading={quoteSaving} className="flex-1">Save Draft</Button>
                  <Button onClick={handleQuoteSend} loading={quoteSending} disabled={!hasValidItem || !clientEmail} className="flex-1">Send Quote</Button>
                </div>
              </>
            )
          })()}
        </div>
      </Modal>

      {/* Create Job Modal (2-step: Job → Quote) */}
      <Modal open={showModal} onClose={closeNewJobModal} title={newJobStep === 1 ? 'New Job' : 'Add Quote'} size={newJobStep === 2 ? 'lg' : 'md'}>
        {newJobStep === 1 ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <ClientPicker
              clients={clients}
              value={form.client_id}
              onChange={(id) => setForm(p => ({ ...p, client_id: id, job_site_id: '' }))}
              onCreate={createClient}
              onUpdate={updateClient}
              required
            />
            {form.client_id && (
              <JobSitePicker
                sites={clientSites}
                client={clients.find(c => c.id === form.client_id)}
                clientId={form.client_id}
                value={form.job_site_id}
                onChange={(id) => setForm(p => ({ ...p, job_site_id: id }))}
                onCreate={createJobSite}
                onUpdate={updateJobSite}
              />
            )}
            <JobTypePicker
              templates={jobTypes}
              value={form.job_type}
              onChange={(v) => setForm(p => ({ ...p, job_type: v }))}
              onCreateTemplate={createJobTypeTemplate}
            />
            <div className="flex gap-2">
              <Input label="Date" type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} placeholder={new Date().toISOString().split('T')[0]} className="flex-[2]" />
              <Input label="Time" type="time" value={form.scheduled_time} onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))} className="w-28" />
            </div>
            {!form.scheduled_date && (
              <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">Leave blank to start as an enquiry</p>
            )}
            <TextArea label="Notes" placeholder="Job notes, access instructions..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            {!form.client_id && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Please select or create a client before continuing.</p>
            )}
            <button
              type="button"
              disabled={!form.client_id}
              onClick={() => {
                setNewJobQuoteForm(p => ({ ...p, scope: form.job_type ? `${form.job_type}${form.notes ? ` - ${form.notes}` : ''}` : p.scope }))
                setNewJobStep(2)
              }}
              className={`w-full py-2.5 text-sm font-semibold border-2 rounded-2xl transition-colors duration-150 flex items-center justify-center gap-2 ${
                form.client_id
                  ? 'text-brand-600 border-brand-200 hover:bg-brand-50'
                  : 'text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-800 cursor-not-allowed opacity-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Add Quote
            </button>
            <Button type="submit" loading={saving} disabled={!form.client_id} className="w-full">Create Job</Button>
          </form>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setNewJobStep(1)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back to Job Details
            </button>

            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Line Items</h3>
              {newJobQuoteForm.line_items.map((item, i) => (
                <div key={i} className="space-y-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0 last:mb-0">
                  <Input placeholder="Description" value={item.description} onChange={e => {
                    const items = [...newJobQuoteForm.line_items]; items[i] = { ...items[i], description: e.target.value }
                    setNewJobQuoteForm(p => ({ ...p, line_items: items }))
                  }} />
                  <div className="flex gap-2 items-end">
                    <Input label="Qty" type="number" min="1" value={item.quantity} onChange={e => {
                      const items = [...newJobQuoteForm.line_items]; items[i] = { ...items[i], quantity: e.target.value }
                      setNewJobQuoteForm(p => ({ ...p, line_items: items }))
                    }} className="w-20" />
                    <Input label="Unit Price" type="number" min="0" step="0.01" value={item.unit_price} onChange={e => {
                      const items = [...newJobQuoteForm.line_items]; items[i] = { ...items[i], unit_price: e.target.value }
                      setNewJobQuoteForm(p => ({ ...p, line_items: items }))
                    }} className="flex-1" />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 pb-3 w-24 text-right">{formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}</p>
                    {newJobQuoteForm.line_items.length > 1 && (
                      <button type="button" onClick={() => setNewJobQuoteForm(p => ({ ...p, line_items: p.line_items.filter((_, idx) => idx !== i) }))} className="pb-3 text-red-400 hover:text-red-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setNewJobQuoteForm(p => ({ ...p, line_items: [...p.line_items, { description: '', quantity: 1, unit_price: 0 }] }))} className="w-full py-2 text-sm text-brand-600 font-medium hover:bg-brand-50 rounded-lg transition-colors">+ Add Line Item</button>
              {(() => {
                const njSub = newJobQuoteForm.line_items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
                const { gst: njGst, total: njTotal } = calculateGST(njSub)
                return (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
                    <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-500">Subtotal</span><span>{formatCurrency(njSub)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-500">GST (10%)</span><span>{formatCurrency(njGst)}</span></div>
                    <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatCurrency(njTotal)}</span></div>
                  </div>
                )
              })()}
            </Card>

            <Card className="p-4 space-y-3">
              <TextArea label="Scope of Work" placeholder="Describe the work to be performed..." value={newJobQuoteForm.scope} onChange={e => setNewJobQuoteForm(p => ({ ...p, scope: e.target.value }))} />
              <TextArea label="Inclusions" placeholder="What's included..." value={newJobQuoteForm.inclusions} onChange={e => setNewJobQuoteForm(p => ({ ...p, inclusions: e.target.value }))} rows={3} />
              <TextArea label="Exclusions" placeholder="What's NOT included..." value={newJobQuoteForm.exclusions} onChange={e => setNewJobQuoteForm(p => ({ ...p, exclusions: e.target.value }))} rows={3} />
              <TextArea label="Terms & Conditions" value={newJobQuoteForm.terms} onChange={e => setNewJobQuoteForm(p => ({ ...p, terms: e.target.value }))} />
            </Card>

            {(() => {
              const hasValidItem = newJobQuoteForm.line_items.some(item => item.description?.trim() && Number(item.unit_price) > 0)
              const selectedClient = clients.find(c => c.id === form.client_id)
              const clientEmail = selectedClient?.email
              return (
                <>
                  {clientEmail && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 text-center">Sending to: <span className="font-medium text-gray-700 dark:text-gray-300">{clientEmail}</span></p>
                  )}
                  {!clientEmail && form.client_id && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">No email on file for this client. Quote cannot be sent.</p>
                  )}
                  {!hasValidItem && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Add at least 1 line item with a description and price to send the quote.</p>
                  )}
                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => handleCreateWithQuote(false)} loading={saving} className="flex-1">Save Draft</Button>
                    <Button onClick={() => handleCreateWithQuote(true)} loading={saving} disabled={!hasValidItem || !clientEmail} className="flex-1">Create Job + Send Quote</Button>
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </Modal>
    </PageWrapper>
  )
}
