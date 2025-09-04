import { NextRequest, NextResponse } from 'next/server';
import { FlightSearchService } from '@/lib/services/flightSearch';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const departureDate = searchParams.get('departureDate');
    const returnDate = searchParams.get('returnDate');
    const passengers = searchParams.get('passengers');
    const tripType = searchParams.get('tripType') as 'oneway' | 'roundtrip';
    const cabinClass = searchParams.get('cabinClass') as 'economy' | 'business' | 'first';

    if (!origin || !destination || !departureDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Search for flights
    let flights = await FlightSearchService.searchFlights({
      origin,
      destination,
      departureDate,
      returnDate: returnDate || undefined,
      passengers: parseInt(passengers || '1'),
      tripType: tripType || 'oneway',
      cabinClass: cabinClass || 'economy'
    });

    // If no flights found and SerpAPI is not configured, return mock data
    if (flights.length === 0 && (!process.env.SERPAPI_KEY || process.env.SERPAPI_KEY === 'your_serpapi_key_here')) {
      flights = FlightSearchService.getMockFlights({
        origin,
        destination,
        departureDate,
        returnDate: returnDate || undefined,
        passengers: parseInt(passengers || '1'),
        tripType: tripType || 'oneway',
        cabinClass: cabinClass || 'economy'
      });
    }

    return NextResponse.json({ 
      flights,
      meta: {
        totalResults: flights.length,
        searchParams: {
          origin,
          destination,
          departureDate,
          returnDate,
          passengers: parseInt(passengers || '1'),
          tripType,
          cabinClass
        }
      }
    });
  } catch (error) {
    console.error('Error searching flights:', error);
    return NextResponse.json(
      { error: 'Failed to search flights' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      tripType,
      cabinClass
    } = body;

    if (!origin || !destination || !departureDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Search for flights
    let flights = await FlightSearchService.searchFlights({
      origin,
      destination,
      departureDate,
      returnDate,
      passengers: passengers || 1,
      tripType: tripType || 'oneway',
      cabinClass: cabinClass || 'economy'
    });

    // If no flights found and SerpAPI is not configured, return mock data
    if (flights.length === 0 && (!process.env.SERPAPI_KEY || process.env.SERPAPI_KEY === 'your_serpapi_key_here')) {
      flights = FlightSearchService.getMockFlights({
        origin,
        destination,
        departureDate,
        returnDate,
        passengers: passengers || 1,
        tripType: tripType || 'oneway',
        cabinClass: cabinClass || 'economy'
      });
    }

    return NextResponse.json({ 
      flights,
      meta: {
        totalResults: flights.length,
        searchParams: body,
        usingMockData: flights.length > 0 && (!process.env.SERPAPI_KEY || process.env.SERPAPI_KEY === 'your_serpapi_key_here')
      }
    });
  } catch (error) {
    console.error('Error searching flights:', error);
    return NextResponse.json(
      { error: 'Failed to search flights' },
      { status: 500 }
    );
  }
}