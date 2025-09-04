import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET single package details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const packageData = await prisma.package.findUnique({
      where: { id },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            countryId: true,
            country: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        departureFlight: {
          select: {
            flightNumber: true,
            departureTime: true,
            arrivalTime: true,
            originCity: {
              select: {
                name: true
              }
            },
            destinationCity: {
              select: {
                name: true
              }
            }
          }
        },
        returnFlight: {
          select: {
            flightNumber: true,
            departureTime: true,
            arrivalTime: true,
            originCity: {
              select: {
                name: true
              }
            },
            destinationCity: {
              select: {
                name: true
              }
            }
          }
        },
        hotel: {
          select: {
            name: true,
            address: true,
            rating: true,
            amenities: true
          }
        },
        packagePrices: {
          orderBy: [
            { adults: 'asc' },
            { children: 'asc' }
          ]
        }
      }
    });

    if (!packageData) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(packageData);
  } catch (error) {
    console.error('Error fetching package:', error);
    return NextResponse.json(
      { error: 'Failed to fetch package' },
      { status: 500 }
    );
  }
}

// PUT update package
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      shortDescription,
      cityId,
      nights,
      basePrice,
      maxOccupancy,
      availableFrom,
      availableTo,
      includesTransfer,
      featured,
      active,
      flightId,
      hotelId,
      flightBlockIds,
      hotelIds,
      departureFlightId,
      returnFlightId,
      transferId,
      roomId,
      flightPrice,
      hotelPrice,
      serviceCharge,
      profitMargin,
      highlights,
      primaryImage,
      planAndProgram,
      whatIsIncluded,
      usefulInformation,
      info
    } = body;

    const updatedPackage = await prisma.package.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(shortDescription !== undefined && { shortDescription }),
        ...(cityId && { cityId }),
        ...(nights && { nights }),
        ...(basePrice !== undefined && { basePrice }),
        ...(maxOccupancy && { maxOccupancy }),
        ...(availableFrom && { availableFrom: new Date(availableFrom) }),
        ...(availableTo && { availableTo: new Date(availableTo) }),
        ...(includesTransfer !== undefined && { includesTransfer }),
        ...(featured !== undefined && { featured }),
        ...(active !== undefined && { active }),
        ...(departureFlightId && { departureFlightId }),
        ...(returnFlightId && { returnFlightId }),
        ...(hotelId && { hotelId }),
        ...(transferId !== undefined && { transferId }),
        ...(roomId !== undefined && { roomId }),
        ...(serviceCharge !== undefined && { serviceCharge }),
        ...(profitMargin !== undefined && { profitMargin }),
        ...(highlights !== undefined && { highlights }),
        ...(primaryImage !== undefined && { primaryImage }),
        ...(planAndProgram !== undefined && { planAndProgram }),
        ...(whatIsIncluded !== undefined && { whatIsIncluded }),
        ...(usefulInformation !== undefined && { usefulInformation }),
        ...(info !== undefined && { info }),
        // Store the arrays of flight blocks and hotels as JSON
        ...(flightBlockIds !== undefined && { flightBlockIds }),
        ...(hotelIds !== undefined && { hotelIds })
      }
    });

    return NextResponse.json(updatedPackage);
  } catch (error) {
    console.error('Error updating package:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update package', details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE package
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete associated price calculations first
    await prisma.packagePrice.deleteMany({
      where: { packageId: id }
    });

    // Delete the package
    await prisma.package.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json(
      { error: 'Failed to delete package' },
      { status: 500 }
    );
  }
}