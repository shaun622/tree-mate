import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../hooks/useBusiness'
import PageWrapper from '../../components/layout/PageWrapper'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import { formatDate } from '../../lib/utils'

export default function SurveyResults() {
  const { business } = useBusiness()
  const [surveys, setSurveys] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!business?.id) return
    supabase.from('surveys').select('*').eq('business_id', business.id).order('created_at', { ascending: false })
      .then(({ data }) => { setSurveys(data || []); setLoading(false) })
  }, [business?.id])

  const avgRating = surveys.length ? (surveys.reduce((sum, s) => sum + (s.rating || 0), 0) / surveys.length).toFixed(1) : '0.0'

  return (
    <PageWrapper>
      <Header title="Survey Results" back="/settings" />
      <div className="px-4 py-4 space-y-4">
        {surveys.length > 0 && (
          <Card className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{avgRating}</p>
            <div className="flex justify-center gap-1 my-1">
              {[1, 2, 3, 4, 5].map(i => (
                <svg key={i} className={`w-5 h-5 ${i <= Math.round(Number(avgRating)) ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              ))}
            </div>
            <p className="text-sm text-gray-500">{surveys.length} responses</p>
          </Card>
        )}

        {surveys.length === 0 ? (
          <EmptyState title="No survey responses" description="Surveys are sent automatically after job completion via the customer portal" />
        ) : (
          <div className="space-y-2">
            {surveys.map(s => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <svg key={i} className={`w-4 h-4 ${i <= s.rating ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
                {s.comment && <p className="text-sm text-gray-700">{s.comment}</p>}
                <p className="text-xs text-gray-400 mt-1">{formatDate(s.created_at)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
