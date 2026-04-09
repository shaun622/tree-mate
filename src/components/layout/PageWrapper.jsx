export default function PageWrapper({ children, className = '' }) {
  return (
    <div className={`min-h-screen bg-gradient-page pb-20 ${className}`}>
      {children}
    </div>
  )
}
