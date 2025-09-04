'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PlusIcon, PencilIcon, TrashIcon, TruckIcon, ClockIcon, UsersIcon, MapPinIcon } from '@heroicons/react/24/outline';
import AdminLayout from '@/components/AdminLayout';

interface Transfer {
  id: string;
  name: string;
  fromLocation: string;
  toLocation: string;
  vehicleType: string;
  capacity: number;
  price: number;
  duration: number;
  description: string;
  active: boolean;
  createdAt: string;
}

interface City {
  id: string;
  name: string;
  countryName: string;
  active: boolean;
}

export default function AdminTransfersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    fromLocation: '',
    toLocation: '',
    vehicleType: 'Sedan',
    capacity: 3,
    price: 45,
    duration: 30,
    description: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/');
    } else if (session) {
      fetchTransfers();
      fetchCities();
    }
  }, [status, session, router]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/transfers');
      if (!response.ok) throw new Error('Failed to fetch transfers');
      const data = await response.json();
      setTransfers(data.transfers || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      setTransfers([]);
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
      const url = editingTransfer 
        ? `/api/admin/transfers/${editingTransfer.id}`
        : '/api/admin/transfers';
      
      const method = editingTransfer ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          capacity: parseInt(formData.capacity.toString()),
          price: Math.round(parseFloat(formData.price.toString()) * 100), // Convert to cents
          duration: parseInt(formData.duration.toString())
        })
      });

      if (!response.ok) throw new Error('Failed to save transfer');
      
      await fetchTransfers();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving transfer:', error);
      alert('Failed to save transfer');
    }
  };

  const handleDelete = async (transferId: string) => {
    if (!confirm('Are you sure you want to delete this transfer?')) return;
    
    try {
      const response = await fetch(`/api/admin/transfers/${transferId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete transfer');
      await fetchTransfers();
    } catch (error) {
      console.error('Error deleting transfer:', error);
      alert('Failed to delete transfer');
    }
  };

  const handleEdit = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    setFormData({
      name: transfer.name,
      fromLocation: transfer.fromLocation,
      toLocation: transfer.toLocation,
      vehicleType: transfer.vehicleType,
      capacity: transfer.capacity,
      price: transfer.price / 100, // Convert from cents
      duration: transfer.duration,
      description: transfer.description || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingTransfer(null);
    setFormData({
      name: '',
      fromLocation: '',
      toLocation: '',
      vehicleType: 'Sedan',
      capacity: 3,
      price: 45,
      duration: 30,
      description: ''
    });
  };

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = 
      transfer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transfer.fromLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transfer.toLocation.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesVehicle = 
      filterVehicle === 'all' || transfer.vehicleType === filterVehicle;
    
    return matchesSearch && matchesVehicle;
  });

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType.toLowerCase()) {
      case 'sedan':
        return '🚗';
      case 'van':
        return '🚐';
      case 'bus':
        return '🚌';
      case 'luxury sedan':
        return '🚙';
      case 'minibus':
        return '🚎';
      default:
        return '🚕';
    }
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
              <h1 className="text-3xl font-bold text-gray-900">Transfer Management</h1>
              <p className="text-gray-600 mt-2">Manage airport transfers and transportation services</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Transfer
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4">
            <input
              type="text"
              placeholder="Search transfers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Vehicles</option>
              <option value="Sedan">Sedan</option>
              <option value="Van">Van</option>
              <option value="Bus">Bus</option>
              <option value="Luxury Sedan">Luxury Sedan</option>
              <option value="Minibus">Minibus</option>
            </select>
          </div>

          {/* Transfers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTransfers.map(transfer => (
              <div key={transfer.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="h-32 bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <div className="text-6xl">{getVehicleIcon(transfer.vehicleType)}</div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{transfer.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      transfer.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {transfer.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPinIcon className="h-4 w-4 mr-2 text-blue-500" />
                      <span className="font-medium">From:</span>
                      <span className="ml-1">{transfer.fromLocation}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPinIcon className="h-4 w-4 mr-2 text-red-500" />
                      <span className="font-medium">To:</span>
                      <span className="ml-1">{transfer.toLocation}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <TruckIcon className="h-4 w-4 mr-1" />
                      <span>{transfer.vehicleType}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <UsersIcon className="h-4 w-4 mr-1" />
                      <span>{transfer.capacity} passengers</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        <span>{transfer.duration} min</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        €{(transfer.price / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {transfer.description && (
                    <p className="text-gray-600 text-sm mt-3 line-clamp-2">
                      {transfer.description}
                    </p>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleEdit(transfer)}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(transfer.id)}
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

          {filteredTransfers.length === 0 && (
            <div className="text-center py-12">
              <TruckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No transfers found</p>
            </div>
          )}
        </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingTransfer ? 'Edit Transfer' : 'Add New Transfer'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Airport Transfer - Barcelona"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Location
                  </label>
                  <select
                    required
                    value={formData.fromLocation}
                    onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select from city</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.name}>
                        {city.name}, {city.countryName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Location
                  </label>
                  <select
                    required
                    value={formData.toLocation}
                    onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select to city</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.name}>
                        {city.name}, {city.countryName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Sedan">Sedan</option>
                    <option value="Luxury Sedan">Luxury Sedan</option>
                    <option value="Van">Van</option>
                    <option value="Minibus">Minibus</option>
                    <option value="Bus">Bus</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Capacity (passengers)
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
                    Price (€)
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional details about the transfer service..."
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
                  {editingTransfer ? 'Update Transfer' : 'Add Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}