'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PlusIcon, PencilIcon, TrashIcon, MapIcon, ClockIcon, UsersIcon, TicketIcon } from '@heroicons/react/24/outline';
import AdminLayout from '@/components/AdminLayout';

interface Excursion {
  id: string;
  title: string;
  description: string;
  location: string;
  duration: number;
  price: number;
  capacity: number;
  meetingPoint: string;
  includes: string[];
  excludes: string[];
  images: string[];
  active: boolean;
  createdAt: string;
}

interface City {
  id: string;
  name: string;
  countryName: string;
  active: boolean;
}

export default function AdminExcursionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [excursions, setExcursions] = useState<Excursion[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingExcursion, setEditingExcursion] = useState<Excursion | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    duration: 120,
    price: 50,
    capacity: 20,
    meetingPoint: '',
    includes: '',
    excludes: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/');
    } else if (session) {
      fetchExcursions();
      fetchCities();
    }
  }, [status, session, router]);

  const fetchExcursions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/excursions');
      if (!response.ok) throw new Error('Failed to fetch excursions');
      const data = await response.json();
      setExcursions(data.excursions || []);
    } catch (error) {
      console.error('Error fetching excursions:', error);
      setExcursions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await fetch('/api/admin/cities');
      if (!response.ok) throw new Error('Failed to fetch cities');
      const data = await response.json();
      setCities(data.cities?.filter((city: City) => city.active) || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingExcursion 
        ? `/api/admin/excursions/${editingExcursion.id}`
        : '/api/admin/excursions';
      
      const method = editingExcursion ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          duration: parseInt(formData.duration.toString()),
          price: Math.round(parseFloat(formData.price.toString()) * 100), // Convert to cents
          capacity: parseInt(formData.capacity.toString()),
          includes: formData.includes.split(',').map(s => s.trim()).filter(s => s),
          excludes: formData.excludes.split(',').map(s => s.trim()).filter(s => s)
        })
      });

      if (!response.ok) throw new Error('Failed to save excursion');
      
      await fetchExcursions();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving excursion:', error);
      alert('Failed to save excursion');
    }
  };

  const handleDelete = async (excursionId: string) => {
    if (!confirm('Are you sure you want to delete this excursion?')) return;
    
    try {
      const response = await fetch(`/api/admin/excursions/${excursionId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete excursion');
      await fetchExcursions();
    } catch (error) {
      console.error('Error deleting excursion:', error);
      alert('Failed to delete excursion');
    }
  };

  const handleEdit = (excursion: Excursion) => {
    setEditingExcursion(excursion);
    setFormData({
      title: excursion.title,
      description: excursion.description,
      location: excursion.location,
      duration: excursion.duration,
      price: excursion.price / 100, // Convert from cents
      capacity: excursion.capacity,
      meetingPoint: excursion.meetingPoint,
      includes: excursion.includes.join(', '),
      excludes: excursion.excludes.join(', ')
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingExcursion(null);
    setFormData({
      title: '',
      description: '',
      location: '',
      duration: 120,
      price: 50,
      capacity: 20,
      meetingPoint: '',
      includes: '',
      excludes: ''
    });
  };

  const filteredExcursions = excursions.filter(excursion => {
    const matchesSearch = 
      excursion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      excursion.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLocation = 
      filterLocation === 'all' || 
      excursion.location.toLowerCase() === filterLocation.toLowerCase();
    
    return matchesSearch && matchesLocation;
  });

  const uniqueLocations = Array.from(new Set(excursions.map(e => e.location)));

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

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
              <h1 className="text-3xl font-bold text-gray-900">Excursion Management</h1>
              <p className="text-gray-600 mt-2">Manage tours and activities for travelers</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Excursion
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4">
            <input
              type="text"
              placeholder="Search excursions..."
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

          {/* Excursions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredExcursions.map(excursion => (
              <div key={excursion.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center p-6">
                  <div className="text-center text-white">
                    <TicketIcon className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-lg font-semibold">{excursion.location}</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-900 flex-1">{excursion.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ml-2 ${
                      excursion.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {excursion.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{excursion.description}</p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <ClockIcon className="h-4 w-4 mr-1 text-blue-500" />
                      <span>{formatDuration(excursion.duration)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <UsersIcon className="h-4 w-4 mr-1 text-green-500" />
                      <span>Max {excursion.capacity}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapIcon className="h-4 w-4 mr-1 text-purple-500" />
                      <span className="truncate">{excursion.meetingPoint}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-600">
                        €{(excursion.price / 100).toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">/person</span>
                    </div>
                  </div>

                  {excursion.includes.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Includes:</p>
                      <div className="flex flex-wrap gap-1">
                        {excursion.includes.slice(0, 3).map((item, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">
                            {item}
                          </span>
                        ))}
                        {excursion.includes.length > 3 && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            +{excursion.includes.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <button
                      onClick={() => handleEdit(excursion)}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(excursion.id)}
                      className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center justify-center"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredExcursions.length === 0 && (
            <div className="text-center py-12">
              <TicketIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No excursions found</p>
            </div>
          )}
        </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingExcursion ? 'Edit Excursion' : 'Add New Excursion'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Sagrada Familia Guided Tour"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the excursion experience..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <select
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a city</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.name}>
                        {city.name}, {city.countryName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Point
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.meetingPoint}
                    onChange={(e) => setFormData({ ...formData, meetingPoint: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Main Entrance"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    required
                    min="15"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price per Person (€)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What's Included (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.includes}
                    onChange={(e) => setFormData({ ...formData, includes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Skip-the-line tickets, Professional guide, Headsets"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What's Not Included (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.excludes}
                    onChange={(e) => setFormData({ ...formData, excludes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Transportation, Food and drinks, Gratuities"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingExcursion ? 'Update Excursion' : 'Add Excursion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}