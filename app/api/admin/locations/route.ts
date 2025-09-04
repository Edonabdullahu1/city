import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, return mock data since we don't have a Location model in the database yet
    const mockLocations = [
      { id: '1', code: 'BCN', name: 'Barcelona', country: 'Spain', type: 'CITY', description: 'Beautiful coastal city', active: true, createdAt: new Date().toISOString() },
      { id: '2', code: 'MAD', name: 'Madrid', country: 'Spain', type: 'CITY', description: 'Capital of Spain', active: true, createdAt: new Date().toISOString() },
      { id: '3', code: 'ROM', name: 'Rome', country: 'Italy', type: 'CITY', description: 'Eternal city', active: true, createdAt: new Date().toISOString() },
      { id: '4', code: 'PAR', name: 'Paris', country: 'France', type: 'CITY', description: 'City of lights', active: true, createdAt: new Date().toISOString() },
      { id: '5', code: 'LON', name: 'London', country: 'United Kingdom', type: 'CITY', description: 'Historic capital', active: true, createdAt: new Date().toISOString() },
      { id: '6', code: 'AMS', name: 'Amsterdam', country: 'Netherlands', type: 'CITY', description: 'City of canals', active: true, createdAt: new Date().toISOString() },
      { id: '7', code: 'TIA', name: 'Tirana International Airport', country: 'Albania', type: 'AIRPORT', description: 'Main airport of Albania', active: true, createdAt: new Date().toISOString() },
      { id: '8', code: 'BCN', name: 'Barcelona Airport', country: 'Spain', type: 'AIRPORT', description: 'El Prat Airport', active: true, createdAt: new Date().toISOString() },
      { id: '9', code: 'FCO', name: 'Rome Fiumicino', country: 'Italy', type: 'AIRPORT', description: 'Leonardo da Vinci Airport', active: true, createdAt: new Date().toISOString() },
      { id: '10', code: 'CDG', name: 'Charles de Gaulle', country: 'France', type: 'AIRPORT', description: 'Paris main airport', active: true, createdAt: new Date().toISOString() },
    ];

    return NextResponse.json({ locations: mockLocations });
  } catch (error) {
    console.error('Locations fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, country, type, description, active } = body;

    // Validate required fields
    if (!code || !name || !country || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For now, just return the created location (mock)
    const newLocation = {
      id: Date.now().toString(),
      code: code.toUpperCase(),
      name,
      country,
      type,
      description: description || '',
      active: active !== false,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json(newLocation, { status: 201 });
  } catch (error) {
    console.error('Location creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    );
  }
}