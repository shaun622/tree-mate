import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export default function PortalSetup() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.functions.invoke('portal-auth', { body: { action: 'validate-token', token } })
      .then(({ data, error: err }) => {
        if (err || !data?.client) setError('Invalid or expired link')
        else setClient(data.client)
        setLoading(false)
      })
  }, [token])

  const handleSetup = async (e) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setSaving(true)
    const { error: err } = await supabase.functions.invoke('portal-auth', {
      body: { action: 'create-account', token, password, email: client.email }
    })
    if (err) setError(err.message || 'Setup failed')
    else {
      await supabase.auth.signInWithPassword({ email: client.email, password })
      navigate('/portal')
    }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-gradient-page flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Set Up Your Portal</h1>
          <p className="text-sm text-gray-500 dark:text-gray-500">Create a password to access your portal</p>
        </div>

        {error && !client ? (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl p-4 text-center">{error}</div>
        ) : (
          <form onSubmit={handleSetup} className="bg-white dark:bg-gray-900 rounded-2xl shadow-elevated p-6 space-y-4">
            {client && <p className="text-sm text-gray-600 dark:text-gray-500">Welcome, <strong>{client.name}</strong></p>}
            {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{error}</div>}
            <Input label="Create Password" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button type="submit" loading={saving} className="w-full">Create Account</Button>
          </form>
        )}
      </div>
    </div>
  )
}
