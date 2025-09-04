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
  Zap,
  ChevronDown
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
  { code: 'CDG', city: 'Paris', country: 'FR' },
  { code: 'FCO', city: 'Rome', country: 'IT' },
  { code: 'BCN', city: 'Barcelona', country: 'ES' },
  { code: 'VIE', city: 'Vienna', country: 'AT' },
  { code: 'AMS', city: 'Amsterdam', country: 'NL' },
];

const FLIGHT_CLASSES = [
  { value: 'Economy', label: 'Economy' },
  { value: 'Premium Economy', label: 'Premium' },
  { value: 'Business', label: 'Business' },
  { value: 'First', label: 'First' },
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
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const FlightCard = ({ flight }: { flight: FlightResult }) => {
    const isExpanded = expandedCard === flight.id;
    
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div 
          className="p-4 cursor-pointer"
          onClick={() => setExpandedCard(isExpanded ? null : flight.id)}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900 text-sm">{flight.airline}</span>
                {flight.type === 'guaranteed' && (
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    <Zap className="w-3 h-3 inline mr-1" />
                    Guaranteed
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mb-2">{flight.flightNumber}</div>
              
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{flight.departureTime}</div>
                  <div className="text-xs text-gray-500">{flight.origin}</div>
                </div>
                
                <div className="flex-1 px-3">
                  <div className="flex items-center justify-center">
                    <div className="h-px bg-gray-300 flex-1"></div>
                    <div className="px-2 text-xs text-gray-500">{flight.duration}</div>
                    <div className="h-px bg-gray-300 flex-1"></div>
                  </div>
                  <div className="text-center text-xs text-gray-500 mt-1">
                    {flight.stops !== undefined ? (
                      flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`
                    ) : ''}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{flight.arrivalTime}</div>
                  <div className="text-xs text-gray-500">{flight.destination}</div>
                </div>
              </div>
            </div>
            
            <div className="ml-4 text-right">
              <div className="text-lg font-bold text-gray-900">{formatPrice(flight.price)}</div>
              <div className="text-xs text-gray-500">per person</div>
              <ChevronDown 
                className={`w-4 h-4 text-gray-400 mt-1 mx-auto transition-transform ${
                  isExpanded ? 'transform rotate-180' : ''
                }`} 
              />
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {flight.aircraft && (
                <div className="flex items-center space-x-2">
                  <Plane className="w-4 h-4" />
                  <span>{flight.aircraft}</span>
                </div>
              )}
              {flight.availableSeats && (
                <div className="text-green-600 font-medium">
                  {flight.availableSeats} seats available
                </div>
              )}
            </div>
            <Button className="w-full" size="sm">
              Select Flight
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="p-4">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Search Flights</h1>
          <p className="text-sm text-gray-600">Find guaranteed seats and dynamic options</p>
        </div>

        {/* Trip Type Selection */}
        <div className="flex p-4 pt-0 space-x-2">
          <button
            onClick={() => setTripType('round-trip')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              tripType === 'round-trip'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Round Trip
          </button>
          <button
            onClick={() => setTripType('one-way')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              tripType === 'one-way'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            One Way
          </button>
        </div>

        {/* Search Form */}
        <div className="p-4 space-y-4">
          {/* From/To with Swap */}
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Origin"
                  value={searchParams.origin}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, origin: e.target.value }))}
                  className="pl-10 text-sm"
                />
              </div>
            </div>
            
            <div className="pt-6">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleSwapLocations}
                className="h-10 w-10"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Destination"
                  value={searchParams.destination}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, destination: e.target.value }))}
                  className="pl-10 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Departure</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="date"
                  value={searchParams.departureDate}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, departureDate: e.target.value }))}
                  className="pl-10 text-sm"
                />
              </div>
            </div>
            
            {tripType === 'round-trip' && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Return</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="date"
                    value={searchParams.returnDate}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, returnDate: e.target.value }))}
                    className="pl-10 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Passengers and Class */}
          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Passengers</label>
              <Select
                value={searchParams.passengers.toString()}
                onValueChange={(value) => setSearchParams(prev => ({ ...prev, passengers: parseInt(value) }))}
              >
                <SelectTrigger className="text-sm">
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

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <Select
                value={searchParams.class}
                onValueChange={(value) => setSearchParams(prev => ({ ...prev, class: value }))}
              >
                <SelectTrigger className="text-sm">
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
                Search Flights
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {/* Popular Destinations */}
        {results.length === 0 && (
          <div className="bg-white rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Popular Destinations</h3>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_DESTINATIONS.map(dest => (
                <button
                  key={dest.code}
                  onClick={() => setSearchParams(prev => ({ ...prev, destination: dest.code }))}
                  className="text-left p-3 border border-gray-200 rounded-lg"
                >
                  <div className="font-medium text-gray-900 text-sm">{dest.city}</div>
                  <div className="text-xs text-gray-500">{dest.code}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div>
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">
                {results.length} Flights Found
              </h3>
              <p className="text-xs text-gray-500">
                {searchParams.origin} → {searchParams.destination}
              </p>
            </div>
            
            <div className="space-y-3">
              {results.map(flight => (
                <FlightCard key={flight.id} flight={flight} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}