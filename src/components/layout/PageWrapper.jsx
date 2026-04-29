import { cn } from '../../lib/utils'

const WIDTH_CLASSES = {
  default: 'max-w-lg md:max-w-5xl',
  wide:    'max-w-lg md:max-w-7xl',
  full:    'max-w-full',
}

/**
 * PageWrapper — single warm-cream surface (FieldSuite #f8f6ef).
 *
 * The page is one continuous cream tone. White cards (Card primitive) sit on
 * top to carry visual hierarchy. No outer canvas / inner shell distinction —
 * that ended up busy. This is flatter and reads more like the handoff.
 */
export default function PageWrapper({ children, className = '', width = 'default' }) {
  return (
    <div className={cn(
      'min-h-screen pb-28 md:pb-12 bg-surface animate-fade-in',
      className,
    )}>
      <div className={cn(WIDTH_CLASSES[width] || WIDTH_CLASSES.default, 'mx-auto md:px-6 md:pt-2')}>
        {children}
      </div>
    </div>
  )
}
