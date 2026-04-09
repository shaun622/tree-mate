import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useClients(businessId) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchClients = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('business_id', businessId)
      .order('name')
    setClients(data || [])
    setLoading(false)
  }, [businessId])

  useEffect(() => { fetchClients() }, [fetchClients])

  const createClient = async (values) => {
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...values, business_id: businessId })
      .select()
      .single()
    if (!error) setClients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return { data, error }
  }

  const updateClient = async (id, values) => {
    const { data, error } = await supabase
      .from('clients')
      .update(values)
      .eq('id', id)
      .select()
      .single()
    if (!error) setClients(prev => prev.map(c => c.id === id ? data : c))
    return { data, error }
  }

  const deleteClient = async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (!error) setClients(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  return { clients, loading, createClient, updateClient, deleteClient, refreshClients: fetchClients }
}
