"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/shared/button"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Log to external service in production
    if (process.env.NODE_ENV === "production") {
      // Example: logErrorToService(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          showDetails={this.props.showDetails}
        />
      )
    }

    return this.props.children
  }
}

interface ErrorDisplayProps {
  error: Error | null
  errorInfo: ErrorInfo | null
  onRetry: () => void
  showDetails?: boolean
  variant?: "page" | "section" | "compact"
}

export function ErrorDisplay({ 
  error, 
  errorInfo, 
  onRetry, 
  showDetails = process.env.NODE_ENV === "development",
  variant = "page"
}: ErrorDisplayProps) {
  if (variant === "compact") {
    return (
      <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">Something went wrong</p>
          <p className="text-sm text-red-600">Please try again or contact support if the issue persists.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="flex-shrink-0"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      </div>
    )
  }

  if (variant === "section") {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-red-800">Something went wrong</h3>
          <p className="text-muted-foreground max-w-md">
            We encountered an error while loading this section. Please try again.
          </p>
        </div>

        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  // Page variant (default)
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="h-10 w-10 text-red-600" />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-red-800">Oops! Something went wrong</h1>
          <p className="text-muted-foreground">
            We apologize for the inconvenience. An unexpected error has occurred while processing your request.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Link href="/">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>

        {showDetails && error && (
          <details className="text-left bg-gray-50 border rounded-lg p-4 mt-6">
            <summary className="font-medium cursor-pointer text-sm text-red-800 mb-2">
              Error Details (Development Mode)
            </summary>
            <div className="space-y-2 text-xs font-mono text-gray-700">
              <div>
                <strong>Error:</strong> {error.name}
              </div>
              <div>
                <strong>Message:</strong> {error.message}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack Trace:</strong>
                  <pre className="whitespace-pre-wrap bg-white p-2 border rounded mt-1 overflow-auto">
                    {error.stack}
                  </pre>
                </div>
              )}
              {errorInfo && (
                <div>
                  <strong>Component Stack:</strong>
                  <pre className="whitespace-pre-wrap bg-white p-2 border rounded mt-1 overflow-auto">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// Hook for handling async errors in components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)
  
  const resetError = React.useCallback(() => {
    setError(null)
  }, [])
  
  const handleError = React.useCallback((error: Error) => {
    console.error("Async error caught:", error)
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error // This will be caught by the nearest ErrorBoundary
    }
  }, [error])

  return { handleError, resetError }
}

// Simple error fallback components for specific use cases
export function BookingErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
        <h3 className="font-semibold text-red-800">Booking Error</h3>
      </div>
      <p className="text-sm text-red-700 mb-4">
        We couldn't process your booking request. This might be due to a temporary issue.
      </p>
      <Button onClick={onRetry} size="sm">
        Try Booking Again
      </Button>
    </div>
  )
}

export function PaymentErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
        <h3 className="font-semibold text-red-800">Payment Processing Error</h3>
      </div>
      <p className="text-sm text-red-700 mb-4">
        There was an issue processing your payment. Please check your payment details and try again.
      </p>
      <div className="flex space-x-3">
        <Button onClick={onRetry} size="sm">
          Retry Payment
        </Button>
        <Link href="/contact">
          <Button variant="outline" size="sm">
            Contact Support
          </Button>
        </Link>
      </div>
    </div>
  )
}