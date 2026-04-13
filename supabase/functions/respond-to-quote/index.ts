import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { quote_id, response } = await req.json()

    const status = response === 'accept' ? 'accepted' : 'declined'
    await supabase.from('quotes').update({
      status,
      [response === 'accept' ? 'accepted_at' : 'declined_at']: new Date().toISOString(),
    }).eq('id', quote_id)

    const { data: quote } = await supabase.from('quotes').select('*, clients(*)').eq('id', quote_id).single()
    const { data: business } = quote ? await supabase.from('businesses').select('*').eq('id', quote.business_id).single() : { data: null }

    // If accepted, update existing linked job to approved or create one
    if (response === 'accept' && quote) {
      if (quote.job_id) {
        await supabase.from('jobs').update({ status: 'approved' }).eq('id', quote.job_id)
      } else {
        const { data: newJob } = await supabase.from('jobs').insert({
          business_id: quote.business_id,
          client_id: quote.client_id,
          job_site_id: quote.job_site_id,
          quote_id: quote.id,
          status: 'approved',
        }).select().single()
        if (newJob) {
          await supabase.from('quotes').update({ job_id: newJob.id }).eq('id', quote.id)
        }
      }
    }

    await supabase.from('activity_feed').insert({
      business_id: quote?.business_id,
      type: response === 'accept' ? 'quote_accepted' : 'quote_declined',
      message: `Quote ${status} by ${quote?.clients?.name || 'client'}`,
    })

    // Send acceptance emails
    if (response === 'accept' && quote && Deno.env.get('RESEND_API_KEY')) {
      const apiKey = Deno.env.get('RESEND_API_KEY')!
      const businessName = business?.name || 'TreePro'
      const clientName = quote.clients?.name || 'there'
      const totalFmt = `$${Number(quote.total || 0).toFixed(2)}`

      // Email to client - confirmation with business contact details
      if (quote.clients?.email) {
        const clientHtml = `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#22c55e,#15803d);padding:24px;border-radius:12px 12px 0 0;">
              <h1 style="color:white;margin:0;">${businessName}</h1>
              <p style="color:rgba(255,255,255,0.9);margin:4px 0 0;">Quote Accepted</p>
            </div>
            <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;">
              <p>Hi ${clientName},</p>
              <p>Thank you for accepting your quote with <strong>${businessName}</strong>! We've received your confirmation and our team will reach out to you shortly to schedule the work.</p>
              <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;">
                <p style="margin:0;font-size:14px;color:#6b7280;">Quote Total</p>
                <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#15803d;">${totalFmt}</p>
              </div>
              <p>If you need to make any adjustments or have questions about your quote, please get in touch with us:</p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:8px;margin:16px 0;">
                <p style="margin:0 0 8px;font-weight:600;color:#15803d;">${businessName}</p>
                ${business?.phone ? `<p style="margin:4px 0;color:#374151;">📞 <a href="tel:${business.phone}" style="color:#15803d;text-decoration:none;">${business.phone}</a></p>` : ''}
                ${business?.email ? `<p style="margin:4px 0;color:#374151;">✉️ <a href="mailto:${business.email}" style="color:#15803d;text-decoration:none;">${business.email}</a></p>` : ''}
              </div>
              <p style="color:#6b7280;font-size:14px;margin-top:24px;">Thanks again for choosing ${businessName}.</p>
            </div>
          </div>
        `

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${businessName} <info@tree.matehq.online>`,
            to: [quote.clients.email],
            subject: `Quote Accepted - ${businessName}`,
            html: clientHtml,
          }),
        })
      }

      // Email to business - notification of acceptance
      if (business?.email) {
        const businessHtml = `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#22c55e,#15803d);padding:24px;border-radius:12px 12px 0 0;">
              <h1 style="color:white;margin:0;">Quote Accepted ✓</h1>
              <p style="color:rgba(255,255,255,0.9);margin:4px 0 0;">A client has accepted their quote</p>
            </div>
            <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;">
              <p>Good news! <strong>${clientName}</strong> has accepted their quote.</p>
              <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;">
                <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">Quote Total</p>
                <p style="margin:0 0 12px;font-size:20px;font-weight:bold;color:#15803d;">${totalFmt}</p>
                <p style="margin:8px 0 4px;font-size:14px;color:#6b7280;">Client</p>
                <p style="margin:0;font-weight:600;">${clientName}</p>
                ${quote.clients?.email ? `<p style="margin:4px 0 0;color:#374151;font-size:14px;">${quote.clients.email}</p>` : ''}
                ${quote.clients?.phone ? `<p style="margin:2px 0 0;color:#374151;font-size:14px;">${quote.clients.phone}</p>` : ''}
              </div>
              <p>The job has been moved to your approved pipeline — ready to schedule.</p>
              <p style="margin-top:24px;"><a href="https://tree-mate-production.up.railway.app/jobs" style="background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">View Jobs</a></p>
            </div>
          </div>
        `

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `TreePro <info@tree.matehq.online>`,
            to: [business.email],
            subject: `Quote Accepted by ${clientName}`,
            html: businessHtml,
          }),
        })
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
