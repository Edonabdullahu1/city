'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LogOut, Menu, X, Home, User, Calendar, Plus } from 'lucide-react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
    } else if (session.user.role === 'ADMIN') {
      router.push('/admin/dashboard')
    } else if (session.user.role === 'AGENT') {
      router.push('/agent/dashboard')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!session || session.user.role !== 'USER') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              Max Travel
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-white z-40 pt-16">
            <nav className="py-4">
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 border-b bg-blue-50"
              >
                <Home className="h-5 w-5 text-blue-600" />
                <span className="text-blue-600 font-medium">Dashboard</span>
              </Link>
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 border-b"
              >
                <Plus className="h-5 w-5 text-gray-600" />
                <span className="text-gray-900 font-medium">New Booking</span>
              </Link>
              <Link
                href="/user/bookings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 border-b"
              >
                <Calendar className="h-5 w-5 text-gray-600" />
                <span className="text-gray-900 font-medium">My Bookings</span>
              </Link>
              <Link
                href="/user/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 border-b"
              >
                <User className="h-5 w-5 text-gray-600" />
                <span className="text-gray-900 font-medium">Profile</span>
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut({ redirect: false }).then(() => {
                    router.push('/');
                  });
                }}
                className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 border-b w-full text-left"
              >
                <LogOut className="h-5 w-5 text-red-600" />
                <span className="text-red-600 font-medium">Logout</span>
              </button>
            </nav>
          </div>
        </>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Welcome, {session.user.name || session.user.email}!
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">My Bookings</h2>
            <p className="text-gray-600">View and manage your travel bookings</p>
            <Link href="/user/bookings" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">
              View all bookings →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Book New Trip</h2>
            <p className="text-gray-600">Explore our city break packages</p>
            <Link href="/" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">
              Start booking →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">My Profile</h2>
            <p className="text-gray-600">Update your personal information</p>
            <Link href="/user/profile" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">
              Edit profile →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}