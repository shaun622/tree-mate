export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-tree-500'} focus:outline-none focus:ring-2 focus:ring-offset-0 bg-white text-gray-900 placeholder-gray-400 transition-colors`} {...props} />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}

export function TextArea({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <textarea className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-tree-500'} focus:outline-none focus:ring-2 focus:ring-offset-0 bg-white text-gray-900 placeholder-gray-400 transition-colors resize-none`} rows={4} {...props} />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}

export function Select({ label, options, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-red-300' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-tree-500 bg-white text-gray-900 transition-colors`} {...props}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}
