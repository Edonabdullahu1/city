'use client';

import { useState, useEffect } from 'react';
import { Plane, Clock, Users, Loader2 } from 'lucide-react';

interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departure: {
    airport: string;
    time: string;
    terminal?: string;
  };
  arrival: {
    airport: string;
    time: string;
    terminal?: string;
  };
  duration: string;
  stops: number;
  price: {
    amount: number;
    currency: string;
  };
  availableSeats?: number;
  aircraft?: string;
}

interface FlightSearchProps {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  onSelect: (flight: Flight) => void;
  selectedFlightId?: string;
}

export default function FlightSearch({
  origin,
  destination,
  departureDate,
  returnDate,
  adults,
  children = 0,
  infants = 0,
  onSelect,
  selectedFlightId
}: FlightSearchProps) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [blockSeats, setBlockSeats] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'direct' | 'guaranteed'>('all');

  useEffect(() => {
    if (origin && destination && departureDate && adults) {
      searchFlights();
    }
  }, [origin, destination, departureDate, returnDate, adults, children, infants]);

  const searchFlights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/flights/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          origin,
          destination,
          departureDate,
          returnDate,
          adults,
          children,
          infants,
          type: returnDate ? 'roundtrip' : 'oneway'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to search flights');
      }

      const data = await response.json();
      setFlights(data.flights || []);
      setBlockSeats(data.blockSeats || []);
    } catch (err) {
      setError('Unable to search flights. Please try again.');
      console.error('Flight search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredFlights = () => {
    let allFlights = [...blockSeats, ...flights];
    
    if (filter === 'direct') {
      allFlights = allFlights.filter(f => f.stops === 0);
    } else if (filter === 'guaranteed') {
      allFlights = blockSeats;
    }
    
    return allFlights;
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStopsText = (stops: number) => {
    if (stops === 0) return 'Direct';
    if (stops === 1) return '1 Stop';
    return `${stops} Stops`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        <span className="ml-3 text-lg">Searching for flights...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={searchFlights}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const filteredFlights = getFilteredFlights();

  return (
    <div className="space-y-4">
      {/* Filter Options */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Flights ({blockSeats.length + flights.length})
        </button>
        <button
          onClick={() => setFilter('guaranteed')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'guaranteed' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Guaranteed Seats ({blockSeats.length})
        </button>
        <button
          onClick={() => setFilter('direct')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'direct' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Direct Only
        </button>
      </div>

      {/* Flight Results */}
      {filteredFlights.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No flights found matching your criteria
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFlights.map((flight) => {
            const isBlockSeat = blockSeats.some(bs => bs.id === flight.id);
            const isSelected = selectedFlightId === flight.id;
            
            return (
              <div
                key={flight.id}
                onClick={() => onSelect(flight)}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {isBlockSeat && (
                  <div className="mb-2">
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                      GUARANTEED BLOCK SEAT
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center">
                        <Plane className="h-5 w-5 text-gray-600 mr-2" />
                        <div>
                          <p className="font-semibold">{flight.airline}</p>
                          <p className="text-sm text-gray-600">{flight.flightNumber}</p>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{getStopsText(flight.stops)}</span>
                        {flight.aircraft && (
                          <span className="ml-2">• {flight.aircraft}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-lg font-bold">{flight.departure.time}</p>
                        <p className="text-sm text-gray-600">{flight.departure.airport}</p>
                        {flight.departure.terminal && (
                          <p className="text-xs text-gray-500">{flight.departure.terminal}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center text-gray-400">
                        <div className="w-20 border-t border-gray-300"></div>
                        <div className="mx-2">
                          <Clock className="h-4 w-4" />
                          <p className="text-xs mt-1">{flight.duration}</p>
                        </div>
                        <div className="w-20 border-t border-gray-300"></div>
                      </div>
                      
                      <div>
                        <p className="text-lg font-bold">{flight.arrival.time}</p>
                        <p className="text-sm text-gray-600">{flight.arrival.airport}</p>
                        {flight.arrival.terminal && (
                          <p className="text-xs text-gray-500">{flight.arrival.terminal}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right ml-6">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatPrice(flight.price.amount, flight.price.currency)}
                    </p>
                    <p className="text-sm text-gray-600">
                      for {adults + children + infants} {adults + children + infants === 1 ? 'passenger' : 'passengers'}
                    </p>
                    {flight.availableSeats && flight.availableSeats < 10 && (
                      <p className="text-xs text-orange-600 mt-1">
                        Only {flight.availableSeats} seats left
                      </p>
                    )}
                    {isSelected && (
                      <div className="mt-2">
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          SELECTED
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}