'use client';

import { useState, useEffect } from 'react';
import { Hotel, Star, MapPin, Wifi, Car, Coffee, Users, Loader2, Check } from 'lucide-react';

interface HotelRoom {
  id: string;
  type: string;
  maxOccupancy: number;
  pricePerNight: number;
  available: number;
  amenities: string[];
}

interface HotelResult {
  id: string;
  name: string;
  rating: number;
  stars: number;
  address: string;
  city: string;
  description: string;
  images: string[];
  amenities: string[];
  rooms: HotelRoom[];
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  cancellationPolicy: string;
  breakfast: boolean;
  distanceFromCenter: number;
}

interface HotelSearchProps {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  infants?: number;
  onSelect: (hotel: HotelResult, room?: HotelRoom) => void;
  selectedHotelId?: string;
  selectedRoomId?: string;
}

export default function HotelSearch({
  destination,
  checkIn,
  checkOut,
  adults,
  children = 0,
  infants = 0,
  onSelect,
  selectedHotelId,
  selectedRoomId
}: HotelSearchProps) {
  const [hotels, setHotels] = useState<HotelResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'luxury' | 'budget' | 'boutique'>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'distance'>('rating');
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null);

  useEffect(() => {
    if (destination && checkIn && checkOut && adults) {
      searchHotels();
    }
  }, [destination, checkIn, checkOut, adults, children, infants]);

  const searchHotels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/hotels/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          destination,
          checkIn,
          checkOut,
          adults,
          children,
          infants,
          rooms: Math.ceil((adults + children) / 2)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to search hotels');
      }

      const data = await response.json();
      setHotels(data.hotels || []);
    } catch (err) {
      setError('Unable to search hotels. Please try again.');
      console.error('Hotel search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredHotels = () => {
    let filtered = [...hotels];
    
    // Apply filter
    if (filter === 'luxury') {
      filtered = filtered.filter(h => h.stars >= 4);
    } else if (filter === 'budget') {
      filtered = filtered.filter(h => h.pricePerNight < 100);
    } else if (filter === 'boutique') {
      filtered = filtered.filter(h => h.name.toLowerCase().includes('boutique') || h.stars === 4);
    }
    
    // Apply sorting
    if (sortBy === 'price') {
      filtered.sort((a, b) => a.pricePerNight - b.pricePerNight);
    } else if (sortBy === 'distance') {
      filtered.sort((a, b) => a.distanceFromCenter - b.distanceFromCenter);
    } else {
      filtered.sort((a, b) => b.rating - a.rating);
    }
    
    return filtered;
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
      />
    ));
  };

  const getAmenityIcon = (amenity: string) => {
    const lowerAmenity = amenity.toLowerCase();
    if (lowerAmenity.includes('wifi')) return <Wifi className="h-4 w-4" />;
    if (lowerAmenity.includes('parking')) return <Car className="h-4 w-4" />;
    if (lowerAmenity.includes('breakfast')) return <Coffee className="h-4 w-4" />;
    return null;
  };

  const calculateNights = () => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        <span className="ml-3 text-lg">Searching for hotels...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={searchHotels}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const filteredHotels = getFilteredHotels();
  const nights = calculateNights();

  return (
    <div className="space-y-4">
      {/* Filter and Sort Options */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Hotels ({hotels.length})
          </button>
          <button
            onClick={() => setFilter('luxury')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'luxury' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Luxury (4-5★)
          </button>
          <button
            onClick={() => setFilter('budget')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'budget' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Budget (&lt;€100)
          </button>
          <button
            onClick={() => setFilter('boutique')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'boutique' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Boutique
          </button>
        </div>
        
        <div className="ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border rounded-lg text-sm"
          >
            <option value="rating">Sort by Rating</option>
            <option value="price">Sort by Price</option>
            <option value="distance">Sort by Distance</option>
          </select>
        </div>
      </div>

      {/* Hotel Results */}
      {filteredHotels.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No hotels found matching your criteria
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHotels.map((hotel) => {
            const isSelected = selectedHotelId === hotel.id;
            const isExpanded = expandedHotel === hotel.id;
            
            return (
              <div
                key={hotel.id}
                className={`border rounded-lg overflow-hidden transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:shadow-lg'
                }`}
              >
                <div
                  onClick={() => {
                    if (!isExpanded) {
                      setExpandedHotel(hotel.id);
                    } else {
                      setExpandedHotel(null);
                    }
                  }}
                  className="p-4 cursor-pointer"
                >
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Hotel className="h-5 w-5 text-gray-600" />
                            {hotel.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex">
                              {renderStars(hotel.stars)}
                            </div>
                            <span className="text-sm text-gray-600">
                              {hotel.rating}/5 rating
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            {formatPrice(hotel.pricePerNight, hotel.currency)}
                          </p>
                          <p className="text-sm text-gray-600">per night</p>
                          <p className="text-sm font-semibold mt-1">
                            {formatPrice(hotel.totalPrice, hotel.currency)} total
                          </p>
                          <p className="text-xs text-gray-500">for {nights} nights</p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-gray-600 flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {hotel.distanceFromCenter} km from city center
                        </p>
                        
                        <p className="text-sm text-gray-700">{hotel.description}</p>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {hotel.amenities.slice(0, 5).map((amenity, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs"
                            >
                              {getAmenityIcon(amenity)}
                              {amenity}
                            </span>
                          ))}
                          {hotel.amenities.length > 5 && (
                            <span className="px-2 py-1 text-xs text-gray-500">
                              +{hotel.amenities.length - 5} more
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm mt-2">
                          {hotel.breakfast && (
                            <span className="text-green-600 flex items-center">
                              <Check className="h-4 w-4 mr-1" />
                              Breakfast included
                            </span>
                          )}
                          <span className="text-gray-600">
                            {hotel.cancellationPolicy}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Room Selection */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-4">
                    <h4 className="font-semibold mb-3">Available Rooms</h4>
                    <div className="space-y-2">
                      {hotel.rooms.map((room) => {
                        const roomSelected = selectedRoomId === room.id;
                        return (
                          <div
                            key={room.id}
                            className={`border rounded-lg p-3 bg-white ${
                              roomSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium">{room.type}</p>
                                <p className="text-sm text-gray-600 flex items-center mt-1">
                                  <Users className="h-4 w-4 mr-1" />
                                  Max {room.maxOccupancy} guests
                                </p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {room.amenities.map((amenity, idx) => (
                                    <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                      {amenity}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold">
                                  {formatPrice(room.pricePerNight, hotel.currency)}
                                </p>
                                <p className="text-xs text-gray-600">per night</p>
                                {room.available < 5 && (
                                  <p className="text-xs text-orange-600 mt-1">
                                    Only {room.available} left!
                                  </p>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(hotel, room);
                                  }}
                                  className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium ${
                                    roomSelected
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-blue-500 text-white hover:bg-blue-600'
                                  }`}
                                >
                                  {roomSelected ? 'Selected' : 'Select Room'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}