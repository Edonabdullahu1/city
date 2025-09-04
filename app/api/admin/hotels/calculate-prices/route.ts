import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const cityId = searchParams.get('cityId');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const adults = parseInt(searchParams.get('adults') || '2');
    const childAgesParam = searchParams.get('childAges') || '';
    const childAges = childAgesParam ? childAgesParam.split(',').map(a => parseInt(a)) : [];

    if (!cityId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'City, check-in, and check-out dates are required' },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }

    // Fetch hotels in the city with their pricing data
    const hotels = await prisma.hotel.findMany({
      where: {
        cityId,
        active: true
      },
      include: {
        hotelPrices: {
          where: {
            fromDate: { lte: checkInDate },
            tillDate: { gte: checkOutDate }
          },
          orderBy: {
            double: 'asc' // Order by price to get cheapest options first
          }
        }
      }
    });

    const calculations = hotels.map(hotel => {
      const calculation: any = {
        hotelId: hotel.id,
        hotelName: hotel.name,
        starRating: hotel.rating,
        nights,
        availability: false,
        message: 'No pricing available for selected dates'
      };

      if (hotel.hotelPrices.length === 0) {
        return calculation;
      }

      // Get the first (cheapest) available price
      const price = hotel.hotelPrices[0];
      
      // Calculate adult pricing based on occupancy
      let adultPrice = 0;
      let pricePerNight = 0;
      
      if (adults === 1) {
        // Single occupancy
        pricePerNight = Number(price.single);
        adultPrice = pricePerNight * nights;
      } else if (adults === 2) {
        // Double occupancy
        pricePerNight = Number(price.double);
        adultPrice = pricePerNight * nights;
      } else if (adults === 3) {
        // Triple occupancy (double + extra bed)
        pricePerNight = Number(price.double) + Number(price.extraBed);
        adultPrice = pricePerNight * nights;
      }

      // Calculate children pricing
      let childrenPrice = 0;
      const childPrices: any[] = [];
      
      childAges.forEach(age => {
        // Parse the paying kids age range (e.g., "7-11")
        const ageRange = price.payingKidsAge || '';
        const [minAge, maxAge] = ageRange.split('-').map(a => parseInt(a) || 0);
        
        if (age >= minAge && age <= maxAge && minAge > 0) {
          // Child is in paying age range
          const childPricePerNight = Number(price.paymentKids);
          const childTotal = childPricePerNight * nights;
          childrenPrice += childTotal;
          childPrices.push({
            age,
            price: childTotal,
            reason: `Ages ${ageRange}: €${childPricePerNight}/night`
          });
        } else if (age < minAge) {
          // Child is free
          childPrices.push({
            age,
            price: 0,
            reason: `Free (under ${minAge})`
          });
        } else {
          // Child above max age might be counted as adult or extra bed
          const childPricePerNight = Number(price.extraBed);
          const childTotal = childPricePerNight * nights;
          childrenPrice += childTotal;
          childPrices.push({
            age,
            price: childTotal,
            reason: `Extra bed: €${childPricePerNight}/night`
          });
        }
      });

      const totalPrice = adultPrice + childrenPrice;

      return {
        hotelId: hotel.id,
        hotelName: hotel.name,
        starRating: hotel.rating,
        board: price.board,
        roomType: price.roomType,
        nights,
        basePrice: Number(price.double),
        adultPrice,
        childrenPrice,
        totalPrice,
        priceBreakdown: {
          pricePerNight,
          singlePrice: Number(price.single),
          doublePrice: Number(price.double),
          extraBedPrice: Number(price.extraBed),
          childPrices
        },
        availability: true
      };
    }).filter(calc => calc.availability); // Only return hotels with available pricing

    // Sort by total price
    calculations.sort((a, b) => a.totalPrice - b.totalPrice);

    return NextResponse.json({ 
      calculations,
      summary: {
        checkIn: checkInDate.toISOString().split('T')[0],
        checkOut: checkOutDate.toISOString().split('T')[0],
        nights,
        adults,
        children: childAges.length,
        totalHotels: calculations.length
      }
    });
  } catch (error) {
    console.error('Error calculating hotel prices:', error);
    return NextResponse.json(
      { error: 'Failed to calculate hotel prices' },
      { status: 500 }
    );
  }
}