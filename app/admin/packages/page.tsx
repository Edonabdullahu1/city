'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
  CurrencyEuroIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface Package {
  id: string;
  name: string;
  description: string;
  location: string;
  nights: number;
  basePrice: number;
  maxOccupancy: number;
  availableFrom: string;
  availableTo: string;
  active: boolean;
  featured: boolean;
  bookingCount: number;
  departureFlight?: {
    flightNumber: string;
    departureTime: string;
    originCity: {
      name: string;
    };
  };
  returnFlight?: {
    flightNumber: string;
    departureTime: string;
  };
  hotel?: {
    name: string;
  };
}

export default function AdminPackagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterActive, setFilterActive] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/');
    } else if (session) {
      fetchPackages();
    }
  }, [status, session, router]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/packages');
      if (!response.ok) throw new Error('Failed to fetch packages');
      const data = await response.json();
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package? This action cannot be undone.')) return;
    
    try {
      const response = await fetch(`/api/admin/packages/${packageId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete package');
      }
      await fetchPackages();
    } catch (error: any) {
      console.error('Error deleting package:', error);
      alert(error.message || 'Failed to delete package');
    }
  };

  const toggleActive = async (packageId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/packages/${packageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentStatus })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update package');
      }
      await fetchPackages();
    } catch (error: any) {
      console.error('Error updating package:', error);
      alert(error.message || 'Failed to update package');
    }
  };

  const toggleFeatured = async (packageId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/packages/${packageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !currentStatus })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update package');
      }
      await fetchPackages();
    } catch (error: any) {
      console.error('Error updating package:', error);
      alert(error.message || 'Failed to update package');
    }
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pkg.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (pkg.hotel?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = filterLocation === 'all' || pkg.location === filterLocation;
    const matchesActive = filterActive === 'all' || 
                          (filterActive === 'active' && pkg.active) ||
                          (filterActive === 'inactive' && !pkg.active);
    return matchesSearch && matchesLocation && matchesActive;
  });

  // Get unique locations from packages
  const uniqueLocations = Array.from(new Set(packages.map(p => p.location).filter(Boolean)));

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
            <h1 className="text-3xl font-bold text-gray-900">Package Management</h1>
            <p className="text-gray-600 mt-2">Manage travel packages and offerings</p>
          </div>
          <button
            onClick={() => router.push('/admin/packages/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Package
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search packages..."
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
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPackages.map(pkg => (
            <div key={pkg.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Package Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold">{pkg.name}</h3>
                  <div className="flex gap-2">
                    {pkg.featured && (
                      <StarIcon className="h-5 w-5 text-yellow-300 fill-current" />
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      pkg.active ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'
                    }`}>
                      {pkg.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <MapPinIcon className="h-4 w-4" />
                  <span className="text-sm">{pkg.location}</span>
                </div>
                
                {pkg.description && (
                  <p className="text-sm opacity-90 line-clamp-2">{pkg.description}</p>
                )}
              </div>

              {/* Package Details */}
              <div className="p-6">
                {/* Flight Info */}
                {pkg.departureFlight && (
                  <div className="mb-4 pb-4 border-b">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Flights</h4>
                    <div className="text-sm text-gray-600">
                      <div>Outbound: {pkg.departureFlight.flightNumber}</div>
                      <div>From: {pkg.departureFlight.originCity?.name}</div>
                      <div>Date: {new Date(pkg.departureFlight.departureTime).toLocaleDateString()}</div>
                    </div>
                  </div>
                )}

                {/* Hotel Info */}
                {pkg.hotel && (
                  <div className="mb-4 pb-4 border-b">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Accommodation</h4>
                    <div className="text-sm text-gray-600">
                      {pkg.hotel.name}
                    </div>
                  </div>
                )}

                {/* Package Info */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{pkg.nights} nights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Max {pkg.maxOccupancy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CurrencyEuroIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-semibold">€{(pkg.basePrice / 100).toFixed(2)}</span>
                  </div>
                  {pkg.bookingCount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-600">{pkg.bookingCount} bookings</span>
                    </div>
                  )}
                </div>

                {/* Availability */}
                <div className="text-xs text-gray-500 mb-4">
                  Available: {new Date(pkg.availableFrom).toLocaleDateString()} - {new Date(pkg.availableTo).toLocaleDateString()}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/admin/packages/${pkg.id}`)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(pkg.id, pkg.active)}
                    className={`flex-1 px-3 py-2 rounded-lg flex items-center justify-center ${
                      pkg.active 
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {pkg.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => toggleFeatured(pkg.id, pkg.featured)}
                    className={`px-3 py-2 rounded-lg ${
                      pkg.featured
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <StarIcon className={`h-4 w-4 ${pkg.featured ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    disabled={pkg.bookingCount > 0}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredPackages.length === 0 && (
            <div className="col-span-full text-center py-12">
              <MapPinIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No packages found</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}