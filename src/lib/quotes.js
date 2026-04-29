/**
 * Quote lifecycle helpers — single source of truth for status transitions.
 *
 * The customer-side accept flow lives in the `respond-to-quote` edge function
 * (server-side, runs with service-role). This module mirrors that logic for
 * any place we accept a quote internally — Quotes list, Jobs preview, Jobs
 * quick-action, Job detail page. Keep the two implementations in lockstep.
 */

/**
 * Mark a quote as accepted and propagate to the linked job.
 *
 * Behaviour:
 *  - Sets quote.status = 'accepted' (+ accepted_at timestamp)
 *  - If the quote already has a linked job → updates that job to 'approved'
 *  - If no linked job exists → creates one with status 'approved' and links back
 *
 * Returns the updated quote and the resulting job. Throws on any DB error so
 * callers can decide how to surface it (toast, console, etc).
 *
 * @param {SupabaseClient} supabase
 * @param {string} quoteId
 * @returns {Promise<{ quote: Quote, job: Job }>}
 */
export async function acceptQuote(supabase, quoteId) {
  // Snapshot the quote first — we need business_id, client_id, job_id, etc.
  const { data: existing, error: fetchErr } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .single()
  if (fetchErr || !existing) throw fetchErr || new Error('Quote not found')

  // 1. Flip quote → accepted
  const { data: quote, error: quoteErr } = await supabase
    .from('quotes')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', quoteId)
    .select()
    .single()
  if (quoteErr) throw quoteErr

  // 2. Resolve the linked job (update existing or create new)
  let job
  if (existing.job_id) {
    const { data, error } = await supabase
      .from('jobs')
      .update({ status: 'approved' })
      .eq('id', existing.job_id)
      .select()
      .single()
    if (error) throw error
    job = data
  } else {
    const inferredType = (existing.scope?.split('\n')[0] || '').slice(0, 50) || 'Quote'
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        business_id: existing.business_id,
        client_id: existing.client_id,
        job_site_id: existing.job_site_id,
        quote_id: existing.id,
        status: 'approved',
        job_type: inferredType,
        priority: 'normal',
      })
      .select()
      .single()
    if (error) throw error
    job = data
    // Link the quote back to the new job
    await supabase.from('quotes').update({ job_id: job.id }).eq('id', existing.id)
  }

  return { quote, job }
}
