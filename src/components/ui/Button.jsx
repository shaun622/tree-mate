export default function Button({ children, variant = 'primary', loading = false, className = '', disabled, ...props }) {
  const base = 'inline-flex items-center justify-center min-h-[48px] px-6 rounded-2xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'
  const variants = {
    primary: 'bg-gradient-brand text-white shadow-glow hover:shadow-glow-lg',
    secondary: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-card',
    danger: 'bg-gradient-danger text-white',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : children}
    </button>
  )
}
