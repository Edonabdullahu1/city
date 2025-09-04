'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/button';
import { Input } from '@/components/shared/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/select';
import { 
  Hotel, 
  Calendar, 
  Users, 
  Search,
  MapPin,
  Star,
  Wifi,
  Utensils,
  CheckCircle,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface HotelSelectorProps {
  onSearch?: (searchParams: HotelSearchParams) => void;
  onSelect?: (hotel: HotelResult, roomType: string) => void;
  loading?: boolean;
}

interface HotelSearchParams {
  location: string;
  checkIn: string;
  checkOut: string;
  occupancy: number;
  roomType?: string;
}

interface HotelResult {
  id: string;
  name: string;
  location: string;
  city: string;
  country: string;
  address: string;
  rating: number;
  description: string;
  amenities: string[];
  images: string[];
  rooms: Array<{
    type: string;
    maxOccupancy: number;
    pricePerNight: number;
    available: number;
    amenities: string[];
    totalPrice: number;
  }>;
  totalNights: number;
}

const ROOM_TYPES = [
  { value: 'Single', label: 'Single' },
  { value: 'Double', label: 'Double' },
  { value: 'Triple', label: 'Triple' },
  { value: 'Suite', label: 'Suite' },
  { value: 'Family', label: 'Family' },
];

export default function HotelSelector({ onSearch, onSelect, loading = false }: HotelSelectorProps) {
  const [searchParams, setSearchParams] = useState<HotelSearchParams>({
    location: '',
    checkIn: '',
    checkOut: '',
    occupancy: 1,
    roomType: undefined,
  });

  const [results, setResults] = useState<HotelResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchParams.location || !searchParams.checkIn || !searchParams.checkOut) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSearching(true);
    
    try {
      const response = await fetch('/api/hotels/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...searchParams,
          checkIn: new Date(searchParams.checkIn).toISOString(),
          checkOut: new Date(searchParams.checkOut).toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const hotels = data.data.hotels.map((hotel: any) => ({
          ...hotel,
          totalNights: data.data.totalNights,
          rooms: hotel.rooms.filter((room: any) => 
            room.maxOccupancy >= searchParams.occupancy && 
            room.available > 0 &&
            (!searchParams.roomType || room.type === searchParams.roomType)
          ).map((room: any) => ({
            ...room,
            totalPrice: room.pricePerNight * data.data.totalNights,
          })),
        })).filter((hotel: any) => hotel.rooms.length > 0);
        
        setResults(hotels);
        onSearch?.(searchParams);
      } else {
        alert('Failed to search hotels');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('An error occurred while searching');
    } finally {
      setIsSearching(false);
    }
  };

  const handleHotelSelect = (hotel: HotelResult, roomType: string) => {
    setSelectedHotel(hotel.id);
    onSelect?.(hotel, roomType);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );
    return nights;
  };

  const HotelCard = ({ hotel }: { hotel: HotelResult }) => {
    const isExpanded = expandedHotel === hotel.id;
    const cheapestRoom = hotel.rooms.reduce((min, room) => 
      room.totalPrice < min.totalPrice ? room : min, hotel.rooms[0]
    );

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Hotel Header */}
        <div className="relative h-32 bg-gray-200">
          <img 
            src={hotel.images[0] || '/images/hotel-placeholder.jpg'} 
            alt={hotel.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/hotel-placeholder.jpg';
            }}
          />
          <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded-full flex items-center space-x-1">
            <Star className="w-3 h-3 text-yellow-400 fill-current" />
            <span className="text-xs font-medium">{hotel.rating}</span>
          </div>
        </div>

        <div 
          className="p-4 cursor-pointer"
          onClick={() => setExpandedHotel(isExpanded ? null : hotel.id)}
        >
          {/* Hotel Info */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-sm">{hotel.name}</h3>
              <div className="flex items-center text-gray-600 text-xs mb-1">
                <MapPin className="w-3 h-3 mr-1" />
                <span>{hotel.location}</span>
              </div>
              <p className="text-gray-600 text-xs line-clamp-2">{hotel.description}</p>
            </div>
            
            <div className="ml-4 text-right">
              <div className="text-sm font-bold text-gray-900">
                {formatPrice(cheapestRoom.totalPrice)}
              </div>
              <div className="text-xs text-gray-500">
                {hotel.totalNights} nights
              </div>
              <div className="text-xs text-gray-500">
                from {formatPrice(cheapestRoom.pricePerNight)}/night
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400 mt-1 mx-auto" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 mt-1 mx-auto" />
              )}
            </div>
          </div>

          {/* Quick Amenities */}
          <div className="flex flex-wrap gap-1">
            {hotel.amenities.slice(0, 3).map(amenity => (
              <div key={amenity} className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded-full text-xs text-gray-600">
                {amenity === 'WiFi' && <Wifi className="w-3 h-3" />}
                {amenity === 'Restaurant' && <Utensils className="w-3 h-3" />}
                {!['WiFi', 'Restaurant'].includes(amenity) && <Hotel className="w-3 h-3" />}
                <span>{amenity}</span>
              </div>
            ))}
            {hotel.amenities.length > 3 && (
              <span className="bg-gray-100 px-2 py-1 rounded-full text-xs text-gray-600">
                +{hotel.amenities.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-200 bg-gray-50">
            <div className="p-4 space-y-3">
              {hotel.rooms.map(room => (
                <div key={room.type} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm">{room.type}</h4>
                      <div className="text-xs text-gray-600">
                        Max {room.maxOccupancy} guests • {room.available} available
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {room.amenities.slice(0, 2).map(amenity => (
                          <span key={amenity} className="bg-blue-50 text-blue-700 px-1 py-0.5 rounded text-xs">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-sm font-bold text-gray-900">
                        {formatPrice(room.totalPrice)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatPrice(room.pricePerNight)}/night
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHotelSelect(hotel, room.type);
                      }}
                      disabled={selectedHotel === hotel.id}
                    >
                      {selectedHotel === hotel.id ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Selected
                        </>
                      ) : (
                        'Select'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="p-4">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Find Hotels</h1>
          <p className="text-sm text-gray-600">Search for the perfect accommodation</p>
        </div>

        {/* Search Form */}
        <div className="p-4 space-y-4">
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="City, hotel, or landmark"
                value={searchParams.location}
                onChange={(e) => setSearchParams(prev => ({ ...prev, location: e.target.value }))}
                className="pl-10 text-sm"
              />
            </div>
          </div>

          {/* Check In/Out */}
          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="date"
                  value={searchParams.checkIn}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, checkIn: e.target.value }))}
                  className="pl-10 text-sm"
                />
              </div>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="date"
                  value={searchParams.checkOut}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, checkOut: e.target.value }))}
                  className="pl-10 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Guests and Room Type */}
          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
              <Select
                value={searchParams.occupancy.toString()}
                onValueChange={(value) => setSearchParams(prev => ({ ...prev, occupancy: parseInt(value) }))}
              >
                <SelectTrigger className="text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'Guest' : 'Guests'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
              <Select
                value={searchParams.roomType || 'any'}
                onValueChange={(value) => setSearchParams(prev => ({ 
                  ...prev, 
                  roomType: value === 'any' ? undefined : value 
                }))}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {ROOM_TYPES.map(roomType => (
                    <SelectItem key={roomType.value} value={roomType.value}>
                      {roomType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Nights Calculation */}
          {searchParams.checkIn && searchParams.checkOut && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>{calculateNights(searchParams.checkIn, searchParams.checkOut)} nights</strong> •{' '}
                {searchParams.occupancy} {searchParams.occupancy === 1 ? 'guest' : 'guests'}
              </div>
            </div>
          )}

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            disabled={isSearching || loading}
            className="w-full"
            size="lg"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search Hotels
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {/* Search Results */}
        {results.length > 0 && (
          <div>
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">
                {results.length} Hotels Found
              </h3>
              <p className="text-xs text-gray-500">
                {searchParams.location} • {searchParams.checkIn} to {searchParams.checkOut}
              </p>
            </div>
            
            <div className="space-y-3">
              {results.map(hotel => (
                <HotelCard key={hotel.id} hotel={hotel} />
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {results.length === 0 && searchParams.location && !isSearching && (
          <div className="bg-white rounded-lg p-8 text-center">
            <Hotel className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">No hotels found</h3>
            <p className="text-sm text-gray-600">
              Try different dates or location
            </p>
          </div>
        )}
      </div>
    </div>
  );
}