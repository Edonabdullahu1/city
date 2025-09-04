"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"

interface AccessibilitySettings {
  reducedMotion: boolean
  highContrast: boolean
  largeText: boolean
  focusRings: boolean
  announcements: boolean
}

interface AccessibilityContextType {
  settings: AccessibilitySettings
  updateSetting: (key: keyof AccessibilitySettings, value: boolean) => void
  announce: (message: string, priority?: 'polite' | 'assertive') => void
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

interface AccessibilityProviderProps {
  children: ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    focusRings: true,
    announcements: true
  })

  // Check system preferences on mount
  useEffect(() => {
    const checkSystemPreferences = () => {
      if (typeof window === 'undefined') return

      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      
      // Check for high contrast preference
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches

      // Load saved preferences from localStorage
      const saved = localStorage.getItem('accessibility-settings')
      if (saved) {
        try {
          const savedSettings = JSON.parse(saved)
          setSettings(prev => ({
            ...prev,
            ...savedSettings,
            // Override with system preferences
            reducedMotion: prefersReducedMotion || savedSettings.reducedMotion,
            highContrast: prefersHighContrast || savedSettings.highContrast
          }))
        } catch (error) {
          console.warn('Failed to parse saved accessibility settings')
        }
      } else {
        setSettings(prev => ({
          ...prev,
          reducedMotion: prefersReducedMotion,
          highContrast: prefersHighContrast
        }))
      }
    }

    checkSystemPreferences()

    // Listen for system preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const contrastQuery = window.matchMedia('(prefers-contrast: high)')

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, reducedMotion: e.matches }))
    }

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, highContrast: e.matches }))
    }

    motionQuery.addEventListener('change', handleMotionChange)
    contrastQuery.addEventListener('change', handleContrastChange)

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange)
      contrastQuery.removeEventListener('change', handleContrastChange)
    }
  }, [])

  // Apply settings to document
  useEffect(() => {
    if (typeof document === 'undefined') return

    const body = document.body

    // Apply CSS classes based on settings
    body.classList.toggle('reduced-motion', settings.reducedMotion)
    body.classList.toggle('high-contrast', settings.highContrast)
    body.classList.toggle('large-text', settings.largeText)
    body.classList.toggle('focus-rings', settings.focusRings)

    // Save settings to localStorage
    localStorage.setItem('accessibility-settings', JSON.stringify(settings))
  }, [settings])

  const updateSetting = (key: keyof AccessibilitySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!settings.announcements) return

    // Create live region for screen reader announcements
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', priority)
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.setAttribute('class', 'sr-only')
    liveRegion.textContent = message

    document.body.appendChild(liveRegion)

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(liveRegion)
    }, 1000)
  }

  return (
    <AccessibilityContext.Provider value={{ settings, updateSetting, announce }}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider')
  }
  return context
}

// Screen Reader Only component
interface ScreenReaderOnlyProps {
  children: ReactNode
  as?: keyof React.JSX.IntrinsicElements
  className?: string
  id?: string
  [key: string]: any
}

export function ScreenReaderOnly({ 
  children, 
  as: Component = 'span',
  className = '',
  ...props
}: ScreenReaderOnlyProps) {
  return (
    <Component {...props} className={`sr-only ${className}`}>
      {children}
    </Component>
  )
}

// Skip Link component for keyboard navigation
interface SkipLinkProps {
  href: string
  children: ReactNode
  className?: string
}

export function SkipLink({ href, children, className = '' }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={`
        absolute left-0 top-0 z-50 p-3 bg-primary text-primary-foreground
        transform -translate-y-full focus:translate-y-0 transition-transform
        ${className}
      `}
      onFocus={(e) => e.currentTarget.scrollIntoView()}
    >
      {children}
    </a>
  )
}

// Accessible button with loading and disabled states
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  children: ReactNode
}

export function AccessibleButton({
  loading = false,
  loadingText = 'Loading...',
  disabled,
  children,
  className = '',
  ...props
}: AccessibleButtonProps) {
  const { settings, announce } = useAccessibility()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) {
      e.preventDefault()
      return
    }

    // Announce button activation for screen readers
    if (settings.announcements) {
      const buttonText = typeof children === 'string' ? children : 'Button activated'
      announce(`${buttonText} button pressed`)
    }

    props.onClick?.(e)
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-describedby={loading ? `${props.id}-loading` : undefined}
      className={`
        ${className}
        ${settings.focusRings ? 'focus-visible:ring-2 focus-visible:ring-offset-2' : ''}
        ${loading ? 'cursor-not-allowed opacity-75' : ''}
        transition-all duration-200
      `}
      onClick={handleClick}
    >
      {loading ? (
        <>
          <span aria-hidden="true" className="inline-block animate-spin mr-2">
            ⟳
          </span>
          <span>{loadingText}</span>
          <ScreenReaderOnly id={`${props.id}-loading`}>
            Please wait, processing your request
          </ScreenReaderOnly>
        </>
      ) : (
        children
      )}
    </button>
  )
}

// Accessible form field with proper labeling
interface AccessibleFieldProps {
  label: string
  children: ReactNode
  error?: string
  required?: boolean
  description?: string
  id: string
  className?: string
}

export function AccessibleField({
  label,
  children,
  error,
  required = false,
  description,
  id,
  className = ''
}: AccessibleFieldProps) {
  const errorId = `${id}-error`
  const descriptionId = `${id}-description`

  return (
    <div className={`space-y-2 ${className}`}>
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          id,
          'aria-required': required,
          'aria-invalid': !!error,
          'aria-describedby': [
            description ? descriptionId : '',
            error ? errorId : ''
          ].filter(Boolean).join(' ') || undefined
        } as any)}
      </div>
      
      {error && (
        <p 
          id={errorId} 
          role="alert" 
          className="text-sm text-destructive"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  )
}

// Hook for managing focus
export function useFocusManagement() {
  const focusTrap = (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    element.addEventListener('keydown', handleKeyDown)
    
    // Focus first element
    firstElement?.focus()

    return () => {
      element.removeEventListener('keydown', handleKeyDown)
    }
  }

  const restoreFocus = (previousActiveElement: Element | null) => {
    if (previousActiveElement && previousActiveElement instanceof HTMLElement) {
      previousActiveElement.focus()
    }
  }

  return { focusTrap, restoreFocus }
}

// Hook for keyboard navigation
export function useKeyboardNavigation(
  onEnter?: () => void,
  onEscape?: () => void,
  onArrowKeys?: (direction: 'up' | 'down' | 'left' | 'right') => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          onEnter?.()
          break
        case 'Escape':
          onEscape?.()
          break
        case 'ArrowUp':
          onArrowKeys?.('up')
          break
        case 'ArrowDown':
          onArrowKeys?.('down')
          break
        case 'ArrowLeft':
          onArrowKeys?.('left')
          break
        case 'ArrowRight':
          onArrowKeys?.('right')
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onEnter, onEscape, onArrowKeys])
}