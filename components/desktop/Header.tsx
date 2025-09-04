"use client"

import { useState, useRef, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/shared/button"
import { 
  User, 
  LogOut, 
  Settings, 
  MapPin, 
  Calendar,
  Menu,
  ChevronDown,
  Globe,
  Phone
} from "lucide-react"

interface DesktopHeaderProps {
  className?: string
}

export default function DesktopHeader({ className }: DesktopHeaderProps) {
  const { data: session, status } = useSession()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState("EN")
  
  const userMenuRef = useRef<HTMLDivElement>(null)
  const languageMenuRef = useRef<HTMLDivElement>(null)

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const languages = [
    { code: "EN", name: "English", flag: "🇺🇸" },
    { code: "AL", name: "Albanian", flag: "🇦🇱" },
    { code: "MK", name: "Macedonian", flag: "🇲🇰" }
  ]

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  const getUserDisplayName = () => {
    if (!session?.user) return ""
    return session.user.name || session.user.email?.split("@")[0] || "User"
  }

  const getUserRole = () => {
    if (!session?.user) return ""
    // @ts-ignore - role might not be in default session type
    return session.user.role || "user"
  }

  return (
    <header className={`border-b bg-white sticky top-0 z-40 ${className}`}>
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">Travel Agency</span>
          </Link>

          {/* Main Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/packages" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Packages
            </Link>
            <Link 
              href="/destinations" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Destinations
            </Link>
            <Link 
              href="/about" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              About
            </Link>
            <Link 
              href="/contact" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Contact
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <div className="relative" ref={languageMenuRef}>
              <button
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Globe className="h-4 w-4" />
                <span className="text-sm font-medium">{currentLanguage}</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {isLanguageMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border py-1 z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setCurrentLanguage(lang.code)
                        setIsLanguageMenuOpen(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="mr-3">{lang.flag}</span>
                      <span>{lang.name}</span>
                      {currentLanguage === lang.code && (
                        <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="hidden lg:flex items-center space-x-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>+1 (555) 123-4567</span>
            </div>

            {/* User Menu or Auth Buttons */}
            {status === "loading" ? (
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
            ) : session ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium">{getUserDisplayName()}</p>
                    <p className="text-xs text-muted-foreground capitalize">{getUserRole()}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border py-1 z-50">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium">{getUserDisplayName()}</p>
                      <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                      <p className="text-xs text-blue-600 capitalize">{getUserRole()} Account</p>
                    </div>
                    
                    <Link
                      href="/dashboard"
                      className="flex items-center px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Calendar className="h-4 w-4 mr-3" />
                      My Bookings
                    </Link>

                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Profile Settings
                    </Link>

                    {getUserRole() === "AGENT" && (
                      <Link
                        href="/agent"
                        className="flex items-center px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-3" />
                        Agent Dashboard
                      </Link>
                    )}

                    {getUserRole() === "ADMIN" && (
                      <Link
                        href="/admin"
                        className="flex items-center px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Admin Panel
                      </Link>
                    )}

                    <hr className="my-1" />
                    
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {/* Book Now CTA */}
            {session && (
              <Link href="/booking/new">
                <Button size="sm" className="hidden lg:inline-flex">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Now
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 rounded-md hover:bg-gray-50">
            <Menu className="h-5 w-5" />
          </button>
        </nav>
      </div>
    </header>
  )
}