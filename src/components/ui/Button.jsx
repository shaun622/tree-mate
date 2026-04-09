export default function Button({ children, variant = 'primary', loading = false, className = '', disabled, ...props }) {
  const base = 'inline-flex items-center justify-center min-h-[48px] px-6 rounded-2xl font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]'
  const variants = {
    primary: 'bg-gradient-brand text-white shadow-button hover:shadow-button-hover hover:-translate-y-0.5',
    secondary: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-card hover:shadow-card-hover',
    danger: 'bg-gradient-danger text-white shadow-sm hover:shadow-md hover:-translate-y-0.5',
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
