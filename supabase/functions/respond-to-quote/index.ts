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
    const { quote_id, response } = await req.json()

    const status = response === 'accept' ? 'accepted' : 'declined'
    await supabase.from('quotes').update({
      status,
      [response === 'accept' ? 'accepted_at' : 'declined_at']: new Date().toISOString(),
    }).eq('id', quote_id)

    const { data: quote } = await supabase.from('quotes').select('*, clients(name)').eq('id', quote_id).single()

    // If accepted, create a job
    if (response === 'accept' && quote) {
      await supabase.from('jobs').insert({
        business_id: quote.business_id,
        client_id: quote.client_id,
        job_site_id: quote.job_site_id,
        quote_id: quote.id,
        status: 'scheduled',
      })
    }

    await supabase.from('activity_feed').insert({
      business_id: quote?.business_id,
      type: response === 'accept' ? 'quote_accepted' : 'quote_declined',
      message: `Quote ${status} by ${quote?.clients?.name || 'client'}`,
    })

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
