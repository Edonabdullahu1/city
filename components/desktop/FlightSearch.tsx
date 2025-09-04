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
  Plane, 
  Calendar, 
  Users, 
  ArrowRightLeft,
  Search,
  MapPin,
  Clock,
  Star,
  Zap
} from 'lucide-react';

interface FlightSearchProps {
  onSearch?: (searchParams: FlightSearchParams) => void;
  loading?: boolean;
}

interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  class: string;
}

interface FlightResult {
  id: string;
  type: 'guaranteed' | 'dynamic';
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  availableSeats?: number;
  stops?: number;
  aircraft?: string;
}

const POPULAR_DESTINATIONS = [
  { code: 'CDG', city: 'Paris', country: 'France' },
  { code: 'FCO', city: 'Rome', country: 'Italy' },
  { code: 'BCN', city: 'Barcelona', country: 'Spain' },
  { code: 'VIE', city: 'Vienna', country: 'Austria' },
  { code: 'AMS', city: 'Amsterdam', country: 'Netherlands' },
  { code: 'LHR', city: 'London', country: 'United Kingdom' },
];

const FLIGHT_CLASSES = [
  { value: 'Economy', label: 'Economy' },
  { value: 'Premium Economy', label: 'Premium Economy' },
  { value: 'Business', label: 'Business' },
  { value: 'First', label: 'First Class' },
];

export default function FlightSearch({ onSearch, loading = false }: FlightSearchProps) {
  const [searchParams, setSearchParams] = useState<FlightSearchParams>({
    origin: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    passengers: 1,
    class: 'Economy',
  });

  const [tripType, setTripType] = useState<'round-trip' | 'one-way'>('round-trip');
  const [results, setResults] = useState<FlightResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchParams.origin || !searchParams.destination || !searchParams.departureDate) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSearching(true);
    
    try {
      const response = await fetch('/api/flights/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...searchParams,
          departureDate: new Date(searchParams.departureDate).toISOString(),
          returnDate: searchParams.returnDate ? new Date(searchParams.returnDate).toISOString() : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const allFlights: FlightResult[] = [
          ...data.data.guaranteed.map((flight: any) => ({
            id: flight.id,
            type: 'guaranteed' as const,
            airline: flight.airline,
            flightNumber: flight.flightNumber,
            origin: flight.origin,
            destination: flight.destination,
            departureTime: flight.departureTime,
            arrivalTime: flight.arrivalTime,
            duration: flight.duration,
            price: flight.price,
            availableSeats: flight.availableSeats,
            aircraft: flight.aircraft,
          })),
          ...data.data.dynamic.map((flight: any) => ({
            id: flight.id,
            type: 'dynamic' as const,
            airline: flight.airline,
            flightNumber: flight.flightNumber,
            origin: flight.origin,
            destination: flight.destination,
            departureTime: flight.departureTime,
            arrivalTime: flight.arrivalTime,
            duration: flight.duration,
            price: flight.price,
            stops: flight.stops,
            aircraft: flight.aircraft,
          })),
        ];
        setResults(allFlights);
        onSearch?.(searchParams);
      } else {
        alert('Failed to search flights');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('An error occurred while searching');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSwapLocations = () => {
    setSearchParams(prev => ({
      ...prev,
      origin: prev.destination,
      destination: prev.origin,
    }));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const FlightCard = ({ flight }: { flight: FlightResult }) => (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Plane className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{flight.airline}</div>
            <div className="text-sm text-gray-500">{flight.flightNumber}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {flight.type === 'guaranteed' && (
            <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
              <Zap className="w-3 h-3" />
              <span>Guaranteed</span>
            </div>
          )}
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{formatPrice(flight.price)}</div>
            <div className="text-sm text-gray-500">per person</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{flight.departureTime}</div>
          <div className="text-sm text-gray-500">{flight.origin}</div>
        </div>
        
        <div className="flex-1 flex items-center justify-center space-x-2 mx-4">
          <div className="h-px bg-gray-300 flex-1"></div>
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{flight.duration}</span>
          </div>
          <div className="h-px bg-gray-300 flex-1"></div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{flight.arrivalTime}</div>
          <div className="text-sm text-gray-500">{flight.destination}</div>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          {flight.aircraft && (
            <span className="flex items-center space-x-1">
              <Plane className="w-3 h-3" />
              <span>{flight.aircraft}</span>
            </span>
          )}
          {flight.stops !== undefined && (
            <span>
              {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
            </span>
          )}
          {flight.availableSeats && (
            <span className="text-green-600 font-medium">
              {flight.availableSeats} seats available
            </span>
          )}
        </div>
        <Button size="sm" className="ml-4">
          Select Flight
        </Button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Search Flights</h2>
        <p className="text-gray-600">Find the best flights with our guaranteed seats and dynamic options</p>
      </div>

      {/* Trip Type Selection */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setTripType('round-trip')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tripType === 'round-trip'
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-150'
          }`}
        >
          Round Trip
        </button>
        <button
          onClick={() => setTripType('one-way')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tripType === 'one-way'
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-150'
          }`}
        >
          One Way
        </button>
      </div>

      {/* Search Form */}
      <div className="grid grid-cols-12 gap-4 mb-6">
        {/* Origin */}
        <div className="col-span-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Origin city or airport code"
              value={searchParams.origin}
              onChange={(e) => setSearchParams(prev => ({ ...prev, origin: e.target.value }))}
              className="pl-10"
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="col-span-2 flex items-end justify-center">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSwapLocations}
            className="mb-0"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Destination */}
        <div className="col-span-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Destination city or airport code"
              value={searchParams.destination}
              onChange={(e) => setSearchParams(prev => ({ ...prev, destination: e.target.value }))}
              className="pl-10"
            />
          </div>
        </div>

        {/* Departure Date */}
        <div className="col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Departure</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="date"
              value={searchParams.departureDate}
              onChange={(e) => setSearchParams(prev => ({ ...prev, departureDate: e.target.value }))}
              className="pl-10"
            />
          </div>
        </div>

        {/* Return Date */}
        {tripType === 'round-trip' && (
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Return</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="date"
                value={searchParams.returnDate}
                onChange={(e) => setSearchParams(prev => ({ ...prev, returnDate: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Passengers */}
        <div className="col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Passengers</label>
          <Select
            value={searchParams.passengers.toString()}
            onValueChange={(value) => setSearchParams(prev => ({ ...prev, passengers: parseInt(value) }))}
          >
            <SelectTrigger>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-400" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 9 }, (_, i) => i + 1).map(num => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? 'Passenger' : 'Passengers'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Flight Class */}
        <div className="col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
          <Select
            value={searchParams.class}
            onValueChange={(value) => setSearchParams(prev => ({ ...prev, class: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FLIGHT_CLASSES.map(flightClass => (
                <SelectItem key={flightClass.value} value={flightClass.value}>
                  {flightClass.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
              Search Flights
            </>
          )}
        </Button>
      </div>

      {/* Popular Destinations */}
      {results.length === 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Destinations</h3>
          <div className="grid grid-cols-3 gap-4">
            {POPULAR_DESTINATIONS.map(dest => (
              <button
                key={dest.code}
                onClick={() => setSearchParams(prev => ({ ...prev, destination: dest.code }))}
                className="text-left p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="font-semibold text-gray-900">{dest.city}</div>
                <div className="text-sm text-gray-500">{dest.country}</div>
                <div className="text-xs text-gray-400 mt-1">{dest.code}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Flight Results ({results.length})
            </h3>
            <div className="text-sm text-gray-500">
              Showing flights from {searchParams.origin} to {searchParams.destination}
            </div>
          </div>
          
          <div className="space-y-4">
            {results.map(flight => (
              <FlightCard key={flight.id} flight={flight} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}