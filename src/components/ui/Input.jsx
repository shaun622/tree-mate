export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>}
      <input className={`w-full px-4 py-3 rounded-xl border-2 ${error ? 'border-red-200 focus:border-red-400 focus:ring-red-100' : 'border-gray-100 focus:border-tree-400 focus:ring-tree-50'} focus:outline-none focus:ring-4 bg-gray-50/50 focus:bg-white text-gray-900 placeholder-gray-400 transition-all duration-200`} {...props} />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}

export function TextArea({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>}
      <textarea className={`w-full px-4 py-3 rounded-xl border-2 ${error ? 'border-red-200 focus:border-red-400 focus:ring-red-100' : 'border-gray-100 focus:border-tree-400 focus:ring-tree-50'} focus:outline-none focus:ring-4 bg-gray-50/50 focus:bg-white text-gray-900 placeholder-gray-400 transition-all duration-200 resize-none`} rows={4} {...props} />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}

export function Select({ label, options, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>}
      <select className={`w-full px-4 py-3 rounded-xl border-2 ${error ? 'border-red-200' : 'border-gray-100 focus:border-tree-400'} focus:outline-none focus:ring-4 focus:ring-tree-50 bg-gray-50/50 focus:bg-white text-gray-900 transition-all duration-200`} {...props}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}
