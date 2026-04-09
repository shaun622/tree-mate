import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useJobSites(businessId) {
  const [jobSites, setJobSites] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchJobSites = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    const { data } = await supabase
      .from('job_sites')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    setJobSites(data || [])
    setLoading(false)
  }, [businessId])

  useEffect(() => { fetchJobSites() }, [fetchJobSites])

  const createJobSite = async (values) => {
    const { data, error } = await supabase
      .from('job_sites')
      .insert({ ...values, business_id: businessId })
      .select()
      .single()
    if (!error) setJobSites(prev => [data, ...prev])
    return { data, error }
  }

  const updateJobSite = async (id, values) => {
    const { data, error } = await supabase
      .from('job_sites')
      .update(values)
      .eq('id', id)
      .select()
      .single()
    if (!error) setJobSites(prev => prev.map(s => s.id === id ? data : s))
    return { data, error }
  }

  const deleteJobSite = async (id) => {
    const { error } = await supabase.from('job_sites').delete().eq('id', id)
    if (!error) setJobSites(prev => prev.filter(s => s.id !== id))
    return { error }
  }

  const getJobSitesByClient = (clientId) => jobSites.filter(s => s.client_id === clientId)

  return { jobSites, loading, createJobSite, updateJobSite, deleteJobSite, refreshJobSites: fetchJobSites, getJobSitesByClient }
}
