import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { TextArea } from '../components/ui/Input'

export default function PublicSurvey() {
  const { token } = useParams()
  const [site, setSite] = useState(null)
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const { data: s } = await supabase.from('job_sites').select('*, clients(id, name, business_id)').eq('portal_token', token).single()
      if (s) {
        setSite(s)
        const { data: b } = await supabase.from('businesses').select('name, logo_url').eq('id', s.clients.business_id).single()
        setBusiness(b)
      }
      setLoading(false)
    }
    fetch()
  }, [token])

  const handleSubmit = async () => {
    if (!rating || !site) return
    await supabase.from('surveys').insert({
      business_id: site.clients.business_id,
      client_id: site.clients.id,
      job_site_id: site.id,
      rating, comment,
    })
    setSubmitted(true)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-gradient-page flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {business && (
          <div className="text-center mb-6">
            {business.logo_url && <img src={business.logo_url} alt="" className="w-14 h-14 rounded-xl mx-auto mb-2 object-cover" />}
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{business.name}</h1>
          </div>
        )}

        {submitted ? (
          <Card className="p-6 text-center">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Thank You!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-500">Your feedback helps us improve our service.</p>
          </Card>
        ) : (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 text-center">How was our service?</h2>
            {site && <p className="text-sm text-gray-500 dark:text-gray-500 text-center">{site.address}</p>}

            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} onClick={() => setRating(i)} className="p-1 transition-transform hover:scale-110">
                  <svg className={`w-10 h-10 ${i <= rating ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                </button>
              ))}
            </div>

            <TextArea placeholder="Any comments? (optional)" value={comment} onChange={e => setComment(e.target.value)} />
            <Button onClick={handleSubmit} className="w-full" disabled={!rating}>Submit Feedback</Button>
          </Card>
        )}
      </div>
    </div>
  )
}
