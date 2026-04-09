const VARIANT_CLASSES = {
  primary: 'bg-tree-50 text-tree-700 ring-1 ring-tree-200/50',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50',
  danger: 'bg-red-50 text-red-700 ring-1 ring-red-200/50',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/50',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/50',
  neutral: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200/50',
}

export default function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.neutral} ${className}`}>
      {children}
    </span>
  )
}
