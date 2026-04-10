import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { action, token, password, email } = await req.json()

    if (action === 'validate-token') {
      const { data: site } = await supabase.from('job_sites').select('*, clients(*)').eq('portal_token', token).single()
      if (!site) throw new Error('Invalid token')
      return new Response(JSON.stringify({ client: site.clients }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'create-account') {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (authError) throw authError

      // Link to client
      const { data: site } = await supabase.from('job_sites').select('*, clients(*)').eq('portal_token', token).single()
      if (site?.clients) {
        await supabase.from('clients').update({ auth_user_id: authData.user.id }).eq('id', site.clients.id)
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    throw new Error('Unknown action')
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
