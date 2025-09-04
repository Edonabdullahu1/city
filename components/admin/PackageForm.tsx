'use client';

import { useState, useEffect } from 'react';

interface PackageFormProps {
  package?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PackageForm({ package: existingPackage, onClose, onSuccess }: PackageFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Location data
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [excursions, setExcursions] = useState<any[]>([]);

  // Form data
  const [formData, setFormData] = useState({
    name: existingPackage?.name || '',
    description: existingPackage?.description || '',
    countryId: '',
    cityId: existingPackage?.cityId || '',
    departureFlightId: existingPackage?.departureFlightId || '',
    returnFlightId: existingPackage?.returnFlightId || '',
    hotelId: existingPackage?.hotelId || '',
    roomId: existingPackage?.roomId || '',
    nights: existingPackage?.nights || 3,
    basePrice: existingPackage?.basePrice ? existingPackage.basePrice / 100 : '',
    maxOccupancy: existingPackage?.maxOccupancy || 2,
    availableFrom: existingPackage?.availableFrom?.split('T')[0] || '',
    availableTo: existingPackage?.availableTo?.split('T')[0] || '',
    includesTransfer: existingPackage?.includesTransfer ?? true,
    transferId: existingPackage?.transferId || '',
    featured: existingPackage?.featured || false,
    highlights: existingPackage?.highlights?.join('\n') || '',
    selectedExcursions: existingPackage?.excursions?.map((e: any) => e.excursionId) || []
  });

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (formData.countryId) {
      fetchCities(formData.countryId);
    }
  }, [formData.countryId]);

  useEffect(() => {
    if (formData.cityId) {
      fetchFlights(formData.cityId);
      fetchHotels(formData.cityId);
      fetchTransfers(formData.cityId);
      fetchExcursions(formData.cityId);
    }
  }, [formData.cityId]);

  useEffect(() => {
    if (formData.hotelId) {
      fetchRooms(formData.hotelId);
    }
  }, [formData.hotelId]);

  useEffect(() => {
    if (formData.departureFlightId && formData.returnFlightId) {
      calculateNights();
    }
  }, [formData.departureFlightId, formData.returnFlightId]);

  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/locations/countries?active=true');
      const data = await response.json();
      setCountries(data);
    } catch (err) {
      console.error('Failed to fetch countries:', err);
    }
  };

  const fetchCities = async (countryId: string) => {
    try {
      const response = await fetch(`/api/locations/cities?countryId=${countryId}&active=true`);
      const data = await response.json();
      setCities(data);
    } catch (err) {
      console.error('Failed to fetch cities:', err);
    }
  };

  const fetchFlights = async (cityId: string) => {
    try {
      const response = await fetch(`/api/admin/flights?destinationCityId=${cityId}`);
      const data = await response.json();
      setFlights(data.flights || []);
    } catch (err) {
      console.error('Failed to fetch flights:', err);
    }
  };

  const fetchHotels = async (cityId: string) => {
    try {
      const response = await fetch(`/api/admin/hotels?cityId=${cityId}`);
      const data = await response.json();
      setHotels(data.hotels || []);
    } catch (err) {
      console.error('Failed to fetch hotels:', err);
    }
  };

  const fetchRooms = async (hotelId: string) => {
    try {
      const response = await fetch(`/api/admin/hotels/${hotelId}/rooms`);
      const data = await response.json();
      setRooms(data);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  const fetchTransfers = async (cityId: string) => {
    try {
      const response = await fetch(`/api/admin/transfers?cityId=${cityId}`);
      const data = await response.json();
      setTransfers(data.transfers || []);
    } catch (err) {
      console.error('Failed to fetch transfers:', err);
    }
  };

  const fetchExcursions = async (cityId: string) => {
    try {
      const response = await fetch(`/api/admin/excursions?cityId=${cityId}`);
      const data = await response.json();
      setExcursions(data.excursions || []);
    } catch (err) {
      console.error('Failed to fetch excursions:', err);
    }
  };

  const calculateNights = () => {
    const departureFlight = flights.find(f => f.id === formData.departureFlightId);
    const returnFlight = flights.find(f => f.id === formData.returnFlightId);
    
    if (departureFlight && returnFlight) {
      const departure = new Date(departureFlight.departureTime);
      const returnDate = new Date(returnFlight.departureTime);
      const nights = Math.floor((returnDate.getTime() - departure.getTime()) / (1000 * 60 * 60 * 24));
      setFormData(prev => ({ ...prev, nights: Math.max(1, nights) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = existingPackage 
        ? `/api/packages/${existingPackage.id}`
        : '/api/packages';
      
      const method = existingPackage ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          basePrice: Math.round(parseFloat(formData.basePrice as any) * 100),
          highlights: formData.highlights.split('\n').filter(h => h.trim()),
          excursionIds: formData.selectedExcursions
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save package');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              {existingPackage ? 'Edit Package' : 'Create New Package'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country *
                  </label>
                  <select
                    required
                    value={formData.countryId}
                    onChange={(e) => setFormData({ ...formData, countryId: e.target.value, cityId: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Country</option>
                    {countries.map(country => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <select
                    required
                    value={formData.cityId}
                    onChange={(e) => setFormData({ ...formData, cityId: e.target.value })}
                    disabled={!formData.countryId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select City</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Flights */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Flights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departure Flight *
                  </label>
                  <select
                    required
                    value={formData.departureFlightId}
                    onChange={(e) => setFormData({ ...formData, departureFlightId: e.target.value })}
                    disabled={!formData.cityId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select Departure Flight</option>
                    {flights.filter(f => f.destinationCityId === formData.cityId).map(flight => (
                      <option key={flight.id} value={flight.id}>
                        {flight.flightNumber} - {new Date(flight.departureTime).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Return Flight *
                  </label>
                  <select
                    required
                    value={formData.returnFlightId}
                    onChange={(e) => setFormData({ ...formData, returnFlightId: e.target.value })}
                    disabled={!formData.cityId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select Return Flight</option>
                    {flights.filter(f => f.originCityId === formData.cityId).map(flight => (
                      <option key={flight.id} value={flight.id}>
                        {flight.flightNumber} - {new Date(flight.departureTime).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Accommodation */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Accommodation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hotel *
                  </label>
                  <select
                    required
                    value={formData.hotelId}
                    onChange={(e) => setFormData({ ...formData, hotelId: e.target.value, roomId: '' })}
                    disabled={!formData.cityId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select Hotel</option>
                    {hotels.map(hotel => (
                      <option key={hotel.id} value={hotel.id}>
                        {hotel.name} ({hotel.rating}★)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Type *
                  </label>
                  <select
                    required
                    value={formData.roomId}
                    onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                    disabled={!formData.hotelId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select Room</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>
                        {room.type} (Max {room.capacity} guests)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Nights *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.nights}
                    onChange={(e) => setFormData({ ...formData, nights: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Pricing & Availability</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Price per Person (€) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Occupancy *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.maxOccupancy}
                    onChange={(e) => setFormData({ ...formData, maxOccupancy: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Available From *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.availableFrom}
                    onChange={(e) => setFormData({ ...formData, availableFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Available To *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.availableTo}
                    onChange={(e) => setFormData({ ...formData, availableTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Options */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Options</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="mr-2"
                  />
                  <span>Featured Package</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.includesTransfer}
                    onChange={(e) => setFormData({ ...formData, includesTransfer: e.target.checked })}
                    className="mr-2"
                  />
                  <span>Include Transfer</span>
                </label>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : existingPackage ? 'Update Package' : 'Create Package'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}