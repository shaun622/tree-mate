import { cn } from '../../lib/utils'

const WIDTH_CLASSES = {
  default: 'max-w-lg md:max-w-5xl',
  wide:    'max-w-lg md:max-w-7xl',
  full:    'max-w-full',
}

/**
 * PageWrapper — FieldSuite cream-shell-on-mint-canvas framing.
 *
 * Mobile (default): edge-to-edge content on the warm canvas (no shell card —
 * the screen is too narrow for the double-frame look to read well).
 *
 * Desktop (md+): the page content sits inside a rounded cream "shell" card
 * floating on the soft mint canvas. Hairline border + soft drop shadow.
 */
export default function PageWrapper({ children, className = '', width = 'default' }) {
  return (
    <div className={cn(
      'min-h-screen pb-28 md:pb-12 bg-canvas animate-fade-in',
      className,
    )}>
      <div className={cn(WIDTH_CLASSES[width] || WIDTH_CLASSES.default, 'mx-auto md:px-6 md:pt-6')}>
        {/* Desktop: cream shell card. Mobile: just the content with the canvas as background. */}
        <div className="md:app-shell md:overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
