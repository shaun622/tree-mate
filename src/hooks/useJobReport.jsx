import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useJobReport(businessId) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchReports = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    const { data } = await supabase
      .from('job_reports')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    setReports(data || [])
    setLoading(false)
  }, [businessId])

  useEffect(() => { fetchReports() }, [fetchReports])

  const createReport = async (values) => {
    const { data, error } = await supabase
      .from('job_reports')
      .insert({ ...values, business_id: businessId })
      .select()
      .single()
    if (!error) setReports(prev => [data, ...prev])
    return { data, error }
  }

  const updateReport = async (id, values) => {
    const { data, error } = await supabase
      .from('job_reports')
      .update(values)
      .eq('id', id)
      .select()
      .single()
    if (!error) setReports(prev => prev.map(r => r.id === id ? data : r))
    return { data, error }
  }

  const completeReport = async (id) => {
    const { data, error } = await supabase
      .from('job_reports')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error) {
      setReports(prev => prev.map(r => r.id === id ? data : r))
      // Invoke edge function
      await supabase.functions.invoke('complete-job-report', { body: { job_report_id: id } })
    }
    return { data, error }
  }

  const addPhoto = async (reportId, file, tag = 'before') => {
    const ext = file.name.split('.').pop()
    const path = `${businessId}/${reportId}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('job-photos').upload(path, file)
    if (uploadError) return { error: uploadError }
    const { data: { publicUrl } } = supabase.storage.from('job-photos').getPublicUrl(path)
    const { data, error } = await supabase
      .from('job_photos')
      .insert({ job_report_id: reportId, storage_path: path, signed_url: publicUrl, tag })
      .select()
      .single()
    return { data, error }
  }

  const removePhoto = async (photoId, storagePath) => {
    await supabase.storage.from('job-photos').remove([storagePath])
    const { error } = await supabase.from('job_photos').delete().eq('id', photoId)
    return { error }
  }

  const addTask = async (reportId, taskName) => {
    const { data, error } = await supabase
      .from('job_tasks')
      .insert({ job_report_id: reportId, task_name: taskName })
      .select()
      .single()
    return { data, error }
  }

  const toggleTask = async (taskId, completed) => {
    const { data, error } = await supabase
      .from('job_tasks')
      .update({ completed })
      .eq('id', taskId)
      .select()
      .single()
    return { data, error }
  }

  const addEquipment = async (reportId, values) => {
    const { data, error } = await supabase
      .from('equipment_used')
      .insert({ ...values, job_report_id: reportId })
      .select()
      .single()
    return { data, error }
  }

  const removeEquipment = async (id) => {
    const { error } = await supabase.from('equipment_used').delete().eq('id', id)
    return { error }
  }

  const addAssessment = async (reportId, values) => {
    const { data, error } = await supabase
      .from('tree_assessments')
      .insert({ ...values, job_report_id: reportId })
      .select()
      .single()
    return { data, error }
  }

  return { reports, loading, createReport, updateReport, completeReport, addPhoto, removePhoto, addTask, toggleTask, addEquipment, removeEquipment, addAssessment, refreshReports: fetchReports }
}
