"use client"

import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { 
  Home, 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  Settings,
  Phone
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
  requiresAuth?: boolean
  roles?: string[]
}

interface MobileBottomNavProps {
  className?: string
}

export default function MobileBottomNav({ className }: MobileBottomNavProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  const getUserRole = () => {
    if (!session?.user) return ""
    // @ts-ignore - role might not be in default session type
    return session.user.role || "user"
  }

  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      {
        href: "/",
        icon: Home,
        label: "Home"
      },
      {
        href: "/packages",
        icon: MapPin,
        label: "Packages"
      },
      {
        href: "/contact",
        icon: Phone,
        label: "Contact"
      }
    ]

    if (session) {
      const userRole = getUserRole()
      const authenticatedItems: NavItem[] = [
        {
          href: "/booking/new",
          icon: Search,
          label: "Book",
          requiresAuth: true
        },
        {
          href: "/dashboard",
          icon: Calendar,
          label: "Bookings",
          requiresAuth: true
        }
      ]

      // Add role-specific items
      if (userRole === "AGENT") {
        authenticatedItems.push({
          href: "/agent",
          icon: Settings,
          label: "Agent",
          requiresAuth: true,
          roles: ["AGENT"]
        })
      } else if (userRole === "ADMIN") {
        authenticatedItems.push({
          href: "/admin",
          icon: Settings,
          label: "Admin",
          requiresAuth: true,
          roles: ["ADMIN"]
        })
      } else {
        authenticatedItems.push({
          href: "/profile",
          icon: User,
          label: "Profile",
          requiresAuth: true
        })
      }

      return [
        baseItems[0], // Home
        authenticatedItems[0], // Book
        authenticatedItems[1], // Bookings
        baseItems[1], // Packages
        authenticatedItems[2] || authenticatedItems[authenticatedItems.length - 1] // Profile/Agent/Admin
      ]
    }

    // Not authenticated - show basic nav with auth prompt
    return [
      ...baseItems,
      {
        href: "/login",
        icon: User,
        label: "Sign In"
      }
    ]
  }

  const navItems = getNavItems()

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(href)
  }

  if (status === "loading") {
    return (
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50",
        className
      )}>
        <div className="flex justify-around items-center py-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center py-1">
              <div className="w-6 h-6 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </nav>
    )
  }

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom",
      className
    )}>
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center py-1 px-3 transition-colors min-w-0 flex-1",
                active 
                  ? "text-blue-600" 
                  : "text-gray-600 hover:text-blue-600"
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  "h-5 w-5 mb-1",
                  active && "scale-110"
                )} />
                {active && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                )}
              </div>
              <span className={cn(
                "text-xs font-medium truncate",
                active && "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// Mobile header component for pages that need a simple top bar
interface MobileHeaderProps {
  title: string
  showBack?: boolean
  backHref?: string
  actions?: React.ReactNode
  className?: string
}

export function MobileHeader({ 
  title, 
  showBack = false, 
  backHref = "/",
  actions,
  className 
}: MobileHeaderProps) {
  return (
    <header className={cn(
      "sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {showBack && (
            <Link
              href={backHref}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <svg 
                className="h-5 w-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 19l-7-7 7-7" 
                />
              </svg>
            </Link>
          )}
          <h1 className="text-lg font-semibold truncate">{title}</h1>
        </div>
        
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}

// Floating Action Button for main CTA on mobile
interface FloatingActionButtonProps {
  href?: string
  onClick?: () => void
  icon?: React.ElementType
  label: string
  show?: boolean
  className?: string
}

export function FloatingActionButton({ 
  href,
  onClick,
  icon: Icon = Calendar,
  label,
  show = true,
  className 
}: FloatingActionButtonProps) {
  if (!show) return null

  const buttonContent = (
    <>
      <Icon className="h-5 w-5" />
      <span className="ml-2 font-medium">{label}</span>
    </>
  )

  const buttonClasses = cn(
    "fixed bottom-20 right-4 z-40 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg flex items-center transition-all duration-200 hover:scale-105 active:scale-95",
    className
  )

  if (href) {
    return (
      <Link href={href} className={buttonClasses}>
        {buttonContent}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={buttonClasses}>
      {buttonContent}
    </button>
  )
}