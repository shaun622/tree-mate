import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useStaff(businessId) {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchStaff = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    const { data } = await supabase
      .from('staff_members')
      .select('*')
      .eq('business_id', businessId)
      .order('name')
    setStaff(data || [])
    setLoading(false)
  }, [businessId])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  const createStaff = async (values) => {
    const { data, error } = await supabase
      .from('staff_members')
      .insert({ ...values, business_id: businessId })
      .select()
      .single()
    if (!error) setStaff(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return { data, error }
  }

  const updateStaff = async (id, values) => {
    const { data, error } = await supabase
      .from('staff_members')
      .update(values)
      .eq('id', id)
      .select()
      .single()
    if (!error) setStaff(prev => prev.map(s => s.id === id ? data : s))
    return { data, error }
  }

  const deleteStaff = async (id) => {
    const { error } = await supabase.from('staff_members').delete().eq('id', id)
    if (!error) setStaff(prev => prev.filter(s => s.id !== id))
    return { error }
  }

  const uploadPhoto = async (staffId, file) => {
    const ext = file.name.split('.').pop()
    const path = `${businessId}/${staffId}.${ext}`
    const { error: uploadError } = await supabase.storage.from('staff-photos').upload(path, file, { upsert: true })
    if (uploadError) return { error: uploadError }
    const { data: { publicUrl } } = supabase.storage.from('staff-photos').getPublicUrl(path)
    return updateStaff(staffId, { photo_url: publicUrl })
  }

  return { staff, loading, createStaff, updateStaff, deleteStaff, uploadPhoto, refreshStaff: fetchStaff }
}
