import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

export default function PortalTokenLanding() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [site, setSite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const validate = async () => {
      const { data } = await supabase.from('job_sites').select('*, clients(name, email)').eq('portal_token', token).single()
      if (data) setSite(data)
      else setError('Invalid or expired link')
      setLoading(false)
    }
    validate()
  }, [token])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  if (error) return (
    <div className="min-h-screen bg-gradient-page flex items-center justify-center p-6">
      <Card className="p-6 text-center max-w-sm w-full">
        <p className="text-red-500 font-medium mb-4">{error}</p>
        <Link to="/portal/login" className="text-brand-600 text-sm font-medium">Go to Portal Login</Link>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-page flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-brand rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Your Job Portal</h1>
        </div>

        <Card className="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-500">Site</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{site?.address}</p>
          {site?.clients?.name && <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{site.clients.name}</p>}
        </Card>

        <Button onClick={() => navigate(`/portal/setup/${token}`)} className="w-full">Set Up Portal Account</Button>
        <p className="text-center text-sm text-gray-500 dark:text-gray-500">
          Already have an account? <Link to="/portal/login" className="text-brand-600 font-medium">Sign In</Link>
        </p>
      </div>
    </div>
  )
}
