import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

const WIDTH_CLASSES = {
  default: 'max-w-lg md:max-w-5xl',
  wide: 'max-w-lg md:max-w-7xl',
  full: 'max-w-full',
}

export default function PageWrapper({ children, className = '', width = 'default' }) {
  const { pathname } = useLocation()

  // useLayoutEffect fires synchronously before browser paint
  // pathname dependency ensures it fires on every route change
  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    // Clear any modal body lock
    document.documentElement.style.overflow = ''
    document.documentElement.style.position = ''
    document.documentElement.style.width = ''
    document.documentElement.style.top = ''
    document.body.style.overflow = ''
    document.body.classList.remove('modal-open')
    // Scroll to top
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={`min-h-screen bg-gradient-page pb-24 md:pb-8 ${className}`}>
      <div className={`${WIDTH_CLASSES[width] || WIDTH_CLASSES.default} mx-auto px-0 md:px-8`}>
        {children}
      </div>
    </div>
  )
}
