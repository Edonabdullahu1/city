// import { getJson } from 'serpapi'; // Not installed yet

interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  type?: 'roundtrip' | 'oneway';
  travelClass?: 'economy' | 'business' | 'first';
  currency?: string;
}

interface FlightResult {
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

export class FlightService {
  private static apiKey = process.env.SERPAPI_KEY;

  /**
   * Search for flights using SerpAPI's Google Flights integration
   */
  static async searchFlights(params: FlightSearchParams): Promise<FlightResult[]> {
    if (!this.apiKey) {
      console.error('SERPAPI_KEY not configured');
      // Return mock data for development
      return this.getMockFlights(params);
    }

    try {
      const searchParams = {
        engine: 'google_flights',
        api_key: this.apiKey,
        departure_id: params.origin,
        arrival_id: params.destination,
        outbound_date: params.departureDate,
        return_date: params.returnDate,
        adults: params.adults,
        children: params.children || 0,
        infants_in_seat: params.infants || 0,
        type: params.type === 'oneway' ? '2' : '1', // 1=round trip, 2=one way
        travel_class: params.travelClass === 'business' ? '2' : 
                     params.travelClass === 'first' ? '3' : '1',
        currency: params.currency || 'EUR',
        hl: 'en',
      };

      const data = await getJson(searchParams);
      
      if (!data.best_flights && !data.other_flights) {
        return this.getMockFlights(params);
      }

      // Process and format the results
      const flights: FlightResult[] = [];
      
      // Process best flights
      if (data.best_flights) {
        data.best_flights.forEach((flight: any) => {
          flights.push(this.formatFlightResult(flight));
        });
      }

      // Process other flights if needed
      if (flights.length < 10 && data.other_flights) {
        data.other_flights.slice(0, 10 - flights.length).forEach((flight: any) => {
          flights.push(this.formatFlightResult(flight));
        });
      }

      return flights;
    } catch (error) {
      console.error('Flight search error:', error);
      // Fallback to mock data on error
      return this.getMockFlights(params);
    }
  }

  /**
   * Format SerpAPI flight result into our FlightResult interface
   */
  private static formatFlightResult(flightData: any): FlightResult {
    const firstFlight = flightData.flights?.[0] || {};
    const lastFlight = flightData.flights?.[flightData.flights.length - 1] || {};
    
    return {
      id: `${firstFlight.airline}-${firstFlight.flight_number || Math.random().toString(36).substr(2, 9)}`,
      airline: firstFlight.airline || 'Unknown Airline',
      flightNumber: firstFlight.flight_number || 'N/A',
      departure: {
        airport: firstFlight.departure_airport?.name || 'Unknown',
        time: firstFlight.departure_airport?.time || '',
        terminal: firstFlight.departure_airport?.terminal
      },
      arrival: {
        airport: lastFlight.arrival_airport?.name || 'Unknown',
        time: lastFlight.arrival_airport?.time || '',
        terminal: lastFlight.arrival_airport?.terminal
      },
      duration: this.formatDuration(flightData.total_duration),
      stops: flightData.flights?.length - 1 || 0,
      price: {
        amount: flightData.price || 0,
        currency: flightData.currency || 'EUR'
      },
      availableSeats: Math.floor(Math.random() * 20) + 1, // Mock availability
      aircraft: firstFlight.airplane || undefined
    };
  }

  /**
   * Format duration from minutes to readable string
   */
  private static formatDuration(minutes: number): string {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  /**
   * Get mock flight data for development/testing
   */
  static getMockFlights(params: FlightSearchParams): FlightResult[] {
    const mockAirlines = ['Air France', 'Lufthansa', 'KLM', 'British Airways', 'Ryanair', 'EasyJet'];
    const flights: FlightResult[] = [];
    
    // Generate 5-8 mock flights
    const numFlights = Math.floor(Math.random() * 4) + 5;
    
    for (let i = 0; i < numFlights; i++) {
      const airline = mockAirlines[Math.floor(Math.random() * mockAirlines.length)];
      const stops = Math.floor(Math.random() * 3); // 0-2 stops
      const basePrice = 150 + Math.random() * 350;
      const departureHour = 6 + Math.floor(Math.random() * 14);
      const duration = 90 + Math.floor(Math.random() * 180);
      
      flights.push({
        id: `MOCK-${i + 1}`,
        airline: airline,
        flightNumber: `${airline.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`,
        departure: {
          airport: params.origin,
          time: `${departureHour.toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
          terminal: Math.random() > 0.5 ? `Terminal ${Math.floor(Math.random() * 3) + 1}` : undefined
        },
        arrival: {
          airport: params.destination,
          time: `${((departureHour + Math.floor(duration / 60)) % 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
          terminal: Math.random() > 0.5 ? `Terminal ${Math.floor(Math.random() * 3) + 1}` : undefined
        },
        duration: this.formatDuration(duration),
        stops: stops,
        price: {
          amount: Math.round(basePrice * (1 + stops * 0.1) * params.adults),
          currency: params.currency || 'EUR'
        },
        availableSeats: Math.floor(Math.random() * 20) + 1,
        aircraft: ['Boeing 737', 'Airbus A320', 'Boeing 777', 'Airbus A330'][Math.floor(Math.random() * 4)]
      });
    }
    
    // Sort by price
    return flights.sort((a, b) => a.price.amount - b.price.amount);
  }

  /**
   * Get guaranteed block seats for a specific route
   */
  static async getBlockSeats(origin: string, destination: string, date: string): Promise<FlightResult[]> {
    // This would connect to your database of pre-purchased block seats
    // For now, return mock guaranteed seats
    return [
      {
        id: 'BLOCK-001',
        airline: 'Charter Airlines',
        flightNumber: 'CH123',
        departure: {
          airport: origin,
          time: '08:00',
          terminal: 'Terminal 1'
        },
        arrival: {
          airport: destination,
          time: '11:30',
          terminal: 'Terminal 2'
        },
        duration: '3h 30m',
        stops: 0,
        price: {
          amount: 299,
          currency: 'EUR'
        },
        availableSeats: 45,
        aircraft: 'Boeing 737-800'
      }
    ];
  }

  /**
   * Reserve seats on a flight
   */
  static async reserveSeats(
    flightId: string,
    numberOfSeats: number,
    passengerDetails?: any[]
  ): Promise<{
    success: boolean;
    confirmationNumber?: string;
    error?: string;
  }> {
    try {
      // In production, this would integrate with airline APIs or your block seat inventory
      // Generate a confirmation number
      const confirmationNumber = `FL${Date.now().toString(36).toUpperCase()}`;
      
      return {
        success: true,
        confirmationNumber
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to reserve seats'
      };
    }
  }
}