export default function Card({ children, className = '', onClick, hover = false }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-card border border-gray-100/80 ${hover ? 'hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer transition-colors duration-150' : 'transition-shadow duration-200'} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
