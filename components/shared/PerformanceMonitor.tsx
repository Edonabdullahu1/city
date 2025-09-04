"use client"

import { useEffect, useRef } from "react"

interface PerformanceMonitorProps {
  enabled?: boolean
  logToConsole?: boolean
  sendToAnalytics?: boolean
}

interface PerformanceMetrics {
  pageLoadTime: number
  timeToFirstByte: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
}

export default function PerformanceMonitor({
  enabled = process.env.NODE_ENV === 'development',
  logToConsole = true,
  sendToAnalytics = false
}: PerformanceMonitorProps) {
  const metricsRef = useRef<Partial<PerformanceMetrics>>({})

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    // Function to collect and report metrics
    const reportMetrics = (metrics: Partial<PerformanceMetrics>) => {
      if (logToConsole) {
        console.group('🚀 Performance Metrics')
        Object.entries(metrics).forEach(([key, value]) => {
          if (value !== undefined) {
            console.log(`${key}: ${Math.round(value)}ms`)
          }
        })
        console.groupEnd()
      }

      if (sendToAnalytics) {
        // Send to your analytics service
        // Example: analytics.track('performance_metrics', metrics)
        console.log('📊 Sending metrics to analytics:', metrics)
      }
    }

    // Get Navigation Timing metrics
    const getNavigationMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (!navigation) return

      metricsRef.current = {
        ...metricsRef.current,
        pageLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
        timeToFirstByte: navigation.responseStart - navigation.requestStart
      }
    }

    // Get Paint Timing metrics
    const getPaintMetrics = () => {
      const paintEntries = performance.getEntriesByType('paint')
      
      paintEntries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          metricsRef.current.firstContentfulPaint = entry.startTime
        }
      })
    }

    // Get Largest Contentful Paint
    const getLCPMetrics = () => {
      if (!('PerformanceObserver' in window)) return

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        metricsRef.current.largestContentfulPaint = lastEntry.startTime
      })

      try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (error) {
        console.warn('LCP measurement not supported')
      }

      // Cleanup after 10 seconds
      setTimeout(() => observer.disconnect(), 10000)
    }

    // Get Cumulative Layout Shift
    const getCLSMetrics = () => {
      if (!('PerformanceObserver' in window)) return

      let clsValue = 0
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        }
        metricsRef.current.cumulativeLayoutShift = clsValue
      })

      try {
        observer.observe({ entryTypes: ['layout-shift'] })
      } catch (error) {
        console.warn('CLS measurement not supported')
      }

      // Report final CLS after 10 seconds
      setTimeout(() => {
        observer.disconnect()
        reportMetrics(metricsRef.current)
      }, 10000)
    }

    // Get First Input Delay
    const getFIDMetrics = () => {
      if (!('PerformanceObserver' in window)) return

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          metricsRef.current.firstInputDelay = entry.processingStart - entry.startTime
        }
      })

      try {
        observer.observe({ entryTypes: ['first-input'] })
      } catch (error) {
        console.warn('FID measurement not supported')
      }

      // Cleanup after first input
      setTimeout(() => observer.disconnect(), 30000)
    }

    // Wait for page load to collect metrics
    const collectMetrics = () => {
      getNavigationMetrics()
      getPaintMetrics()
      getLCPMetrics()
      getCLSMetrics()
      getFIDMetrics()

      // Report basic metrics immediately
      setTimeout(() => {
        reportMetrics({
          pageLoadTime: metricsRef.current.pageLoadTime,
          timeToFirstByte: metricsRef.current.timeToFirstByte,
          firstContentfulPaint: metricsRef.current.firstContentfulPaint
        })
      }, 1000)
    }

    if (document.readyState === 'complete') {
      collectMetrics()
    } else {
      window.addEventListener('load', collectMetrics)
    }

    return () => {
      window.removeEventListener('load', collectMetrics)
    }
  }, [enabled, logToConsole, sendToAnalytics])

  // Component doesn't render anything
  return null
}

// Hook for measuring component render performance
export function useRenderPerformance(componentName: string) {
  const renderStartTime = useRef<number>(0)

  useEffect(() => {
    renderStartTime.current = performance.now()
    
    return () => {
      const renderTime = performance.now() - renderStartTime.current
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎨 ${componentName} render time: ${Math.round(renderTime)}ms`)
      }
    }
  })
}

// Hook for measuring async operation performance
export function useAsyncPerformance() {
  const measureAsync = <T,>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    const startTime = performance.now()
    
    return operation().finally(() => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚡ ${operationName} completed in ${Math.round(duration)}ms`)
      }
    })
  }

  return { measureAsync }
}

// Performance budget checker
export function checkPerformanceBudget() {
  if (typeof window === 'undefined') return

  const budgets = {
    firstContentfulPaint: 1500, // 1.5 seconds
    largestContentfulPaint: 2500, // 2.5 seconds
    cumulativeLayoutShift: 0.1, // 0.1 CLS score
    firstInputDelay: 100 // 100ms
  }

  setTimeout(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paintEntries = performance.getEntriesByType('paint')
    
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime
    
    const warnings: string[] = []
    
    if (fcp && fcp > budgets.firstContentfulPaint) {
      warnings.push(`FCP exceeded budget: ${Math.round(fcp)}ms > ${budgets.firstContentfulPaint}ms`)
    }
    
    if (navigation.loadEventEnd - navigation.loadEventStart > 3000) {
      warnings.push(`Page load time exceeded 3s`)
    }
    
    if (warnings.length > 0) {
      console.warn('⚠️ Performance Budget Exceeded:', warnings)
    } else {
      console.log('✅ Performance budget met!')
    }
  }, 3000)
}

// Resource loading performance tracker
export function trackResourceLoading() {
  if (typeof window === 'undefined') return

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    
    entries.forEach((entry) => {
      if (entry.duration > 1000) { // Slow resources > 1s
        console.warn(`🐌 Slow resource: ${entry.name} took ${Math.round(entry.duration)}ms`)
      }
    })
  })

  try {
    observer.observe({ entryTypes: ['resource'] })
  } catch (error) {
    console.warn('Resource timing not supported')
  }

  // Cleanup after 30 seconds
  setTimeout(() => observer.disconnect(), 30000)
}