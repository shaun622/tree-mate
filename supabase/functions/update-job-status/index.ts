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
    const { job_id, status } = await req.json()

    const updates: Record<string, unknown> = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    if (status === 'in_progress') updates.started_at = new Date().toISOString()

    const { data: job } = await supabase.from('jobs').update(updates).eq('id', job_id).select('*, clients(name, email)').single()
    if (!job) throw new Error('Job not found')

    // Trigger automations
    const triggerEvent = status === 'completed' ? 'job_completed' : status === 'in_progress' ? 'job_started' : 'job_scheduled'
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/trigger-automation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger_event: triggerEvent,
        business_id: job.business_id,
        context: { client_name: job.clients?.name, client_email: job.clients?.email },
      }),
    })

    await supabase.from('activity_feed').insert({
      business_id: job.business_id,
      type: status === 'completed' ? 'job_completed' : 'job_created',
      message: `Job ${status.replace('_', ' ')}: ${job.job_type || 'Job'}`,
    })

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
