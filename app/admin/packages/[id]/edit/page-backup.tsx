'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface Country {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  countryId: string;
}

interface FlightBlock {
  blockGroupId: string;
  outboundFlight: {
    id: string;
    flightNumber: string;
    departureTime: string;
    arrivalTime: string;
    originCity: string;
    destinationCity: string;
    availableSeats: number;
    pricePerSeat: number;
  };
  returnFlight: {
    id: string;
    flightNumber: string;
    departureTime: string;
    arrivalTime: string;
    availableSeats: number;
    pricePerSeat: number;
  };
}

interface Hotel {
  id: string;
  hotelId: number;
  name: string;
  location: string;
  starRating: number;
  rating?: number;
  hotelPrices?: Array<{
    id: string;
    board: string;
    roomType: string;
    fromDate: string;
    tillDate: string;
    single: number;
    double: number;
    extraBed: number;
    payingKidsAge: string;
    paymentKids: number;
  }>;
}

interface Package {
  id: string;
  name: string;
  description: string;
  countryId?: string;
  cityId: string;
  flightId?: string;
  hotelId?: string;
  transferId?: string;
  departureDate: string;
  returnDate: string;
  nights: number;
  adults: number;
  basePrice: number;
  flightPrice?: number;
  hotelPrice?: number;
  serviceCharge?: number;
  profitMargin?: number;
  active: boolean;
  featured?: boolean;
  roomId?: string;
  highlights?: string[];
}

export default function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [flightBlocks, setFlightBlocks] = useState<FlightBlock[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedFlightBlocks, setSelectedFlightBlocks] = useState<string[]>([]);
  const [selectedHotels, setSelectedHotels] = useState<string[]>([]);
  
  const [packageData, setPackageData] = useState<Package>({
    id: '',
    name: '',
    description: '',
    cityId: '',
    departureDate: '',
    returnDate: '',
    nights: 7,
    adults: 1,
    basePrice: 0,
    flightPrice: 0,
    hotelPrice: 0,
    serviceCharge: 0,
    profitMargin: 20,
    active: true,
    featured: false,
    highlights: ['']
  });

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/');
    } else if (session) {
      fetchPackageData();
      fetchCountries();
    }
  }, [status, session, router, id]);

  const fetchPackageData = async () => {
    try {
      const response = await fetch(`/api/admin/packages/${id}`);
      if (!response.ok) throw new Error('Failed to fetch package');
      const data = await response.json();
      
      // Get the country ID from the city if not directly available
      let countryId = data.countryId;
      if (!countryId && data.city && data.city.countryId) {
        countryId = data.city.countryId;
      }
      
      // Format dates for input fields
      const formattedData = {
        ...data,
        countryId: countryId || '',
        departureDate: data.departureDate ? new Date(data.departureDate).toISOString().split('T')[0] : '',
        returnDate: data.returnDate ? new Date(data.returnDate).toISOString().split('T')[0] : '',
        flightPrice: data.flightPrice || 0,
        hotelPrice: data.hotelPrice || 0,
        serviceCharge: data.serviceCharge || 0,
        profitMargin: data.profitMargin || 20,
        highlights: data.highlights || ['']
      };
      
      setPackageData(formattedData);
      
      // Set selected items from stored data
      // Check for flight block IDs
      if (data.flightBlockIds && Array.isArray(data.flightBlockIds)) {
        setSelectedFlightBlocks(data.flightBlockIds);
      } else if (data.flightId) {
        setSelectedFlightBlocks([data.flightId]);
      }
      
      // Check for hotel IDs
      if (data.hotelIds && Array.isArray(data.hotelIds)) {
        setSelectedHotels(data.hotelIds);
      } else if (data.hotelId) {
        setSelectedHotels([data.hotelId]);
      }
      
      // Fetch related data based on cityId
      if (data.cityId) {
        // Fetch cities for the country first
        if (countryId) {
          await fetchCities(countryId);
        }
        await fetchFlightBlocksAndHotels(data.cityId);
      }
    } catch (error) {
      console.error('Error fetching package:', error);
      alert('Failed to load package data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/admin/countries');
      if (!response.ok) throw new Error('Failed to fetch countries');
      const data = await response.json();
      setCountries(data);
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchCities = async (countryId: string) => {
    try {
      const response = await fetch(`/api/admin/cities?countryId=${countryId}`);
      if (!response.ok) throw new Error('Failed to fetch cities');
      const data = await response.json();
      setCities(data);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchFlightBlocksAndHotels = async (cityId: string) => {
    try {
      // Fetch flight blocks going to this city
      const flightsResponse = await fetch(`/api/admin/flight-blocks?destinationCityId=${cityId}`);
      if (!flightsResponse.ok) throw new Error('Failed to fetch flight blocks');
      const flightsData = await flightsResponse.json();
      setFlightBlocks(flightsData.flightBlocks || []);

      // Fetch hotels in this city with pricing data
      const hotelsResponse = await fetch(`/api/admin/hotels?cityId=${cityId}&includePricing=true`);
      if (!hotelsResponse.ok) throw new Error('Failed to fetch hotels');
      const hotelsData = await hotelsResponse.json();
      setHotels(Array.isArray(hotelsData) ? hotelsData : hotelsData.hotels || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleCountryChange = (countryId: string) => {
    // Only clear city if actually changing country
    if (countryId !== packageData.countryId) {
      setPackageData({ ...packageData, countryId, cityId: '' });
      setCities([]);
      setFlightBlocks([]);
      setHotels([]);
      setSelectedFlightBlocks([]);
      setSelectedHotels([]);
    } else {
      setPackageData({ ...packageData, countryId });
    }
    
    if (countryId) {
      fetchCities(countryId);
    }
  };

  const handleCityChange = (cityId: string) => {
    // Only clear selections if actually changing city
    if (cityId !== packageData.cityId) {
      setPackageData({ ...packageData, cityId });
      setFlightBlocks([]);
      setHotels([]);
      // Don't clear selections immediately - preserve them if the items exist in the new city
      if (cityId) {
        fetchFlightBlocksAndHotels(cityId);
      } else {
        // Only clear if no city is selected
        setSelectedFlightBlocks([]);
        setSelectedHotels([]);
      }
    } else {
      setPackageData({ ...packageData, cityId });
    }
  };

  const addFlightBlock = (blockGroupId: string) => {
    if (!selectedFlightBlocks.includes(blockGroupId)) {
      setSelectedFlightBlocks([...selectedFlightBlocks, blockGroupId]);
      
      // Auto-calculate nights from flight dates and update flight price
      const block = flightBlocks.find(b => b.blockGroupId === blockGroupId);
      if (block && block.returnFlight) {
        const departureDate = new Date(block.outboundFlight.departureTime);
        const returnDate = new Date(block.returnFlight.departureTime);
        const nights = Math.floor((returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Get flight price (pricePerSeat is in cents, x2 for round trip per person)
        const flightPrice = ((block.outboundFlight.pricePerSeat || 0) / 100) * 2; // Convert from cents and x2 for round trip
        
        if (nights > 0) {
          setPackageData(prev => {
            const newData = { ...prev, nights, flightPrice };
            
            // Auto-calculate hotel price using pricing API if hotels are selected
            if (selectedHotels.length > 0 && packageData.cityId) {
              calculateHotelPriceFromAPI(packageData.cityId, departureDate, returnDate, prev.adults);
            }
            
            // Recalculate total price
            const total = calculateTotalPrice(newData);
            return { ...newData, basePrice: total };
          });
        }
      }
    }
  };

  const removeFlightBlock = (blockGroupId: string) => {
    setSelectedFlightBlocks(selectedFlightBlocks.filter(id => id !== blockGroupId));
  };

  const calculateTotalPrice = (data: any) => {
    const subtotal = Number(data.flightPrice || 0) + Number(data.hotelPrice || 0) + Number(data.serviceCharge || 0);
    const profitAmount = subtotal * (Number(data.profitMargin || 0) / 100);
    return subtotal + profitAmount;
  };

  const calculateHotelPriceFromAPI = async (cityId: string, checkIn: Date, checkOut: Date, adults: number) => {
    try {
      const checkInStr = checkIn.toISOString().split('T')[0];
      const checkOutStr = checkOut.toISOString().split('T')[0];
      
      const response = await fetch(
        `/api/admin/hotels/calculate-prices?cityId=${cityId}&checkIn=${checkInStr}&checkOut=${checkOutStr}&adults=${adults}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.calculations && data.calculations.length > 0) {
          // Get the first (cheapest) hotel price
          const lowestPrice = data.calculations[0].totalPrice;
          setPackageData(prev => {
            const newData = { ...prev, hotelPrice: lowestPrice };
            const total = calculateTotalPrice(newData);
            return { ...newData, basePrice: total };
          });
        }
      }
    } catch (error) {
      console.error('Error calculating hotel price:', error);
    }
  };

  const addHotel = (hotelId: string) => {
    if (!selectedHotels.includes(hotelId)) {
      setSelectedHotels([...selectedHotels, hotelId]);
      
      // Auto-calculate hotel price if we have flight dates
      if (selectedFlightBlocks.length > 0) {
        const block = flightBlocks.find(b => selectedFlightBlocks.includes(b.blockGroupId));
        if (block && block.returnFlight && packageData.cityId) {
          const departureDate = new Date(block.outboundFlight.departureTime);
          const returnDate = new Date(block.returnFlight.departureTime);
          calculateHotelPriceFromAPI(packageData.cityId, departureDate, returnDate, packageData.adults);
        }
      }
    }
  };

  const removeHotel = (hotelId: string) => {
    setSelectedHotels(selectedHotels.filter(id => id !== hotelId));
  };

  const handleHighlightChange = (index: number, value: string) => {
    const newHighlights = [...(packageData.highlights || [])];
    newHighlights[index] = value;
    setPackageData({ ...packageData, highlights: newHighlights });
  };

  const addHighlight = () => {
    setPackageData({ 
      ...packageData, 
      highlights: [...(packageData.highlights || []), ''] 
    });
  };

  const removeHighlight = (index: number) => {
    const newHighlights = (packageData.highlights || []).filter((_, i) => i !== index);
    setPackageData({ ...packageData, highlights: newHighlights });
  };

  const handleSave = async () => {
    if (!packageData.name || !packageData.cityId || selectedFlightBlocks.length === 0 || selectedHotels.length === 0) {
      alert('Please fill in all required fields and select at least one flight block and hotel');
      return;
    }

    setSaving(true);
    try {
      // Prepare data for update - include arrays of flight blocks and hotels
      const updateData = {
        ...packageData,
        flightId: selectedFlightBlocks[0] || null, // Primary flight for backward compatibility
        hotelId: selectedHotels[0] || null, // Primary hotel for backward compatibility
        flightBlockIds: selectedFlightBlocks, // Store all selected flight blocks
        hotelIds: selectedHotels, // Store all selected hotels
        highlights: packageData.highlights?.filter(h => h.trim() !== '')
      };

      const response = await fetch(`/api/admin/packages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update package');
      }

      alert('Package updated successfully!');
      router.push(`/admin/packages/${id}`);
    } catch (error) {
      console.error('Error updating package:', error);
      alert(error instanceof Error ? error.message : 'Failed to update package');
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculatePrices = async () => {
    if (!window.confirm('This will recalculate all pre-computed prices for this package. Continue?')) {
      return;
    }

    setRecalculating(true);
    try {
      const response = await fetch(`/api/admin/packages/${id}/calculate-prices`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to recalculate prices');
      }

      const result = await response.json();
      alert(`Successfully recalculated ${result.count} price variations`);
    } catch (error) {
      console.error('Error recalculating prices:', error);
      alert('Failed to recalculate prices');
    } finally {
      setRecalculating(false);
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
        <button
          onClick={() => router.push(`/admin/packages/${id}`)}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Package Details
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Package</h1>
          <p className="text-gray-600 mt-2">Update package details and configuration</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {/* Basic Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Name *
                </label>
                <input
                  type="text"
                  value={packageData.name}
                  onChange={(e) => setPackageData({ ...packageData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Adults *
                </label>
                <select
                  value={packageData.adults}
                  onChange={(e) => {
                    const adults = parseInt(e.target.value);
                    setPackageData({ ...packageData, adults });
                    // Recalculate hotel price with new adult count
                    if (selectedFlightBlocks.length > 0 && selectedHotels.length > 0) {
                      const block = flightBlocks.find(b => selectedFlightBlocks.includes(b.blockGroupId));
                      if (block && packageData.cityId) {
                        calculateHotelPriceFromAPI(
                          packageData.cityId,
                          new Date(block.outboundFlight.departureTime),
                          new Date(block.returnFlight.departureTime),
                          adults
                        );
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 Adult</option>
                  <option value={2}>2 Adults</option>
                  <option value={3}>3 Adults</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={packageData.description}
                  onChange={(e) => setPackageData({ ...packageData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Location Selection */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Destination</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <select
                  value={packageData.countryId || ''}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a country...</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <select
                  value={packageData.cityId}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!packageData.countryId}
                >
                  <option value="">Select a city...</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Flight Blocks Selection */}
          {packageData.cityId && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Flight Blocks</h2>
              
              {/* Selected Flight Blocks */}
              {selectedFlightBlocks.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Flights</h3>
                  <div className="space-y-2">
                    {selectedFlightBlocks.map(blockId => {
                      const block = flightBlocks.find(b => b.blockGroupId === blockId);
                      if (!block) return null;
                      return (
                        <div key={blockId} className="bg-blue-50 p-3 rounded-lg flex justify-between items-center">
                          <div className="text-sm">
                            <div className="font-medium">
                              {block.outboundFlight.flightNumber} / {block.returnFlight.flightNumber}
                            </div>
                            <div className="text-gray-600">
                              {new Date(block.outboundFlight.departureTime).toLocaleDateString()} - {new Date(block.returnFlight.departureTime).toLocaleDateString()}
                            </div>
                            <div className="text-gray-600">
                              Available: {block.outboundFlight.availableSeats} seats | €{((block.outboundFlight.pricePerSeat || 0) / 100).toFixed(2)} per seat
                            </div>
                          </div>
                          <button
                            onClick={() => removeFlightBlock(blockId)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Available Flight Blocks */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Available Flight Blocks</h3>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {flightBlocks.filter(block => !selectedFlightBlocks.includes(block.blockGroupId)).map(block => (
                    <div
                      key={block.blockGroupId}
                      className="p-3 border-b hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                      onClick={() => addFlightBlock(block.blockGroupId)}
                    >
                      <div className="text-sm">
                        <div className="font-medium">
                          {block.outboundFlight.flightNumber} / {block.returnFlight.flightNumber}
                        </div>
                        <div className="text-gray-600">
                          {new Date(block.outboundFlight.departureTime).toLocaleDateString()} - {new Date(block.returnFlight.departureTime).toLocaleDateString()}
                        </div>
                        <div className="text-gray-600">
                          Available: {block.outboundFlight.availableSeats} seats
                        </div>
                      </div>
                      <PlusIcon className="h-5 w-5 text-blue-600" />
                    </div>
                  ))}
                  {flightBlocks.filter(block => !selectedFlightBlocks.includes(block.blockGroupId)).length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                      No available flight blocks
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Hotels Selection */}
          {packageData.cityId && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Hotels</h2>
              
              {/* Selected Hotels */}
              {selectedHotels.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Hotels</h3>
                  <div className="space-y-2">
                    {selectedHotels.map(hotelId => {
                      const hotel = hotels.find(h => h.id === hotelId);
                      if (!hotel) return null;
                      return (
                        <div key={hotelId} className="bg-green-50 p-3 rounded-lg flex justify-between items-center">
                          <div className="text-sm">
                            <div className="font-medium">{hotel.name}</div>
                            <div className="text-gray-600">
                              {hotel.location || 'Location not specified'}
                            </div>
                            <div className="text-yellow-400">
                              {'★'.repeat(hotel.starRating || hotel.rating || 0)}
                              <span className="text-gray-300">
                                {'★'.repeat(5 - (hotel.starRating || hotel.rating || 0))}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeHotel(hotelId)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Available Hotels */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Available Hotels</h3>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {hotels.filter(hotel => !selectedHotels.includes(hotel.id)).map(hotel => (
                    <div
                      key={hotel.id}
                      className="p-3 border-b hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                      onClick={() => addHotel(hotel.id)}
                    >
                      <div className="text-sm">
                        <div className="font-medium">{hotel.name}</div>
                        <div className="text-gray-600">{hotel.location || 'Location not specified'}</div>
                        <div className="text-yellow-400">
                          {'★'.repeat(hotel.starRating || hotel.rating || 0)}
                          <span className="text-gray-300">
                            {'★'.repeat(5 - (hotel.starRating || hotel.rating || 0))}
                          </span>
                        </div>
                      </div>
                      <PlusIcon className="h-5 w-5 text-blue-600" />
                    </div>
                  ))}
                  {hotels.filter(hotel => !selectedHotels.includes(hotel.id)).length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                      No available hotels
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flight Price (€)
                </label>
                <input
                  type="number"
                  value={packageData.flightPrice}
                  onChange={(e) => {
                    const flightPrice = parseFloat(e.target.value) || 0;
                    setPackageData(prev => {
                      const newData = { ...prev, flightPrice };
                      const total = calculateTotalPrice(newData);
                      return { ...newData, basePrice: total };
                    });
                  }}
                  step="0.01"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hotel Price (€)
                </label>
                <input
                  type="number"
                  value={packageData.hotelPrice}
                  onChange={(e) => {
                    const hotelPrice = parseFloat(e.target.value) || 0;
                    setPackageData(prev => {
                      const newData = { ...prev, hotelPrice };
                      const total = calculateTotalPrice(newData);
                      return { ...newData, basePrice: total };
                    });
                  }}
                  step="0.01"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Charge (€)
                </label>
                <input
                  type="number"
                  value={packageData.serviceCharge}
                  onChange={(e) => {
                    const serviceCharge = parseFloat(e.target.value) || 0;
                    setPackageData(prev => {
                      const newData = { ...prev, serviceCharge };
                      const total = calculateTotalPrice(newData);
                      return { ...newData, basePrice: total };
                    });
                  }}
                  step="0.01"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profit Margin (%)
                </label>
                <input
                  type="number"
                  value={packageData.profitMargin}
                  onChange={(e) => {
                    const profitMargin = parseFloat(e.target.value) || 0;
                    setPackageData(prev => {
                      const newData = { ...prev, profitMargin };
                      const total = calculateTotalPrice(newData);
                      return { ...newData, basePrice: total };
                    });
                  }}
                  step="0.1"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">
                    Subtotal: €{((Number(packageData.flightPrice) || 0) + (Number(packageData.hotelPrice) || 0) + (Number(packageData.serviceCharge) || 0)).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Profit ({packageData.profitMargin}%): €{(((Number(packageData.flightPrice) || 0) + (Number(packageData.hotelPrice) || 0) + (Number(packageData.serviceCharge) || 0)) * ((Number(packageData.profitMargin) || 0) / 100)).toFixed(2)}
                  </div>
                  <div className="text-lg font-semibold">
                    Total Package Price: €{(Number(packageData.basePrice) || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Package Highlights */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Package Highlights</h2>
            <div className="space-y-2">
              {(packageData.highlights || ['']).map((highlight, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={highlight}
                    onChange={(e) => handleHighlightChange(index, e.target.value)}
                    placeholder="Enter a highlight..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removeHighlight(index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <button
                onClick={addHighlight}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add Highlight
              </button>
            </div>
          </div>

          {/* Status Options */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Status Options</h2>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={packageData.active}
                  onChange={(e) => setPackageData({ ...packageData, active: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
                <span className="text-xs text-gray-500 ml-2">(Package will be visible to customers)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={packageData.featured || false}
                  onChange={(e) => setPackageData({ ...packageData, featured: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Featured</span>
                <span className="text-xs text-gray-500 ml-2">(Show in featured packages section)</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <div>
              <button
                onClick={handleRecalculatePrices}
                disabled={recalculating}
                className={`px-4 py-2 rounded-lg text-white ${
                  recalculating 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {recalculating ? 'Recalculating...' : 'Recalculate Prices'}
              </button>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => router.push(`/admin/packages/${id}`)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-6 py-2 rounded-lg text-white flex items-center ${
                  saving 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}