export function renderTemplate(template, variables) {
  if (!template) return ''
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match
  })
}

export const TEMPLATE_VARIABLES = [
  { key: 'client_name', description: 'Client full name' },
  { key: 'business_name', description: 'Your business name' },
  { key: 'site_address', description: 'Job site address' },
  { key: 'technician_name', description: 'Assigned staff member' },
  { key: 'next_visit_date', description: 'Next scheduled visit date' },
  { key: 'portal_link', description: 'Customer portal link' },
  { key: 'quote_link', description: 'Public quote link' },
  { key: 'job_type', description: 'Type of job' },
  { key: 'scheduled_date', description: 'Scheduled job date' },
]
