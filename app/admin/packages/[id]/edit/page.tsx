'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import AdminLayout from '@/components/AdminLayout';
import ImageUpload from '@/components/ImageUpload';
import dynamic from 'next/dynamic';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

// Dynamically import RichTextEditor to avoid SSR issues
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
});

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
  shortDescription?: string;
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
  primaryImage?: string | null;
  planAndProgram?: string;
  whatIsIncluded?: string;
  usefulInformation?: string;
  info?: string;
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
    shortDescription: '',
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
    highlights: [''],
    primaryImage: null,
    planAndProgram: '',
    whatIsIncluded: '',
    usefulInformation: '',
    info: ''
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
        basePrice: Number(data.basePrice) || 0,
        flightPrice: Number(data.flightPrice) || 0,
        hotelPrice: Number(data.hotelPrice) || 0,
        serviceCharge: Number(data.serviceCharge) || 0,
        profitMargin: Number(data.profitMargin) || 20,
        highlights: data.highlights || [''],
        shortDescription: data.shortDescription || '',
        primaryImage: data.primaryImage || null,
        planAndProgram: data.planAndProgram || '',
        whatIsIncluded: data.whatIsIncluded || '',
        usefulInformation: data.usefulInformation || '',
        info: data.info || ''
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

  const handleFlightBlockToggle = (blockGroupId: string) => {
    if (selectedFlightBlocks.includes(blockGroupId)) {
      setSelectedFlightBlocks(selectedFlightBlocks.filter(id => id !== blockGroupId));
    } else {
      setSelectedFlightBlocks([...selectedFlightBlocks, blockGroupId]);
    }
  };

  const handleHotelToggle = (hotelId: string) => {
    if (selectedHotels.includes(hotelId)) {
      setSelectedHotels(selectedHotels.filter(id => id !== hotelId));
    } else {
      setSelectedHotels([...selectedHotels, hotelId]);
    }
  };

  const handleSave = async () => {
    if (!packageData.name || !packageData.cityId || selectedFlightBlocks.length === 0 || selectedHotels.length === 0) {
      alert('Please fill in all required fields and select at least one flight block and hotel');
      return;
    }

    // Validate short description length
    if (packageData.shortDescription && packageData.shortDescription.length > 400) {
      alert('Short description must be 400 characters or less');
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
      <div className="p-8 max-w-6xl mx-auto">
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

        <div className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
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
                  Short Description (Max 400 characters) *
                </label>
                <textarea
                  value={packageData.shortDescription}
                  onChange={(e) => {
                    if (e.target.value.length <= 400) {
                      setPackageData({ ...packageData, shortDescription: e.target.value });
                    }
                  }}
                  rows={3}
                  placeholder="Brief description shown in package overview..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-sm text-gray-500 mt-1">
                  {packageData.shortDescription?.length || 0}/400 characters
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Description
                </label>
                <textarea
                  value={packageData.description}
                  onChange={(e) => setPackageData({ ...packageData, description: e.target.value })}
                  rows={4}
                  placeholder="Detailed package description..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Package Image */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Package Image</h2>
            <p className="text-sm text-gray-600 mb-4">
              This image will be displayed as the main image for this package
            </p>
            <ImageUpload
              value={packageData.primaryImage}
              onChange={(value) => setPackageData({ ...packageData, primaryImage: value })}
              label=""
            />
          </div>

          {/* Location Selection */}
          <div className="bg-white rounded-lg shadow p-6">
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
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Flight Blocks Selection</h2>
            {flightBlocks.length > 0 ? (
              <div className="space-y-4">
                {flightBlocks.map((block) => {
                  const isSelected = selectedFlightBlocks.includes(block.blockGroupId);
                  const totalPrice = (block.outboundFlight.pricePerSeat + block.returnFlight.pricePerSeat) * packageData.adults;
                  
                  return (
                    <div
                      key={block.blockGroupId}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => handleFlightBlockToggle(block.blockGroupId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {isSelected && <CheckCircleIcon className="w-5 h-5 text-blue-500" />}
                            <h3 className="font-semibold">Flight Block {block.blockGroupId}</h3>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Outbound Flight</p>
                              <p>{block.outboundFlight.flightNumber}</p>
                              <p>{block.outboundFlight.originCity} → {block.outboundFlight.destinationCity}</p>
                              <p>{new Date(block.outboundFlight.departureTime).toLocaleDateString()}</p>
                              <p>{block.outboundFlight.availableSeats} seats available</p>
                            </div>
                            <div>
                              <p className="font-medium">Return Flight</p>
                              <p>{block.returnFlight.flightNumber}</p>
                              <p>{block.outboundFlight.destinationCity} → {block.outboundFlight.originCity}</p>
                              <p>{new Date(block.returnFlight.departureTime).toLocaleDateString()}</p>
                              <p>{block.returnFlight.availableSeats} seats available</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right ml-4">
                          <p className="text-2xl font-bold text-blue-600">€{totalPrice}</p>
                          <p className="text-sm text-gray-600">for {packageData.adults} {packageData.adults === 1 ? 'adult' : 'adults'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                {packageData.cityId ? 'No flight blocks available for the selected city' : 'Please select a destination city first'}
              </p>
            )}
          </div>

          {/* Hotel Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Hotel Selection</h2>
            {hotels.length > 0 ? (
              <div className="space-y-4">
                {hotels
                  .map(hotel => ({
                    ...hotel,
                    bestPrice: hotel.hotelPrices && hotel.hotelPrices.length > 0
                      ? Math.min(...hotel.hotelPrices.map(p => Number(p.double) || 999999))
                      : 999999
                  }))
                  .sort((a, b) => a.bestPrice - b.bestPrice)
                  .map((hotel) => {
                  const isSelected = selectedHotels.includes(hotel.id);
                  const bestPrice = hotel.hotelPrices && hotel.hotelPrices.length > 0
                    ? Math.min(...hotel.hotelPrices.map(p => p.double || 0))
                    : 0;
                  
                  return (
                    <div
                      key={hotel.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => handleHotelToggle(hotel.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {isSelected && <CheckCircleIcon className="w-5 h-5 text-blue-500" />}
                            <h3 className="font-semibold">{hotel.name}</h3>
                            <div className="flex gap-1">
                              {[...Array(hotel.starRating)].map((_, i) => (
                                <span key={i} className="text-yellow-500">⭐</span>
                              ))}
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600">{hotel.location}</p>
                          {hotel.rating && (
                            <p className="text-sm text-gray-600">Guest Rating: {hotel.rating}/10</p>
                          )}
                          
                          {hotel.hotelPrices && hotel.hotelPrices.length > 0 && (
                            <div className="mt-2 text-sm">
                              <p className="font-medium">Available Room Types:</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {hotel.hotelPrices.map((price, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs">
                                    {price.roomType} - {price.board}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {bestPrice > 0 && (
                          <div className="text-right ml-4">
                            <p className="text-sm text-gray-600">From</p>
                            <p className="text-2xl font-bold text-blue-600">€{bestPrice}</p>
                            <p className="text-sm text-gray-600">per night</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                {packageData.cityId ? 'No hotels available for the selected city' : 'Please select a destination city first'}
              </p>
            )}
          </div>

          {/* Pricing Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Pricing Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Price (€)
                </label>
                <input
                  type="number"
                  value={packageData.basePrice}
                  onChange={(e) => setPackageData({ ...packageData, basePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Charge (€)
                </label>
                <input
                  type="number"
                  value={packageData.serviceCharge || 0}
                  onChange={(e) => setPackageData({ ...packageData, serviceCharge: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profit Margin (%)
                </label>
                <input
                  type="number"
                  value={packageData.profitMargin || 20}
                  onChange={(e) => setPackageData({ ...packageData, profitMargin: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Nights
                </label>
                <input
                  type="number"
                  value={packageData.nights}
                  onChange={(e) => setPackageData({ ...packageData, nights: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="30"
                />
              </div>
            </div>

            {/* Price Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Price Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Base Price:</span>
                  <span>€{packageData.basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Charge:</span>
                  <span>€{((packageData.serviceCharge || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Profit Margin ({packageData.profitMargin}%):</span>
                  <span>€{((packageData.basePrice + (packageData.serviceCharge || 0)) * (packageData.profitMargin || 0) / 100).toFixed(2)}</span>
                </div>
                <div className="border-t pt-1 flex justify-between font-semibold">
                  <span>Total Package Price:</span>
                  <span className="text-lg text-blue-600">
                    €{((packageData.basePrice + (packageData.serviceCharge || 0)) * (1 + (packageData.profitMargin || 0) / 100)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Package Content Sections */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Package Content</h2>
            
            <div className="space-y-6">
              {/* Plan and Program */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan and Program
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Describe the day-by-day itinerary and program details
                </p>
                <RichTextEditor
                  content={packageData.planAndProgram || ''}
                  onChange={(content) => setPackageData({ ...packageData, planAndProgram: content })}
                  placeholder="Enter the detailed plan and program..."
                />
              </div>

              {/* What is Included */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What is Included
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  List all services and amenities included in the package
                </p>
                <RichTextEditor
                  content={packageData.whatIsIncluded || ''}
                  onChange={(content) => setPackageData({ ...packageData, whatIsIncluded: content })}
                  placeholder="Enter what is included in the package..."
                />
              </div>

              {/* Useful Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Useful Information
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Provide helpful tips and important information for travelers
                </p>
                <RichTextEditor
                  content={packageData.usefulInformation || ''}
                  onChange={(content) => setPackageData({ ...packageData, usefulInformation: content })}
                  placeholder="Enter useful information for travelers..."
                />
              </div>

              {/* Additional Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Information
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Any other relevant information about the package
                </p>
                <RichTextEditor
                  content={packageData.info || ''}
                  onChange={(content) => setPackageData({ ...packageData, info: content })}
                  placeholder="Enter additional information..."
                />
              </div>
            </div>
          </div>

          {/* Package Highlights */}
          <div className="bg-white rounded-lg shadow p-6">
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
          <div className="bg-white rounded-lg shadow p-6">
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
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between">
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
      </div>
    </AdminLayout>
  );
}