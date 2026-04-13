import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export function useActivity(businessId) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchActivities = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    const { data } = await supabase
      .from('activity_feed')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50)
    setActivities(data || [])
    setLoading(false)
  }, [businessId])

  useEffect(() => {
    fetchActivities()

    if (!businessId) return

    const channelName = `activity-feed-${businessId}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_feed',
        filter: `business_id=eq.${businessId}`
      }, (payload) => {
        setActivities(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [businessId, fetchActivities])

  const unreadCount = useMemo(() => activities.filter(a => !a.is_read).length, [activities])

  const markRead = useCallback(async (id) => {
    await supabase.from('activity_feed').update({ is_read: true }).eq('id', id)
    setActivities(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
  }, [])

  const markAllRead = useCallback(async () => {
    if (!businessId) return
    const unreadIds = activities.filter(a => !a.is_read).map(a => a.id)
    if (unreadIds.length === 0) return
    await supabase.from('activity_feed').update({ is_read: true }).in('id', unreadIds)
    setActivities(prev => prev.map(a => ({ ...a, is_read: true })))
  }, [businessId, activities])

  return { activities, loading, unreadCount, markRead, markAllRead }
}
