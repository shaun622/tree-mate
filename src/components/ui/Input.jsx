import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/utils'

const FIELD_BASE = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 min-h-tap shadow-inner-soft placeholder:text-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 disabled:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:placeholder:text-gray-500 dark:text-gray-500'

// font-size: 16px enforced inline so iOS Safari does not auto-zoom on focus.
const INPUT_STYLE = { fontSize: '16px' }

function Label({ children }) {
  return (
    <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-1.5">
      {children}
    </label>
  )
}

function ErrorText({ children }) {
  return <p className="mt-1 text-xs font-medium text-red-500 dark:text-red-400">{children}</p>
}

export function Input({ label, error, className = '', type, ...props }) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <div className="relative">
        <input
          type={isPassword && showPassword ? 'text' : type}
          style={INPUT_STYLE}
          className={cn(
            FIELD_BASE,
            error && 'border-red-300 focus:border-red-400 focus:ring-red-500/20 dark:border-red-800',
            isPassword && 'pr-12',
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  )
}

export function TextArea({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <textarea
        style={INPUT_STYLE}
        rows={4}
        className={cn(
          FIELD_BASE,
          'resize-none',
          error && 'border-red-300 focus:border-red-400 focus:ring-red-500/20 dark:border-red-800',
        )}
        {...props}
      />
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  )
}

export function Select({ label, options, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <select
        style={INPUT_STYLE}
        className={cn(
          FIELD_BASE,
          'pr-10 appearance-none bg-no-repeat bg-right',
          error && 'border-red-300 focus:border-red-400 focus:ring-red-500/20 dark:border-red-800',
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  )
}
