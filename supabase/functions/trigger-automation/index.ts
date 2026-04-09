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
    const { trigger_event, business_id, context } = await req.json()

    // Find matching automation rules
    const { data: rules } = await supabase.from('automation_rules').select('*').eq('business_id', business_id).eq('trigger_event', trigger_event).eq('active', true)

    for (const rule of (rules || [])) {
      if (rule.template_id) {
        const { data: template } = await supabase.from('communication_templates').select('*').eq('id', rule.template_id).single()
        if (template && context?.client_email && Deno.env.get('RESEND_API_KEY')) {
          // Replace variables in template
          let body = template.body || ''
          let subject = template.subject || ''
          const vars = context || {}
          Object.entries(vars).forEach(([key, value]) => {
            body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
            subject = subject.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
          })

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `TreePro <noreply@${Deno.env.get('RESEND_DOMAIN') || 'resend.dev'}>`,
              to: [context.client_email],
              subject,
              html: `<div style="font-family:sans-serif;">${body.replace(/\n/g, '<br>')}</div>`,
            }),
          })
        }
      }

      // Log automation execution
      await supabase.from('automation_logs').insert({
        automation_rule_id: rule.id, business_id, trigger_event, status: 'sent',
      })
    }

    return new Response(JSON.stringify({ success: true, rules_triggered: rules?.length || 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
