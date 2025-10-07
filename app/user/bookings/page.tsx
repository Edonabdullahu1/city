'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, Menu, X, Home, User, Calendar, Plus } from 'lucide-react';

interface Booking {
  id: string;
  reservationCode: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  expiresAt: string | null;
  confirmedAt: string | null;
  paidAt: string | null;
  services: {
    flights: Array<{
      id: string;
      origin: string;
      destination: string;
      departureDate: string;
      returnDate: string | null;
      passengers: number;
      class: string;
    }>;
    hotels: Array<{
      id: string;
      hotelName: string;
      location: string;
      checkIn: string;
      checkOut: string;
      roomType: string;
      nights: number;
    }>;
    transfers: any[];
    excursions: any[];
  };
}

export default function UserBookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    fetchBookings();
  }, [session, status, router]);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/user/bookings');
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      } else {
        console.error('Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SOFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
                className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 border-b"
              >
                <Home className="h-5 w-5 text-gray-600" />
                <span className="text-gray-900 font-medium">Dashboard</span>
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
                className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 border-b bg-blue-50"
              >
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="text-blue-600 font-medium">My Bookings</span>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Bookings</h1>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">You don't have any bookings yet.</p>
            <Link
              href="/"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
            >
              Book Your First Trip
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Header with status */}
                <div className="bg-gray-50 px-6 py-3 border-b flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    {booking.reservationCode}
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      booking.status
                    )}`}
                  >
                    {booking.status}
                  </span>
                </div>

                {/* Body with booking details */}
                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    {/* Left column - Trip details */}
                    <div>
                      {booking.services.flights.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Route</p>
                          <p className="text-base font-semibold text-gray-900">
                            {booking.services.flights[0].origin} → {booking.services.flights[0].destination}
                          </p>
                        </div>
                      )}

                      {booking.services.hotels.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Hotel</p>
                          <p className="text-base font-semibold text-gray-900">
                            {booking.services.hotels[0].hotelName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {booking.services.hotels[0].nights} night{booking.services.hotels[0].nights > 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right column - Dates and price */}
                    <div>
                      {booking.services.hotels.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Check-in / Check-out</p>
                          <p className="text-sm text-gray-900">
                            {new Date(booking.services.hotels[0].checkIn).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-gray-900">
                            {new Date(booking.services.hotels[0].checkOut).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      )}

                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Total Price</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {booking.currency} {(booking.totalAmount / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer info */}
                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-500">
                      Booked on{' '}
                      {new Date(booking.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {booking.status === 'SOFT' && booking.expiresAt && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠ Expires on{' '}
                        {new Date(booking.expiresAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* View Details button */}
                <Link
                  href={`/bookings/${booking.reservationCode}`}
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-4 font-semibold transition"
                >
                  View Details →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
