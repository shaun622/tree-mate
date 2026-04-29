import { cn } from '../../lib/utils'

/**
 * Skeleton — shimmer-animated placeholder for loading states.
 *
 * Composes into:
 *   <Skeleton className="h-4 w-32" />            // single bar
 *   <SkeletonCard />                              // card-shaped placeholder
 *   <SkeletonList count={5} />                    // stack of card placeholders
 *
 * Uses the `shimmer` keyframe defined in tailwind.config.
 */
export default function Skeleton({ className = '' }) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded',
        className,
      )}
      style={{
        background: 'linear-gradient(90deg, rgb(var(--surface-3) / 0.5) 0%, rgb(var(--surface-3) / 0.8) 50%, rgb(var(--surface-3) / 0.5) 100%)',
        backgroundSize: '200% 100%',
      }}
    />
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={cn('card !p-4 space-y-2.5', className)}>
      <div className="flex items-start justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-3 rounded-full" />
      </div>
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-2.5 w-20" />
    </div>
  )
}

export function SkeletonList({ count = 4, className = '' }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonRow({ className = '' }) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800', className)}>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-44 flex-1" />
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-4 w-20" />
    </div>
  )
}

export function SkeletonStatGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}
