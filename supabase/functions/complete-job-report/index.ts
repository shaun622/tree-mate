import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { job_report_id } = await req.json()

    // Fetch report with related data
    const { data: report } = await supabase.from('job_reports').select('*').eq('id', job_report_id).single()
    if (!report) throw new Error('Report not found')

    const [{ data: tasks }, { data: equipment }, { data: assessments }, { data: photos }, { data: site }] = await Promise.all([
      supabase.from('job_tasks').select('*').eq('job_report_id', job_report_id),
      supabase.from('equipment_used').select('*').eq('job_report_id', job_report_id),
      supabase.from('tree_assessments').select('*').eq('job_report_id', job_report_id),
      supabase.from('job_photos').select('*').eq('job_report_id', job_report_id),
      report.job_site_id ? supabase.from('job_sites').select('*, clients(*)').eq('id', report.job_site_id).single() : { data: null },
    ])

    const { data: business } = await supabase.from('businesses').select('*').eq('id', report.business_id).single()

    // Send email to client
    const clientEmail = site?.clients?.email
    if (clientEmail && Deno.env.get('RESEND_API_KEY')) {
      const tasksHtml = (tasks || []).map(t =>
        `<li style="padding:4px 0;">${t.completed ? '✅' : '⬜'} ${t.task_name}</li>`
      ).join('')

      const assessmentsHtml = (assessments || []).map(a =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee;">Tree #${a.tree_number}</td><td style="padding:8px;border-bottom:1px solid #eee;">${a.species || 'Unknown'}</td><td style="padding:8px;border-bottom:1px solid #eee;">${a.diameter_dbh_cm || '-'}cm</td><td style="padding:8px;border-bottom:1px solid #eee;">${a.action_taken || '-'}</td></tr>`
      ).join('')

      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#22c55e,#15803d);padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;">${business?.name || 'TreePro'}</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;">Job Report Completed</p>
          </div>
          <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;">
            <p>Hi ${site?.clients?.name || 'there'},</p>
            <p>A job report has been completed for <strong>${site?.address || 'your property'}</strong>.</p>
            ${report.technician_name ? `<p>Technician: <strong>${report.technician_name}</strong></p>` : ''}
            ${tasks?.length ? `<h3>Tasks</h3><ul style="list-style:none;padding:0;">${tasksHtml}</ul>` : ''}
            ${assessments?.length ? `<h3>Tree Assessments</h3><table style="width:100%;border-collapse:collapse;"><tr style="background:#f9fafb;"><th style="padding:8px;text-align:left;">Tree</th><th style="padding:8px;text-align:left;">Species</th><th style="padding:8px;text-align:left;">DBH</th><th style="padding:8px;text-align:left;">Action</th></tr>${assessmentsHtml}</table>` : ''}
            ${report.trees_removed ? `<p>Trees Removed: <strong>${report.trees_removed}</strong></p>` : ''}
            ${report.stump_count ? `<p>Stumps Ground: <strong>${report.stump_count}</strong></p>` : ''}
            ${report.notes ? `<p><em>${report.notes}</em></p>` : ''}
            <p style="margin-top:24px;"><a href="https://tree-mate-production.up.railway.app/portal" style="background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">View in Portal</a></p>
          </div>
        </div>
      `

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${business?.name || 'TreePro'} <info@tree.matehq.online>`,
          to: [clientEmail],
          subject: `Job Report - ${site?.address || 'Your Property'}`,
          html,
        }),
      })

      await supabase.from('job_reports').update({ report_sent_at: new Date().toISOString() }).eq('id', job_report_id)
    }

    // Create activity feed entry
    await supabase.from('activity_feed').insert({
      business_id: report.business_id,
      type: 'report_completed',
      message: `Job report completed for ${site?.address || 'a job site'}`,
    })

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
