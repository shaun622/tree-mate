import { cn } from '../../lib/utils'

const WIDTH_CLASSES = {
  default: 'max-w-lg md:max-w-5xl',
  wide: 'max-w-lg md:max-w-7xl',
  full: 'max-w-full',
}

export default function PageWrapper({ children, className = '', width = 'default' }) {
  return (
    <div
      className={cn(
        'min-h-screen bg-gradient-page dark:bg-gradient-to-b dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 pb-28 md:pb-12 animate-fade-in',
        className,
      )}
    >
      <div className={cn(WIDTH_CLASSES[width] || WIDTH_CLASSES.default, 'mx-auto px-0 md:px-8')}>
        {children}
      </div>
    </div>
  )
}
