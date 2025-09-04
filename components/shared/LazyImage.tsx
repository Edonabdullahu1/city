"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface LazyImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
  placeholder?: "blur" | "empty"
  blurDataURL?: string
  onLoad?: () => void
  onError?: () => void
  sizes?: string
  fill?: boolean
}

export default function LazyImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  placeholder = "empty",
  blurDataURL,
  onLoad,
  onError,
  sizes,
  fill = false
}: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [isInView, setIsInView] = useState(priority) // Load immediately if priority
  const imgRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [priority, isInView])

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setIsError(true)
    onError?.()
  }

  const containerClasses = cn(
    "relative overflow-hidden",
    isLoading && "animate-pulse bg-gray-200",
    className
  )

  // Error fallback
  if (isError) {
    return (
      <div 
        className={cn(containerClasses, "flex items-center justify-center bg-gray-100")}
        style={{ width, height }}
        role="img"
        aria-label={`Failed to load image: ${alt}`}
      >
        <div className="text-center text-gray-400">
          <svg className="mx-auto h-12 w-12 mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <p className="text-xs">Image not available</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={imgRef} className={containerClasses}>
      {/* Loading skeleton */}
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ width, height }}
          aria-hidden="true"
        />
      )}

      {/* Actual image - only render when in view or priority */}
      {(isInView || priority) && (
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          style={{
            objectFit: 'cover',
            objectPosition: 'center'
          }}
        />
      )}
    </div>
  )
}

// Predefined sizes for common use cases
export const imageSizes = {
  thumbnail: "64px",
  card: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  hero: "(max-width: 768px) 100vw, 100vw",
  gallery: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
}

// Utility for generating blur data URLs
export function generateBlurDataURL(width: number = 10, height: number = 10): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  
  // Create simple gradient blur placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#f3f4f6')
  gradient.addColorStop(1, '#e5e7eb')
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  return canvas.toDataURL()
}

// Component for destination images with optimized loading
interface DestinationImageProps {
  destination: string
  className?: string
  priority?: boolean
}

export function DestinationImage({ 
  destination, 
  className, 
  priority = false 
}: DestinationImageProps) {
  const imageMap: Record<string, { src: string; alt: string }> = {
    paris: {
      src: '/images/destinations/paris.jpg',
      alt: 'Paris skyline with Eiffel Tower'
    },
    barcelona: {
      src: '/images/destinations/barcelona.jpg',
      alt: 'Barcelona architecture and coastline'
    },
    amsterdam: {
      src: '/images/destinations/amsterdam.jpg',
      alt: 'Amsterdam canals and historic buildings'
    },
    rome: {
      src: '/images/destinations/rome.jpg',
      alt: 'Rome Colosseum and ancient architecture'
    },
    london: {
      src: '/images/destinations/london.jpg',
      alt: 'London skyline with Big Ben'
    },
    berlin: {
      src: '/images/destinations/berlin.jpg',
      alt: 'Berlin Brandenburg Gate'
    }
  }

  const imageData = imageMap[destination.toLowerCase()] || {
    src: '/images/destinations/default.jpg',
    alt: `${destination} city view`
  }

  return (
    <LazyImage
      src={imageData.src}
      alt={imageData.alt}
      width={400}
      height={300}
      className={className}
      priority={priority}
      placeholder="blur"
      blurDataURL={generateBlurDataURL()}
      sizes={imageSizes.card}
    />
  )
}