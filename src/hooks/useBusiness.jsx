import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const BusinessContext = createContext({})

export function BusinessProvider({ children }) {
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchBusiness = useCallback(async () => {
    if (!user) { setBusiness(null); setLoading(false); return }
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single()
    setBusiness(data)
    setLoading(false)
  }, [user])

  useEffect(() => { fetchBusiness() }, [fetchBusiness])

  const createBusiness = async (values) => {
    const { data, error } = await supabase
      .from('businesses')
      .insert({ ...values, owner_id: user.id })
      .select()
      .single()
    if (!error) setBusiness(data)
    return { data, error }
  }

  const updateBusiness = async (values) => {
    const { data, error } = await supabase
      .from('businesses')
      .update(values)
      .eq('id', business.id)
      .select()
      .single()
    if (!error) setBusiness(data)
    return { data, error }
  }

  return (
    <BusinessContext.Provider value={{ business, loading, createBusiness, updateBusiness, refreshBusiness: fetchBusiness }}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness() {
  const context = useContext(BusinessContext)
  if (!context) throw new Error('useBusiness must be used within BusinessProvider')
  return context
}
