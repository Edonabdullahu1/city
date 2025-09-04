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
  Car,
  Utensils,
  Coffee,
  Waves,
  Camera,
  CheckCircle,
  Eye
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
  { value: 'Single', label: 'Single Room' },
  { value: 'Double', label: 'Double Room' },
  { value: 'Triple', label: 'Triple Room' },
  { value: 'Suite', label: 'Suite' },
  { value: 'Family', label: 'Family Room' },
];

const AMENITY_ICONS: Record<string, any> = {
  'WiFi': Wifi,
  'Pool': Waves,
  'Restaurant': Utensils,
  'Bar': Coffee,
  'Gym': Users,
  'Spa': Star,
  'Parking': Car,
  'Room Service': Hotel,
  'Concierge': Users,
};

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
        const hotels = data.data.hotels.map((hotel: any) => {
          // Get available room types for this search
          const availabilityResponse = fetch(`/api/hotels/availability?hotelId=${hotel.id}&checkIn=${searchParams.checkIn}&checkOut=${searchParams.checkOut}&occupancy=${searchParams.occupancy}`, {
            method: 'GET',
          });
          
          return {
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
          };
        }).filter((hotel: any) => hotel.rooms.length > 0);
        
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
    }).format(price);
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );
    return nights;
  };

  const HotelCard = ({ hotel }: { hotel: HotelResult }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Hotel Image */}
      <div className="relative h-48 bg-gray-200">
        <img 
          src={hotel.images[0] || '/images/hotel-placeholder.jpg'} 
          alt={hotel.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/images/hotel-placeholder.jpg';
          }}
        />
        <div className="absolute top-4 left-4 bg-white px-2 py-1 rounded-full flex items-center space-x-1">
          <Star className="w-4 h-4 text-yellow-400 fill-current" />
          <span className="text-sm font-medium">{hotel.rating}</span>
        </div>
      </div>

      <div className="p-6">
        {/* Hotel Info */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-1">{hotel.name}</h3>
          <div className="flex items-center text-gray-600 text-sm mb-2">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{hotel.location}, {hotel.country}</span>
          </div>
          <p className="text-gray-600 text-sm line-clamp-2">{hotel.description}</p>
        </div>

        {/* Amenities */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {hotel.amenities.slice(0, 6).map(amenity => {
              const IconComponent = AMENITY_ICONS[amenity] || Hotel;
              return (
                <div key={amenity} className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded-full text-xs text-gray-700">
                  <IconComponent className="w-3 h-3" />
                  <span>{amenity}</span>
                </div>
              );
            })}
            {hotel.amenities.length > 6 && (
              <div className="bg-gray-100 px-2 py-1 rounded-full text-xs text-gray-700">
                +{hotel.amenities.length - 6} more
              </div>
            )}
          </div>
        </div>

        {/* Available Rooms */}
        <div className="space-y-3">
          {hotel.rooms.map(room => (
            <div key={room.type} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{room.type}</h4>
                  <div className="text-sm text-gray-600">
                    Max {room.maxOccupancy} {room.maxOccupancy === 1 ? 'guest' : 'guests'}
                  </div>
                  <div className="text-sm text-green-600 font-medium">
                    {room.available} rooms available
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    {formatPrice(room.pricePerNight)} per night
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatPrice(room.totalPrice)}
                  </div>
                  <div className="text-xs text-gray-500">
                    for {hotel.totalNights} nights
                  </div>
                </div>
              </div>

              {/* Room Amenities */}
              <div className="flex flex-wrap gap-1 mb-3">
                {room.amenities.map(amenity => (
                  <span key={amenity} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    {amenity}
                  </span>
                ))}
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleHotelSelect(hotel, room.type)}
                  disabled={selectedHotel === hotel.id}
                >
                  {selectedHotel === hotel.id ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Selected
                    </>
                  ) : (
                    'Select Room'
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Hotels</h2>
        <p className="text-gray-600">Search for the perfect accommodation for your stay</p>
      </div>

      {/* Search Form */}
      <div className="grid grid-cols-12 gap-4 mb-6">
        {/* Location */}
        <div className="col-span-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="City, hotel name, or landmark"
              value={searchParams.location}
              onChange={(e) => setSearchParams(prev => ({ ...prev, location: e.target.value }))}
              className="pl-10"
            />
          </div>
        </div>

        {/* Check In */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Check In</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="date"
              value={searchParams.checkIn}
              onChange={(e) => setSearchParams(prev => ({ ...prev, checkIn: e.target.value }))}
              className="pl-10"
            />
          </div>
        </div>

        {/* Check Out */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Check Out</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="date"
              value={searchParams.checkOut}
              onChange={(e) => setSearchParams(prev => ({ ...prev, checkOut: e.target.value }))}
              className="pl-10"
            />
          </div>
        </div>

        {/* Guests */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Guests</label>
          <Select
            value={searchParams.occupancy.toString()}
            onValueChange={(value) => setSearchParams(prev => ({ ...prev, occupancy: parseInt(value) }))}
          >
            <SelectTrigger>
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

        {/* Room Type (Optional) */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Room Type</label>
          <Select
            value={searchParams.roomType || 'any'}
            onValueChange={(value) => setSearchParams(prev => ({ 
              ...prev, 
              roomType: value === 'any' ? undefined : value 
            }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Room Type</SelectItem>
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
        <div className="mb-6 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            <strong>{calculateNights(searchParams.checkIn, searchParams.checkOut)} nights</strong> stay
            {' '}• {searchParams.occupancy} {searchParams.occupancy === 1 ? 'guest' : 'guests'}
            {searchParams.roomType && ` • ${searchParams.roomType} rooms preferred`}
          </div>
        </div>
      )}

      {/* Search Button */}
      <div className="flex justify-center mb-8">
        <Button
          onClick={handleSearch}
          disabled={isSearching || loading}
          className="px-8 py-3 text-lg"
        >
          {isSearching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-5 h-5 mr-2" />
              Search Hotels
            </>
          )}
        </Button>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {results.length} Hotels Found
            </h3>
            <div className="text-sm text-gray-500">
              {searchParams.location} • {searchParams.checkIn} to {searchParams.checkOut}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {results.map(hotel => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {results.length === 0 && searchParams.location && !isSearching && (
        <div className="text-center py-12">
          <Hotel className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hotels found</h3>
          <p className="text-gray-600">
            Try adjusting your search criteria or selecting a different location
          </p>
        </div>
      )}
    </div>
  );
}