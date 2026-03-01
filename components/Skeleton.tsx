interface SkeletonProps {
  variant?: "text" | "card" | "avatar"
  className?: string
}

export function Skeleton({ variant = "text", className = "" }: SkeletonProps) {
  if (variant === "avatar") {
    return (
      <div className={`animate-pulse bg-stone-200 rounded-full w-10 h-10 shrink-0 ${className}`} />
    )
  }
  if (variant === "card") {
    return (
      <div className={`animate-pulse bg-stone-200 rounded-2xl w-full ${className}`} />
    )
  }
  return (
    <div className={`animate-pulse bg-stone-200 rounded h-4 w-full ${className}`} />
  )
}

export function DoctorCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/2" />
          <Skeleton variant="text" className="w-1/3" />
        </div>
      </div>
      <Skeleton variant="text" className="w-full" />
      <Skeleton variant="text" className="w-3/4" />
      <Skeleton variant="card" className="h-8" />
    </div>
  )
}
