'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

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

export default function NewPackagePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [flightBlocks, setFlightBlocks] = useState<FlightBlock[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedFlightBlocks, setSelectedFlightBlocks] = useState<string[]>([]);
  const [selectedHotels, setSelectedHotels] = useState<string[]>([]);
  
  const [packageData, setPackageData] = useState({
    name: '',
    description: '',
    countryId: '',
    cityId: '',
    nights: 7,
    basePrice: 0,
    flightPrice: 0,
    hotelPrice: 0,
    serviceCharge: 0,
    profitMargin: 20, // Default 20% profit margin
    maxOccupancy: 1,
    availableFrom: '',
    availableTo: '',
    includesTransfer: true,
    featured: false,
    highlights: ['']
  });

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/');
    } else if (session) {
      fetchCountries();
    }
  }, [status, session, router]);

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
    setPackageData({ ...packageData, countryId, cityId: '' });
    setCities([]);
    setFlightBlocks([]);
    setHotels([]);
    setSelectedFlightBlocks([]);
    setSelectedHotels([]);
    if (countryId) {
      fetchCities(countryId);
    }
  };

  const handleCityChange = (cityId: string) => {
    setPackageData({ ...packageData, cityId });
    setFlightBlocks([]);
    setHotels([]);
    setSelectedFlightBlocks([]);
    setSelectedHotels([]);
    if (cityId) {
      fetchFlightBlocksAndHotels(cityId);
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
              calculateHotelPriceFromAPI(packageData.cityId, departureDate, returnDate, prev.maxOccupancy);
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
    const subtotal = data.flightPrice + data.hotelPrice + data.serviceCharge;
    const profitAmount = (subtotal * data.profitMargin) / 100;
    return Math.round(subtotal + profitAmount);
  };

  const calculateHotelPriceFromAPI = async (cityId: string, checkIn: Date, checkOut: Date, adults: number) => {
    try {
      const checkInStr = checkIn.toISOString().split('T')[0];
      const checkOutStr = checkOut.toISOString().split('T')[0];
      
      const response = await fetch(
        `/api/admin/hotels/calculate-prices?cityId=${cityId}&checkIn=${checkInStr}&checkOut=${checkOutStr}&adults=${adults}`
      );
      
      if (!response.ok) return;
      
      const data = await response.json();
      
      // Find the minimum price from selected hotels
      let minPrice = Infinity;
      if (data.calculations && data.calculations.length > 0) {
        data.calculations.forEach((calc: any) => {
          if (selectedHotels.includes(calc.hotelId)) {
            if (calc.totalPrice < minPrice) {
              minPrice = calc.totalPrice;
            }
          }
        });
      }
      
      if (minPrice !== Infinity) {
        setPackageData(prev => {
          const newData = { ...prev, hotelPrice: minPrice };
          const total = calculateTotalPrice(newData);
          return { ...newData, basePrice: total };
        });
      }
    } catch (error) {
      console.error('Error calculating hotel price:', error);
    }
  };

  const toggleHotelSelection = (hotelId: string) => {
    let newSelectedHotels: string[];
    
    if (selectedHotels.includes(hotelId)) {
      newSelectedHotels = selectedHotels.filter(id => id !== hotelId);
    } else {
      newSelectedHotels = [...selectedHotels, hotelId];
    }
    
    setSelectedHotels(newSelectedHotels);
    
    // Recalculate base hotel price when selection changes
    if (selectedFlightBlocks.length > 0) {
      const block = flightBlocks.find(b => selectedFlightBlocks.includes(b.blockGroupId));
      if (block && block.returnFlight) {
        const departureDate = new Date(block.outboundFlight.departureTime);
        const returnDate = new Date(block.returnFlight.departureTime);
        const nights = Math.floor((returnDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate with new hotel selection using API
        calculateHotelPriceFromAPI(packageData.cityId, departureDate, returnDate, packageData.maxOccupancy);
        
        // Price will be updated by the API call above
      }
    }
  };

  const handleHighlightChange = (index: number, value: string) => {
    const newHighlights = [...packageData.highlights];
    newHighlights[index] = value;
    setPackageData({ ...packageData, highlights: newHighlights });
  };

  const addHighlight = () => {
    setPackageData({ ...packageData, highlights: [...packageData.highlights, ''] });
  };

  const removeHighlight = (index: number) => {
    const newHighlights = packageData.highlights.filter((_, i) => i !== index);
    setPackageData({ ...packageData, highlights: newHighlights });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageData.name || !packageData.cityId || selectedFlightBlocks.length === 0 || selectedHotels.length === 0) {
      alert('Please fill in all required fields and select at least one flight block and hotel');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...packageData,
          flightBlocks: selectedFlightBlocks.map(id => ({ blockGroupId: id })),
          hotelIds: selectedHotels,
          basePrice: Math.round(packageData.basePrice * 100) // Convert to cents
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create package');
      }

      router.push('/admin/packages');
    } catch (error: any) {
      console.error('Error creating package:', error);
      alert(error.message || 'Failed to create package');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
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
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/packages')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Packages
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Package</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Adults
                </label>
                <select
                  value={packageData.maxOccupancy}
                  onChange={(e) => {
                    const adults = parseInt(e.target.value);
                    setPackageData({ ...packageData, maxOccupancy: adults });
                    // Recalculate hotel price with new adult count
                    if (selectedFlightBlocks.length > 0 && selectedHotels.length > 0 && packageData.cityId) {
                      const block = flightBlocks.find(b => selectedFlightBlocks.includes(b.blockGroupId));
                      if (block && block.returnFlight) {
                        const departureDate = new Date(block.outboundFlight.departureTime);
                        const returnDate = new Date(block.returnFlight.departureTime);
                        calculateHotelPriceFromAPI(packageData.cityId, departureDate, returnDate, adults);
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value={1}>1 Adult</option>
                  <option value={2}>2 Adults</option>
                  <option value={3}>3 Adults</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Description
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

          {/* Destination Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Destination</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country *
                </label>
                <select
                  value={packageData.countryId}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Country</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>{country.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <select
                  value={packageData.cityId}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!packageData.countryId}
                >
                  <option value="">Select City</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Flight Blocks Selection */}
          {packageData.cityId && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Flight Blocks</h2>
              
              {selectedFlightBlocks.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2">Selected Flight Blocks:</h3>
                  {selectedFlightBlocks.map(blockId => {
                    const block = flightBlocks.find(b => b.blockGroupId === blockId);
                    if (!block) return null;
                    return (
                      <div key={blockId} className="flex justify-between items-center mb-2 bg-white p-2 rounded">
                        <div className="text-sm">
                          <span className="font-medium">{block.outboundFlight.flightNumber}</span>
                          {' → '}
                          <span className="font-medium">{block.returnFlight.flightNumber}</span>
                          <span className="text-gray-500 ml-2">
                            ({new Date(block.outboundFlight.departureTime).toLocaleDateString()})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFlightBlock(blockId)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                {flightBlocks.filter(block => !selectedFlightBlocks.includes(block.blockGroupId)).map(block => (
                  <div key={block.blockGroupId} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <div className="font-medium">
                        {block.outboundFlight.flightNumber} ({block.outboundFlight.originCity} → {block.outboundFlight.destinationCity})
                      </div>
                      <div className="text-sm text-gray-600">
                        Outbound: {new Date(block.outboundFlight.departureTime).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        Return: {block.returnFlight.flightNumber} - {new Date(block.returnFlight.departureTime).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Available Seats: {block.outboundFlight.availableSeats} / {block.returnFlight.availableSeats}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addFlightBlock(block.blockGroupId)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add
                    </button>
                  </div>
                ))}
              </div>

              {flightBlocks.length === 0 && (
                <p className="text-gray-500 text-center py-4">No flight blocks available for this destination</p>
              )}
            </div>
          )}

          {/* Hotels Selection */}
          {packageData.cityId && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Accommodation Options</h2>
              <p className="text-sm text-gray-600 mb-4">
                Select multiple hotels to offer choices to customers. Set the base hotel cost in the pricing section.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {hotels.map(hotel => (
                  <div
                    key={hotel.id}
                    className={`p-4 border rounded-lg cursor-pointer transition ${
                      selectedHotels.includes(hotel.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => toggleHotelSelection(hotel.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{hotel.name}</h3>
                        <p className="text-sm text-gray-600">{hotel.location}</p>
                        <div className="mt-1">
                          <span className="text-yellow-400">{'★'.repeat(hotel.starRating || 0)}</span>
                          <span className="text-gray-300">{'★'.repeat(5 - (hotel.starRating || 0))}</span>
                        </div>
                        {hotel.hotelPrices && hotel.hotelPrices.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            From €{Math.min(...hotel.hotelPrices.map(p => Number(p.double)))}/night
                          </div>
                        )}
                        {selectedHotels.includes(hotel.id) && (
                          <span className="text-xs text-blue-600">✓ Included in package</span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedHotels.includes(hotel.id)}
                        onChange={() => {}}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {hotels.length === 0 && (
                <p className="text-gray-500 text-center py-4">No hotels available in this city</p>
              )}
            </div>
          )}

          {/* Pricing Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Pricing Breakdown</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Flight Cost (per person, round trip)
                  </label>
                  <div className="flex items-center">
                    <span className="text-2xl font-semibold">€{packageData.flightPrice.toFixed(2)}</span>
                    <span className="text-sm text-gray-500 ml-2">(2x tickets)</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hotel Cost Base ({packageData.nights} nights, {packageData.maxOccupancy} {packageData.maxOccupancy === 1 ? 'adult' : 'adults'})
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
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="10"
                    placeholder="Auto-calculated from hotel prices"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Based on cheapest hotel option for selected dates. Single: -X%, Triple: +extraBed
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Charge
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
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    step="1"
                  />
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Subtotal:</span>
                    <span className="font-medium">€{(packageData.flightPrice + packageData.hotelPrice + packageData.serviceCharge).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Profit ({packageData.profitMargin}%):</span>
                    <span className="font-medium">€{((packageData.flightPrice + packageData.hotelPrice + packageData.serviceCharge) * packageData.profitMargin / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-lg font-semibold">Total Package Price:</span>
                    <span className="text-2xl font-bold text-green-600">€{packageData.basePrice.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Per person, all inclusive</p>
                </div>
              </div>
            </div>
          </div>

          {/* Package Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Package Details</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Nights
                </label>
                <input
                  type="number"
                  value={packageData.nights}
                  onChange={(e) => setPackageData({ ...packageData, nights: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-calculated from flight dates
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Package Price (EUR per person)
                </label>
                <input
                  type="number"
                  value={packageData.basePrice || 0}
                  onChange={(e) => setPackageData({ ...packageData, basePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-100"
                  min="0"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-calculated from components
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available From
                </label>
                <input
                  type="date"
                  value={packageData.availableFrom}
                  onChange={(e) => setPackageData({ ...packageData, availableFrom: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  First date customers can book
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available To
                </label>
                <input
                  type="date"
                  value={packageData.availableTo}
                  onChange={(e) => setPackageData({ ...packageData, availableTo: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Last date customers can book
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includesTransfer"
                  checked={packageData.includesTransfer}
                  onChange={(e) => setPackageData({ ...packageData, includesTransfer: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="includesTransfer" className="text-sm font-medium text-gray-700">
                  Includes Airport Transfer
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="featured"
                  checked={packageData.featured}
                  onChange={(e) => setPackageData({ ...packageData, featured: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                  Featured Package
                </label>
              </div>
            </div>

            {/* Highlights */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Package Highlights
              </label>
              {packageData.highlights.map((highlight, index) => (
                <div key={index} className="flex mb-2">
                  <input
                    type="text"
                    value={highlight}
                    onChange={(e) => handleHighlightChange(index, e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter a highlight"
                  />
                  <button
                    type="button"
                    onClick={() => removeHighlight(index)}
                    className="ml-2 px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addHighlight}
                className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Highlight
              </button>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/admin/packages')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}