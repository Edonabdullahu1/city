'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Welcome, {session.user.name || session.user.email}!
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">My Bookings</h2>
            <p className="text-gray-600">View and manage your travel bookings</p>
            <button className="mt-4 text-indigo-600 hover:text-indigo-500">
              View all bookings →
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Book New Trip</h2>
            <p className="text-gray-600">Explore our city break packages</p>
            <button className="mt-4 text-indigo-600 hover:text-indigo-500">
              Start booking →
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">My Profile</h2>
            <p className="text-gray-600">Update your personal information</p>
            <button className="mt-4 text-indigo-600 hover:text-indigo-500">
              Edit profile →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}