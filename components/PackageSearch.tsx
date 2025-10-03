'use client';

import { useState, useEffect } from 'react';
import { Clock, MapPin, Plane, Hotel, Star, Users, ChevronRight } from 'lucide-react';

interface Package {
  id: string;
  name: string;
  description: string;
  nights: number;
  featured: boolean;
  highlights: string[];
  flightDetails: {
    outbound: {
      flightNumber: string;
      departure: string;
      arrival: string;
      departureTime: string;
      arrivalTime: string;
    };
    return: {
      flightNumber: string;
      departure: string;
      arrival: string;
      departureTime: string;
      arrivalTime: string;
    };
  };
  hotels: Array<{
    id: string;
    name: string;
    rating: number;
    board: string;
    roomType: string;
    price: number;
  }>;
  flightPrice: number;
  hotelPriceFrom: number;
  totalPriceFrom: number;
  serviceCharge: number;
  availableSeats: number;
}

interface PackageSearchProps {
  cityId?: string;
  destination: string;
  checkInDate: string;
  adults: number;
  children: number;
  childAges?: number[];
  selectedPackageId?: string;
  onSelect: (packageData: {
    package: Package;
    selectedHotel: Package['hotels'][0];
  }) => void;
}

export default function PackageSearch({
  cityId,
  destination,
  checkInDate,
  adults,
  children,
  childAges = [],
  selectedPackageId,
  onSelect
}: PackageSearchProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Package['hotels'][0] | null>(null);

  // Map destination names to city IDs (this would typically come from a cities API)
  const getCityId = (destination: string): string | null => {
    const cityMapping: { [key: string]: string } = {
      'paris': 'cm41pbap8000001l3h7vf9z2b',
      'london': 'cm41pbap8000002l3h8vg0a3c',
      'rome': 'cm41pbap8000003l3h9vh1b4d',
      'barcelona': 'cm41pbap8000004l3havh2c5e',
      'amsterdam': 'cm41pbap8000005l3hbwi3d6f'
    };
    return cityMapping[destination.toLowerCase()] || null;
  };

  const searchPackages = async () => {
    if (!destination || !checkInDate) return;
    
    const searchCityId = cityId || getCityId(destination);
    if (!searchCityId) {
      setError('Destination not supported for package search');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        cityId: searchCityId,
        date: checkInDate,
        adults: adults.toString(),
        children: children.toString(),
      });

      if (childAges.length > 0) {
        params.append('childAges', childAges.join(','));
      }

      const response = await fetch(`/api/packages/search?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to search packages');
      }

      const data = await response.json();
      setPackages(data.packages || []);
      
      if (data.packages.length === 0) {
        setError('No packages available for the selected dates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search packages');
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchPackages();
  }, [destination, checkInDate, adults, children, childAges?.join(',')]);

  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg);
    // Default to the cheapest hotel option
    const defaultHotel = pkg.hotels[0];
    setSelectedHotel(defaultHotel);
    onSelect({ package: pkg, selectedHotel: defaultHotel });
  };

  const handleHotelSelect = (hotel: Package['hotels'][0]) => {
    setSelectedHotel(hotel);
    if (selectedPackage) {
      onSelect({ package: selectedPackage, selectedHotel: hotel });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Searching packages...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">{error}</p>
        <button 
          onClick={searchPackages}
          className="mt-2 text-sm text-blue-600 hover:text-blue-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <p>No packages found. Try adjusting your search criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Available Packages</h3>
      
      {packages.map((pkg) => (
        <div
          key={pkg.id}
          className={`border rounded-lg p-4 cursor-pointer transition-all ${
            selectedPackageId === pkg.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => handlePackageSelect(pkg)}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-semibold text-lg">{pkg.name}</h4>
              {pkg.featured && (
                <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mt-1">
                  Featured
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                €{pkg.totalPriceFrom.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">
                from {pkg.nights} nights
              </div>
            </div>
          </div>

          <p className="text-gray-600 text-sm mb-3">{pkg.description}</p>

          {/* Flight Details */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex items-center mb-2">
              <Plane className="h-4 w-4 mr-2 text-blue-600" />
              <span className="font-medium">Flights Included</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Outbound:</span> {pkg.flightDetails.outbound.flightNumber}
                <br />
                <span className="text-gray-600">
                  {pkg.flightDetails.outbound.departure} → {pkg.flightDetails.outbound.arrival}
                </span>
                <br />
                <span className="text-gray-600">
                  {formatDate(pkg.flightDetails.outbound.departureTime)}
                </span>
              </div>
              <div>
                <span className="font-medium">Return:</span> {pkg.flightDetails.return.flightNumber}
                <br />
                <span className="text-gray-600">
                  {pkg.flightDetails.return.departure} → {pkg.flightDetails.return.arrival}
                </span>
                <br />
                <span className="text-gray-600">
                  {formatDate(pkg.flightDetails.return.departureTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Hotel Options */}
          {pkg.hotels.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="flex items-center mb-2">
                <Hotel className="h-4 w-4 mr-2 text-green-600" />
                <span className="font-medium">Hotel Options</span>
              </div>
              <div className="space-y-2">
                {pkg.hotels.map((hotel, index) => (
                  <div
                    key={hotel.id}
                    className={`flex items-center justify-between p-2 rounded ${
                      selectedHotel?.id === hotel.id && selectedPackageId === pkg.id
                        ? 'bg-blue-100 border border-blue-300'
                        : 'bg-white border border-gray-200'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedPackageId === pkg.id) {
                        handleHotelSelect(hotel);
                      }
                    }}
                  >
                    <div>
                      <div className="font-medium">{hotel.name}</div>
                      <div className="flex items-center text-sm text-gray-600">
                        <div className="flex items-center mr-3">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < hotel.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span>{hotel.board} • {hotel.roomType}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">€{hotel.price.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">total</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Package Highlights */}
          {pkg.highlights && pkg.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {pkg.highlights.map((highlight, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                >
                  {highlight}
                </span>
              ))}
            </div>
          )}

          {/* Availability */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              <span>{pkg.availableSeats} seats available</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{pkg.nights} nights</span>
            </div>
          </div>
        </div>
      ))}

      {selectedPackage && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full">
                <ChevronRight className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Package Selected
              </h3>
              <div className="mt-1 text-sm text-green-700">
                <strong>{selectedPackage.name}</strong>
                {selectedHotel && (
                  <span> with {selectedHotel.name}</span>
                )}
                <div className="mt-1">
                  Total: €{(selectedPackage.flightPrice * (adults + children) + (selectedHotel?.price || selectedPackage.hotelPriceFrom)).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}