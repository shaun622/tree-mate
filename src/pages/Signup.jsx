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
    <div className="min-h-screen bg-gradient-page flex flex-col">
      <div className="max-w-app mx-auto w-full flex-1 flex flex-col">
        <div className="bg-gradient-hero px-6 pt-20 pb-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/20" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/10" />
          </div>
          <div className="relative">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg ring-1 ring-white/30">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">TreePro</h1>
            <p className="text-white/70 text-sm font-medium">Tree services made simple</p>
          </div>
        </div>

        <div className="px-5 -mt-8 pb-8 relative">
          {success ? (
            <div className="bg-white rounded-3xl shadow-elevated p-6 text-center ring-1 ring-black/[0.03]">
              <div className="w-16 h-16 bg-tree-50 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-tree-100">
                <svg className="w-8 h-8 text-tree-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
              <p className="text-sm text-gray-500 mb-6">We've sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.</p>
              <Link to="/login" className="text-tree-600 font-semibold text-sm hover:text-tree-700 transition-colors">Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-elevated p-6 space-y-5 ring-1 ring-black/[0.03]">
              <h2 className="text-xl font-bold text-gray-900">Create Account</h2>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 ring-1 ring-red-100">{error}</div>
              )}

              <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              <Input label="Password" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
              <Input label="Confirm Password" type="password" placeholder="Repeat password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />

              <Button type="submit" loading={loading} className="w-full">Create Account</Button>

              <p className="text-center text-sm text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-tree-600 font-semibold hover:text-tree-700 transition-colors">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
