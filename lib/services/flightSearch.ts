import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  tripType: 'oneway' | 'roundtrip';
  cabinClass?: 'economy' | 'business' | 'first';
}

export interface FlightResult {
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  currency: string;
  stops: number;
  isBlockSeat: boolean;
  availableSeats?: number;
  serpApiData?: any;
}

export class FlightSearchService {
  private static readonly SERPAPI_KEY = process.env.SERPAPI_KEY;
  private static readonly SERPAPI_BASE_URL = 'https://serpapi.com/search';

  /**
   * Search for flights using both guaranteed block seats and dynamic SerpAPI
   */
  static async searchFlights(params: FlightSearchParams): Promise<FlightResult[]> {
    const results: FlightResult[] = [];

    // First, search guaranteed block seats from database
    const blockSeats = await this.searchBlockSeats(params);
    results.push(...blockSeats);

    // Then, search dynamic flights via SerpAPI if enabled
    if (this.SERPAPI_KEY && this.SERPAPI_KEY !== 'your_serpapi_key_here') {
      try {
        const dynamicFlights = await this.searchDynamicFlights(params);
        results.push(...dynamicFlights);
      } catch (error) {
        console.error('SerpAPI search failed:', error);
        // Continue with just block seats if SerpAPI fails
      }
    }

    // Sort by price
    return results.sort((a, b) => a.price - b.price);
  }

  /**
   * Search guaranteed block seats from database
   */
  private static async searchBlockSeats(params: FlightSearchParams): Promise<FlightResult[]> {
    const flights = await prisma.flight.findMany({
      where: {
        origin: {
          contains: params.origin,
          mode: 'insensitive'
        },
        destination: {
          contains: params.destination,
          mode: 'insensitive'
        },
        departureTime: {
          gte: new Date(params.departureDate),
          lt: new Date(new Date(params.departureDate).getTime() + 24 * 60 * 60 * 1000)
        },
        availableSeats: {
          gte: params.passengers
        },
        isBlockSeat: true
      }
    });

    return flights.map(flight => ({
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      origin: flight.origin,
      destination: flight.destination,
      departureTime: flight.departureTime.toISOString(),
      arrivalTime: flight.arrivalTime.toISOString(),
      duration: this.calculateDuration(flight.departureTime, flight.arrivalTime),
      price: flight.pricePerSeat / 100,
      currency: 'EUR',
      stops: 0,
      isBlockSeat: true,
      availableSeats: flight.availableSeats
    }));
  }

  /**
   * Search dynamic flights via SerpAPI
   */
  private static async searchDynamicFlights(params: FlightSearchParams): Promise<FlightResult[]> {
    if (!this.SERPAPI_KEY) {
      return [];
    }

    const searchParams = new URLSearchParams({
      api_key: this.SERPAPI_KEY,
      engine: 'google_flights',
      departure_id: params.origin,
      arrival_id: params.destination,
      outbound_date: params.departureDate,
      ...(params.returnDate && { return_date: params.returnDate }),
      currency: 'EUR',
      hl: 'en',
      adults: params.passengers.toString(),
      type: params.tripType === 'roundtrip' ? '1' : '2',
      ...(params.cabinClass && { travel_class: params.cabinClass })
    });

    try {
      const response = await fetch(`${this.SERPAPI_BASE_URL}?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`SerpAPI request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.best_flights && !data.other_flights) {
        return [];
      }

      const allFlights = [
        ...(data.best_flights || []),
        ...(data.other_flights || [])
      ];

      return allFlights.map((flight: any) => this.parseSerpApiFlights(flight));
    } catch (error) {
      console.error('Error fetching flights from SerpAPI:', error);
      return [];
    }
  }

  /**
   * Parse SerpAPI flight data
   */
  private static parseSerpApiFlights(serpFlight: any): FlightResult {
    const firstLeg = serpFlight.flights?.[0] || {};
    
    return {
      airline: firstLeg.airline || 'Unknown Airline',
      flightNumber: firstLeg.flight_number || 'N/A',
      origin: firstLeg.departure_airport?.id || '',
      destination: firstLeg.arrival_airport?.id || '',
      departureTime: firstLeg.departure_airport?.time || '',
      arrivalTime: firstLeg.arrival_airport?.time || '',
      duration: this.formatDuration(serpFlight.total_duration || 0),
      price: serpFlight.price || 0,
      currency: 'EUR',
      stops: serpFlight.flights?.length - 1 || 0,
      isBlockSeat: false,
      serpApiData: serpFlight
    };
  }

  /**
   * Book a flight (either block seat or dynamic)
   */
  static async bookFlight({
    bookingId,
    flightData,
    passengers
  }: {
    bookingId: string;
    flightData: FlightResult;
    passengers: number;
  }) {
    if (flightData.isBlockSeat) {
      // Book from guaranteed block seats
      const flight = await prisma.flight.findFirst({
        where: {
          flightNumber: flightData.flightNumber,
          departureTime: new Date(flightData.departureTime)
        }
      });

      if (!flight) {
        throw new Error('Flight not found');
      }

      if (flight.availableSeats < passengers) {
        throw new Error('Not enough seats available');
      }

      // Update available seats
      await prisma.flight.update({
        where: { id: flight.id },
        data: {
          availableSeats: {
            decrement: passengers
          }
        }
      });

      // Create flight booking
      const flightBooking = await prisma.flightBooking.create({
        data: {
          bookingId,
          flightId: flight.id,
          flightNumber: flight.flightNumber,
          origin: flight.origin,
          destination: flight.destination,
          departureDate: flight.departureTime,
          passengers,
          class: 'Economy',
          price: flight.pricePerSeat,
          isBlockSeat: true,
          bookingNumber: `FLT-${Date.now().toString(36).toUpperCase()}`
        }
      });

      return flightBooking;
    } else {
      // Book dynamic flight (store SerpAPI data)
      const flightBooking = await prisma.flightBooking.create({
        data: {
          bookingId,
          flightNumber: flightData.flightNumber,
          origin: flightData.origin,
          destination: flightData.destination,
          departureDate: new Date(flightData.departureTime),
          passengers,
          class: 'Economy',
          price: Math.round(flightData.price * 100),
          isBlockSeat: false,
          serpApiData: flightData.serpApiData,
          bookingNumber: `DYN-${Date.now().toString(36).toUpperCase()}`
        }
      });

      return flightBooking;
    }
  }

  /**
   * Calculate duration between two dates
   */
  private static calculateDuration(departure: Date, arrival: Date): string {
    const diff = arrival.getTime() - departure.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  /**
   * Format duration from minutes
   */
  private static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  /**
   * Get mock flight data for testing (when SerpAPI is not configured)
   */
  static getMockFlights(params: FlightSearchParams): FlightResult[] {
    const mockFlights: FlightResult[] = [
      {
        airline: 'Albanian Airlines',
        flightNumber: 'AA123',
        origin: params.origin,
        destination: params.destination,
        departureTime: `${params.departureDate}T08:00:00Z`,
        arrivalTime: `${params.departureDate}T10:30:00Z`,
        duration: '2h 30m',
        price: 125,
        currency: 'EUR',
        stops: 0,
        isBlockSeat: false
      },
      {
        airline: 'European Express',
        flightNumber: 'EE456',
        origin: params.origin,
        destination: params.destination,
        departureTime: `${params.departureDate}T14:00:00Z`,
        arrivalTime: `${params.departureDate}T16:45:00Z`,
        duration: '2h 45m',
        price: 189,
        currency: 'EUR',
        stops: 1,
        isBlockSeat: false
      },
      {
        airline: 'Sky Connect',
        flightNumber: 'SC789',
        origin: params.origin,
        destination: params.destination,
        departureTime: `${params.departureDate}T19:00:00Z`,
        arrivalTime: `${params.departureDate}T21:15:00Z`,
        duration: '2h 15m',
        price: 215,
        currency: 'EUR',
        stops: 0,
        isBlockSeat: false
      }
    ];

    return mockFlights;
  }
}