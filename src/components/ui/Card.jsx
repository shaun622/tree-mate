export default function Card({ children, className = '', onClick, hover = false }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-card border border-gray-100 ${hover ? 'hover:shadow-card-hover cursor-pointer transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
