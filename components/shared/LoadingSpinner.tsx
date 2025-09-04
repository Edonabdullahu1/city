import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "primary" | "muted"
  className?: string
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6", 
  lg: "w-8 h-8",
  xl: "w-12 h-12"
}

const variantClasses = {
  default: "text-foreground",
  primary: "text-primary",
  muted: "text-muted-foreground"
}

export default function LoadingSpinner({ 
  size = "md", 
  variant = "default", 
  className 
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Loading overlay component for full-screen loading states
interface LoadingOverlayProps {
  show: boolean
  message?: string
  className?: string
}

export function LoadingOverlay({ show, message = "Loading...", className }: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div className={cn(
      "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
      className
    )}>
      <div className="bg-white rounded-lg p-8 flex flex-col items-center space-y-4 shadow-lg">
        <LoadingSpinner size="lg" variant="primary" />
        <p className="text-muted-foreground font-medium">{message}</p>
      </div>
    </div>
  )
}

// Loading skeleton components for content placeholders
interface LoadingSkeletonProps {
  className?: string
  lines?: number
}

export function LoadingSkeleton({ className, lines = 1 }: LoadingSkeletonProps) {
  return (
    <div className={cn("animate-pulse space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="bg-gray-200 rounded h-4" />
      ))}
    </div>
  )
}

// Card loading skeleton
export function LoadingSkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-white rounded-lg shadow-sm border p-6", className)}>
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
        <div className="h-8 bg-gray-200 rounded w-16" />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-16" />
            <div className="h-4 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>
      
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="flex space-x-3">
          <div className="h-10 bg-gray-200 rounded w-24" />
          <div className="h-10 bg-gray-200 rounded w-24" />
        </div>
      </div>
    </div>
  )
}

// Loading states for different contexts
interface LoadingStateProps {
  type: "page" | "section" | "button" | "inline"
  message?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LoadingState({ 
  type, 
  message, 
  size = "md", 
  className 
}: LoadingStateProps) {
  const spinnerSize = type === "button" ? "sm" : size

  switch (type) {
    case "page":
      return (
        <div className={cn("flex flex-col items-center justify-center min-h-[400px] space-y-4", className)}>
          <LoadingSpinner size="lg" variant="primary" />
          <p className="text-muted-foreground">{message || "Loading page..."}</p>
        </div>
      )
    
    case "section":
      return (
        <div className={cn("flex flex-col items-center justify-center py-12 space-y-4", className)}>
          <LoadingSpinner size={spinnerSize} variant="primary" />
          <p className="text-muted-foreground text-sm">{message || "Loading..."}</p>
        </div>
      )
    
    case "button":
      return (
        <div className={cn("flex items-center space-x-2", className)}>
          <LoadingSpinner size={spinnerSize} />
          {message && <span className="text-sm">{message}</span>}
        </div>
      )
    
    case "inline":
      return (
        <div className={cn("flex items-center space-x-2", className)}>
          <LoadingSpinner size={spinnerSize} variant="muted" />
          {message && <span className="text-sm text-muted-foreground">{message}</span>}
        </div>
      )
    
    default:
      return <LoadingSpinner size={spinnerSize} className={className} />
  }
}