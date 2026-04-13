import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { invoice_id } = await req.json()

    const { data: invoice } = await supabase.from('invoices').select('*').eq('id', invoice_id).single()
    if (!invoice) throw new Error('Invoice not found')

    const { data: business } = await supabase.from('businesses').select('*').eq('id', invoice.business_id).single()
    const { data: client } = invoice.client_id ? await supabase.from('clients').select('*').eq('id', invoice.client_id).single() : { data: null }

    await supabase.from('invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', invoice_id)

    if (client?.email && Deno.env.get('RESEND_API_KEY')) {
      const lineItemsHtml = (invoice.line_items || []).map(item =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${item.description}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${Number(item.unit_price).toFixed(2)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${(item.quantity * item.unit_price).toFixed(2)}</td></tr>`
      ).join('')

      const dueDateStr = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

      const bankHtml = business?.bank_details ? `
        <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0 0 8px;font-weight:600;">Bank Details</p>
          <p style="margin:2px 0;font-size:14px;">BSB: ${business.bank_details.bsb || ''}</p>
          <p style="margin:2px 0;font-size:14px;">Account: ${business.bank_details.account_number || ''}</p>
          <p style="margin:2px 0;font-size:14px;">Name: ${business.bank_details.account_name || ''}</p>
        </div>
      ` : ''

      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#22c55e,#15803d);padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;">${business?.name || 'TreePro'}</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;">Invoice ${invoice.invoice_number || ''}</p>
          </div>
          <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;">
            <p>Hi ${client.name},</p>
            <p>Please find your invoice below.${dueDateStr ? ` Payment is due by <strong>${dueDateStr}</strong>.` : ''}</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr style="background:#f9fafb;"><th style="padding:8px;text-align:left;">Description</th><th style="padding:8px;text-align:right;">Qty</th><th style="padding:8px;text-align:right;">Price</th><th style="padding:8px;text-align:right;">Total</th></tr>
              ${lineItemsHtml}
            </table>
            <p style="text-align:right;"><strong>Subtotal:</strong> $${Number(invoice.subtotal).toFixed(2)}</p>
            <p style="text-align:right;"><strong>GST (10%):</strong> $${Number(invoice.gst).toFixed(2)}</p>
            <p style="text-align:right;font-size:18px;"><strong>Total: $${Number(invoice.total).toFixed(2)}</strong></p>
            ${bankHtml}
            ${invoice.notes ? `<p style="color:#6b7280;font-size:14px;margin-top:16px;">${invoice.notes}</p>` : ''}
            <p style="color:#6b7280;font-size:13px;margin-top:24px;">Thank you for your business.</p>
          </div>
        </div>
      `

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${business?.name || 'TreePro'} <info@tree.matehq.online>`,
          to: [client.email],
          subject: `Invoice ${invoice.invoice_number || ''} from ${business?.name || 'TreePro'}`,
          html,
        }),
      })
    }

    await supabase.from('activity_feed').insert({
      business_id: invoice.business_id, type: 'invoice_sent',
      message: `Invoice ${invoice.invoice_number || ''} sent to ${client?.name || 'client'}`,
      link_to: `/invoices/${invoice_id}`,
    })

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
