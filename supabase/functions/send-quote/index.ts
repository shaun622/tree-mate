import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { quote_id } = await req.json()

    const { data: quote } = await supabase.from('quotes').select('*').eq('id', quote_id).single()
    if (!quote) throw new Error('Quote not found')

    const { data: business } = await supabase.from('businesses').select('*').eq('id', quote.business_id).single()
    const { data: client } = quote.client_id ? await supabase.from('clients').select('*').eq('id', quote.client_id).single() : { data: null }

    // Generate token for public quote link
    const token = crypto.randomUUID()
    await supabase.from('quotes').update({ status: 'sent', sent_at: new Date().toISOString(), token }).eq('id', quote_id)

    if (client?.email && Deno.env.get('RESEND_API_KEY')) {
      const lineItemsHtml = (quote.line_items || []).map(item =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${item.description}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${Number(item.unit_price).toFixed(2)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${(item.quantity * item.unit_price).toFixed(2)}</td></tr>`
      ).join('')

      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#22c55e,#15803d);padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;">${business?.name || 'TreePro'}</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;">Quote</p>
          </div>
          <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;">
            <p>Hi ${client.name},</p>
            <p>Please find your quote below.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr style="background:#f9fafb;"><th style="padding:8px;text-align:left;">Description</th><th style="padding:8px;text-align:right;">Qty</th><th style="padding:8px;text-align:right;">Price</th><th style="padding:8px;text-align:right;">Total</th></tr>
              ${lineItemsHtml}
            </table>
            <p style="text-align:right;"><strong>Subtotal:</strong> $${Number(quote.subtotal).toFixed(2)}</p>
            <p style="text-align:right;"><strong>GST (10%):</strong> $${Number(quote.gst).toFixed(2)}</p>
            <p style="text-align:right;font-size:18px;"><strong>Total: $${Number(quote.total).toFixed(2)}</strong></p>
            <p style="margin-top:24px;"><a href="https://tree-mate-production.up.railway.app/quote/${token}" style="background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">View & Respond to Quote</a></p>
          </div>
        </div>
      `

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${business?.name || 'TreePro'} <info@matehq.online>`,
          to: [client.email],
          subject: `Quote from ${business?.name || 'TreePro'}`,
          html,
        }),
      })
    }

    await supabase.from('activity_feed').insert({
      business_id: quote.business_id, type: 'quote_sent',
      message: `Quote sent to ${client?.name || 'client'}`,
    })

    return new Response(JSON.stringify({ success: true, token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
