'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, CalendarIcon, UserGroupIcon, MapPinIcon, StarIcon, CheckIcon } from '@heroicons/react/24/outline';

interface SearchResult {
  id: string;
  name: string;
  description: string;
  cityName: string;
  countryName: string;
  hotelOptions: {
    id: string;
    name: string;
    rating: number;
    price: number;
  }[];
  flightPrice: number;
  serviceCharge: number;
  transferIncluded: boolean;
  imageUrl?: string;
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const city = searchParams.get('city');
  const date = searchParams.get('date') || '';
  const adults = parseInt(searchParams.get('adults') || '2');
  const children = parseInt(searchParams.get('children') || '0');
  const childAges = searchParams.get('childAges')?.split(',').filter(Boolean) || [];
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotels, setSelectedHotels] = useState<{[key: string]: string}>({});
  
  useEffect(() => {
    if (city && date) {
      fetchSearchResults();
    }
  }, [city, date, adults, children]);
  
  const fetchSearchResults = async () => {
    try {
      const params = new URLSearchParams({
        cityId: city || '',
        date,
        adults: adults.toString(),
        children: children.toString()
      });
      
      const response = await fetch(`/api/public/search?${params}`);
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match our interface
        const transformedResults = data.map((pkg: any) => ({
          id: pkg.id,
          name: pkg.name,
          description: pkg.description || 'Enjoy a wonderful city break package',
          cityName: pkg.city?.name || 'Unknown City',
          countryName: pkg.city?.country?.name || 'Unknown Country',
          hotelOptions: pkg.hotel ? [{
            id: pkg.hotel.id,
            name: pkg.hotel.name,
            rating: pkg.hotel.rating || 3,
            price: pkg.basePrice || 0
          }] : [],
          flightPrice: 120 * (adults + children), // Fixed price as per requirements
          serviceCharge: pkg.serviceCharge || 0,
          transferIncluded: pkg.includesTransfer || false,
          imageUrl: pkg.images?.[0] || undefined
        }));
        setResults(transformedResults);
        
        // Pre-select first hotel for each package
        const initialSelections: {[key: string]: string} = {};
        transformedResults.forEach((result: SearchResult) => {
          if (result.hotelOptions.length > 0) {
            initialSelections[result.id] = result.hotelOptions[0].id;
          }
        });
        setSelectedHotels(initialSelections);
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
  
  const calculateTotalPrice = (pkg: SearchResult) => {
    const selectedHotel = pkg.hotelOptions.find(h => h.id === selectedHotels[pkg.id]);
    const hotelPrice = selectedHotel?.price || 0;
    return pkg.flightPrice + hotelPrice + pkg.serviceCharge;
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center text-gray-700 hover:text-gray-900">
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Search
              </Link>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Search Results</h1>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>
      
      {/* Search Summary */}
      <div className="bg-blue-50 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center text-blue-900">
              <MapPinIcon className="h-4 w-4 mr-1" />
              <span className="font-medium">{city}</span>
            </div>
            <div className="flex items-center text-blue-900">
              <CalendarIcon className="h-4 w-4 mr-1" />
              <span>{formatDate(date)}</span>
            </div>
            <div className="flex items-center text-blue-900">
              <UserGroupIcon className="h-4 w-4 mr-1" />
              <span>{adults} {adults === 1 ? 'Adult' : 'Adults'}</span>
              {children > 0 && <span>, {children} {children === 1 ? 'Child' : 'Children'}</span>}
            </div>
            <Link 
              href="/"
              className="ml-auto text-blue-600 hover:text-blue-800 font-medium"
            >
              Modify Search
            </Link>
          </div>
        </div>
      </div>
      
      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Searching for available packages...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">No packages found</h2>
            <p className="text-gray-600 mb-8">
              We couldn't find any packages matching your search criteria. 
              Try adjusting your dates or destination.
            </p>
            <Link 
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              New Search
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">
                {results.length} {results.length === 1 ? 'Package' : 'Packages'} Found
              </h2>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Sort by: Recommended</option>
                <option>Sort by: Price (Low to High)</option>
                <option>Sort by: Price (High to Low)</option>
                <option>Sort by: Hotel Rating</option>
              </select>
            </div>
            
            {results.map((pkg) => {
              const totalPrice = calculateTotalPrice(pkg);
              const selectedHotel = pkg.hotelOptions.find(h => h.id === selectedHotels[pkg.id]);
              
              return (
                <div key={pkg.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row">
                    {/* Image */}
                    <div className="lg:w-1/3 h-48 lg:h-auto bg-gradient-to-br from-blue-400 to-blue-600">
                      {pkg.imageUrl ? (
                        <img src={pkg.imageUrl} alt={pkg.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white">
                          <MapPinIcon className="h-16 w-16 opacity-50" />
                        </div>
                      )}
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{pkg.name}</h3>
                          <p className="text-gray-600 mb-4">{pkg.description}</p>
                          
                          <div className="space-y-3 mb-4">
                            <div className="flex items-center text-sm text-gray-700">
                              <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                              <span>{pkg.cityName}, {pkg.countryName}</span>
                            </div>
                            
                            {/* Hotel Selection */}
                            {pkg.hotelOptions.length > 0 && (
                              <div className="border rounded-lg p-3 bg-gray-50">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Select Hotel
                                </label>
                                <select 
                                  value={selectedHotels[pkg.id] || ''}
                                  onChange={(e) => setSelectedHotels({...selectedHotels, [pkg.id]: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {pkg.hotelOptions.map(hotel => (
                                    <option key={hotel.id} value={hotel.id}>
                                      {hotel.name} - {Array(hotel.rating).fill('★').join('')} 
                                      {hotel.price > 0 && ` (+€${hotel.price.toFixed(2)})`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            
                            {/* Included Items */}
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex items-center text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                <CheckIcon className="h-3 w-3 mr-1" />
                                Flights Included
                              </span>
                              <span className="inline-flex items-center text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                <CheckIcon className="h-3 w-3 mr-1" />
                                Hotel Accommodation
                              </span>
                              {pkg.transferIncluded && (
                                <span className="inline-flex items-center text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  <CheckIcon className="h-3 w-3 mr-1" />
                                  Airport Transfers
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Pricing */}
                        <div className="lg:ml-6 lg:w-64">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-600 mb-1">Total Price</div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">
                              €{totalPrice.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500 mb-4">
                              for {adults + children} {adults + children === 1 ? 'traveler' : 'travelers'}
                            </div>
                            
                            {/* Price Breakdown */}
                            <div className="border-t pt-3 space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Flights</span>
                                <span className="font-medium">€{pkg.flightPrice.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Hotel</span>
                                <span className="font-medium">€{(selectedHotel?.price || 0).toFixed(2)}</span>
                              </div>
                              {pkg.serviceCharge > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Service Charge</span>
                                  <span className="font-medium">€{pkg.serviceCharge.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="border-t pt-2 flex justify-between font-semibold">
                                <span>Total</span>
                                <span>€{totalPrice.toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => {
                                // Navigate to booking page with selected options
                                const bookingParams = new URLSearchParams({
                                  packageId: pkg.id,
                                  hotelId: selectedHotels[pkg.id],
                                  date,
                                  adults: adults.toString(),
                                  children: children.toString(),
                                  childAges: childAges.join(',')
                                });
                                router.push(`/booking/new?${bookingParams}`);
                              }}
                              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Book Now
                            </button>
                            
                            <p className="text-xs text-center text-gray-500 mt-3">
                              Free cancellation within 24 hours
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}