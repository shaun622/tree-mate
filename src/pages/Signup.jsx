import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    const { error: err } = await signUp(email, password)
    if (err) setError(err.message)
    else setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-page">
      <div className="bg-gradient-brand px-6 pt-16 pb-12 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">TreePro</h1>
        <p className="text-white/80 text-sm">Tree services made simple</p>
      </div>

      <div className="px-6 -mt-6">
        {success ? (
          <div className="bg-white rounded-2xl shadow-elevated p-6 text-center">
            <div className="w-16 h-16 bg-tree-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-tree-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-sm text-gray-500 mb-6">We've sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.</p>
            <Link to="/login" className="text-tree-600 font-medium text-sm hover:text-tree-700">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-elevated p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Create Account</h2>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{error}</div>
            )}

            <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Password" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
            <Input label="Confirm Password" type="password" placeholder="Repeat password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />

            <Button type="submit" loading={loading} className="w-full">Create Account</Button>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-tree-600 font-medium hover:text-tree-700">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
