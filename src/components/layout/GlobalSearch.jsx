import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Briefcase, Users, FileText, Receipt, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../hooks/useBusiness'

const MIN_QUERY = 2
const DEBOUNCE_MS = 250

function debounce(fn, ms) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

/**
 * GlobalSearch — ⌘K-accessible header search across clients, jobs, quotes, invoices.
 *
 * Lives in the desktop TopNav row 1. Hidden on mobile (mobile uses page-level search).
 */
export default function GlobalSearch({ className }) {
  const navigate = useNavigate()
  const { business } = useBusiness()
  const bizId = business?.id

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({ clients: [], jobs: [], quotes: [], invoices: [] })

  const inputRef = useRef(null)
  const containerRef = useRef(null)

  // ⌘K / Ctrl+K opens & focuses
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Outside-click closes
  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const runSearch = useCallback(
    debounce(async (q, biz) => {
      if (!biz || q.length < MIN_QUERY) {
        setResults({ clients: [], jobs: [], quotes: [], invoices: [] })
        setLoading(false)
        return
      }
      setLoading(true)
      const term = `%${q}%`
      try {
        const [clients, jobs, quotes, invoices] = await Promise.all([
          supabase.from('clients').select('id, name, email, phone').eq('business_id', biz)
            .or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term}`).limit(5),
          supabase.from('jobs').select('id, title, status, client_name').eq('business_id', biz)
            .or(`title.ilike.${term},client_name.ilike.${term}`).limit(5),
          supabase.from('quotes').select('id, quote_number, title').eq('business_id', biz)
            .or(`quote_number.ilike.${term},title.ilike.${term}`).limit(5),
          supabase.from('invoices').select('id, invoice_number, title').eq('business_id', biz)
            .or(`invoice_number.ilike.${term},title.ilike.${term}`).limit(5),
        ])
        setResults({
          clients:  clients.data  || [],
          jobs:     jobs.data     || [],
          quotes:   quotes.data   || [],
          invoices: invoices.data || [],
        })
      } catch (err) {
        console.warn('[GlobalSearch] error:', err?.message)
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS),
    [],
  )

  useEffect(() => { runSearch(query, bizId) }, [query, bizId, runSearch])

  const totalResults =
    results.clients.length + results.jobs.length + results.quotes.length + results.invoices.length

  function go(path) {
    setOpen(false)
    setQuery('')
    navigate(path)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" strokeWidth={2} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search jobs, clients, quotes, invoices..."
          className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 pl-9 pr-14 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 dark:text-gray-100"
          style={{ fontSize: '14px' }}
        />
        <kbd className="hidden sm:inline-flex absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] font-semibold text-gray-500 dark:text-gray-500 tabular-nums">
          ⌘K
        </kbd>
      </div>

      {open && query.length >= MIN_QUERY && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-elevated max-h-[60vh] overflow-y-auto z-40 animate-fade-in">
          {loading && (
            <div className="px-4 py-6 flex items-center justify-center text-sm text-gray-500 dark:text-gray-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching…
            </div>
          )}
          {!loading && totalResults === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-500">
              No results for <span className="font-semibold">"{query}"</span>
            </div>
          )}
          {!loading && (
            <>
              <Group label="Clients" Icon={Users} color="violet" rows={results.clients.map(c => ({
                key: c.id,
                title: c.name,
                subtitle: c.email || c.phone || '',
                onClick: () => go(`/clients/${c.id}`),
              }))} />
              <Group label="Jobs" Icon={Briefcase} color="brand" rows={results.jobs.map(j => ({
                key: j.id,
                title: j.title || 'Untitled job',
                subtitle: j.client_name || j.status || '',
                onClick: () => go(`/jobs/${j.id}`),
              }))} />
              <Group label="Quotes" Icon={FileText} color="blue" rows={results.quotes.map(q => ({
                key: q.id,
                title: q.title || q.quote_number || 'Quote',
                subtitle: q.quote_number || '',
                onClick: () => go(`/quotes/${q.id}`),
              }))} />
              <Group label="Invoices" Icon={Receipt} color="amber" rows={results.invoices.map(i => ({
                key: i.id,
                title: i.title || i.invoice_number || 'Invoice',
                subtitle: i.invoice_number || '',
                onClick: () => go(`/invoices/${i.id}`),
              }))} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

const COLOR_CLASSES = {
  brand:  'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400',
  blue:   'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  amber:  'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
}

function Group({ label, Icon, color, rows }) {
  if (!rows.length) return null
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="section-title">{label}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">{rows.length}</span>
      </div>
      {rows.map(row => (
        <button
          key={row.key}
          onClick={row.onClick}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:bg-gray-900/50 dark:hover:bg-gray-800/60 transition-colors text-left"
        >
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', COLOR_CLASSES[color] || COLOR_CLASSES.brand)}>
            <Icon className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{row.title}</p>
            {row.subtitle && <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{row.subtitle}</p>}
          </div>
        </button>
      ))}
    </div>
  )
}
