import { useState, useEffect, useCallback } from 'react'
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

    // CRITICAL: unique channel name with timestamp to prevent collisions
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

  return { activities, loading }
}
