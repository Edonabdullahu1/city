'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PlusIcon, PencilIcon, TrashIcon, BuildingOfficeIcon, StarIcon, MapPinIcon, CalculatorIcon } from '@heroicons/react/24/outline';
import AdminLayout from '@/components/AdminLayout';

interface Hotel {
  id: string;
  hotelId?: number;
  name: string;
  address?: string;
  location: string;
  starRating?: number;
  description?: string;
  facilities?: string[];
  images?: string[];
  checkIn?: string;
  checkOut?: string;
  bookingCount?: number;
  createdAt?: string;
}

export default function AdminHotelsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/');
    } else if (session) {
      fetchHotels();
    }
  }, [status, session, router]);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/hotels');
      if (!response.ok) throw new Error('Failed to fetch hotels');
      const data = await response.json();
      setHotels(data || []);
    } catch (error) {
      console.error('Error fetching hotels:', error);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };



  const handleDelete = async (hotelId: string) => {
    if (!confirm('Are you sure you want to delete this hotel? This action cannot be undone.')) return;
    
    try {
      const response = await fetch(`/api/admin/hotels/${hotelId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete hotel');
      }
      await fetchHotels();
    } catch (error: any) {
      console.error('Error deleting hotel:', error);
      alert(error.message || 'Failed to delete hotel');
    }
  };

  const filteredHotels = hotels.filter(hotel => {
    const matchesSearch = hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         hotel.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = filterLocation === 'all' || hotel.location === filterLocation;
    return matchesSearch && matchesLocation;
  });

  // Get unique locations from hotels
  const uniqueLocations = Array.from(new Set(hotels.map(h => h.location).filter(Boolean)));

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hotel Management</h1>
              <p className="text-gray-600 mt-2">Manage hotel inventory and pricing</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/admin/hotels/pricing')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <CalculatorIcon className="h-5 w-5 mr-2" />
                Pricing Calculator
              </button>
              <button
                onClick={() => router.push('/admin/hotels/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Hotel
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4">
            <input
              type="text"
              placeholder="Search hotels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Locations</option>
              {uniqueLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>

          {/* Hotels Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredHotels.map(hotel => (
              <div key={hotel.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-blue-500 to-blue-600 relative">
                  {hotel.images && hotel.images.length > 0 ? (
                    <img 
                      src={hotel.images[0]} 
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BuildingOfficeIcon className="h-16 w-16 text-white opacity-50" />
                    </div>
                  )}
                  {hotel.hotelId && (
                    <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-lg shadow">
                      <span className="text-xs font-bold text-gray-700">#{hotel.hotelId}</span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{hotel.name}</h3>
                    {hotel.bookingCount !== undefined && hotel.bookingCount > 0 && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        {hotel.bookingCount} bookings
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <MapPinIcon className="h-4 w-4 text-gray-500" />
                    <p className="text-gray-600">{hotel.location}</p>
                  </div>
                  
                  {hotel.starRating && (
                    <div className="flex items-center mb-3">
                      <span className="text-yellow-400">{'★'.repeat(hotel.starRating)}</span>
                      <span className="text-gray-300">{'★'.repeat(5 - hotel.starRating)}</span>
                      <span className="ml-2 text-sm text-gray-600">{hotel.starRating} Star Hotel</span>
                    </div>
                  )}
                  
                  {hotel.description && (
                    <div 
                      className="text-gray-700 text-sm mb-4 line-clamp-2"
                      dangerouslySetInnerHTML={{ 
                        __html: hotel.description.replace(/<[^>]*>/g, '') 
                      }}
                    />
                  )}
                  
                  {hotel.checkIn && hotel.checkOut && (
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Check-in</span>
                        <span className="font-semibold">{hotel.checkIn}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Check-out</span>
                        <span className="font-semibold">{hotel.checkOut}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => router.push(`/admin/hotels/${hotel.id}`)}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(hotel.id)}
                      disabled={hotel.bookingCount && hotel.bookingCount > 0}
                      className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}  {filteredHotels.length === 0 && (
            <div className="text-center py-12">
              <BuildingOfficeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hotels found</p>
            </div>
          )}
          </div>
        </div>

    </AdminLayout>
  );
}