import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    if (err) setError(err.message)
    else navigate('/')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-page flex flex-col">
      <div className="max-w-app mx-auto w-full flex-1 flex flex-col">
        {/* Hero */}
        <div className="bg-gradient-hero px-6 pt-20 pb-16 text-center relative overflow-hidden safe-top">
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

        {/* Form */}
        <div className="px-5 -mt-8 pb-8 relative">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-3xl shadow-elevated p-6 space-y-5 ring-1 ring-black/[0.03]">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sign In</h2>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 ring-1 ring-red-100">{error}</div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            <Button type="submit" loading={loading} className="w-full">
              Sign In
            </Button>

            <p className="text-center text-sm text-gray-400 dark:text-gray-500">
              Don't have an account?{' '}
              <Link to="/signup" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">Sign up</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
