import prisma from '@/lib/prisma';

interface HotelSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  infants?: number;
  rooms?: number;
}

interface HotelRoom {
  id: string;
  type: string;
  maxOccupancy: number;
  pricePerNight: number;
  available: number;
  amenities: string[];
}

interface HotelResult {
  id: string;
  name: string;
  rating: number;
  stars: number;
  address: string;
  city: string;
  description: string;
  images: string[];
  amenities: string[];
  rooms: HotelRoom[];
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  cancellationPolicy: string;
  breakfast: boolean;
  distanceFromCenter: number;
}

export class HotelService {
  /**
   * Search for hotels in a destination
   */
  static async searchHotels(params: HotelSearchParams): Promise<HotelResult[]> {
    // Calculate number of nights
    const checkInDate = new Date(params.checkIn);
    const checkOutDate = new Date(params.checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // For now, return mock data
    // In production, this would query the database or external API
    return this.getMockHotels(params, nights);
  }

  /**
   * Get mock hotel data for development
   */
  static getMockHotels(params: HotelSearchParams, nights: number): HotelResult[] {
    const hotels: HotelResult[] = [
      {
        id: 'HTL001',
        name: 'Grand Hotel Plaza',
        rating: 4.8,
        stars: 5,
        address: '123 Main Street',
        city: params.destination,
        description: 'Luxury hotel in the heart of the city with panoramic views',
        images: ['/images/hotel1.jpg'],
        amenities: ['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'Room Service', 'Parking'],
        rooms: [
          {
            id: 'ROOM001',
            type: 'Deluxe Double',
            maxOccupancy: 2,
            pricePerNight: 180,
            available: 5,
            amenities: ['King Bed', 'City View', 'Mini Bar', 'Safe']
          },
          {
            id: 'ROOM002',
            type: 'Executive Suite',
            maxOccupancy: 4,
            pricePerNight: 350,
            available: 2,
            amenities: ['King Bed', 'Living Room', 'Panoramic View', 'Jacuzzi']
          }
        ],
        pricePerNight: 180,
        totalPrice: 180 * nights,
        currency: 'EUR',
        cancellationPolicy: 'Free cancellation up to 24 hours before check-in',
        breakfast: true,
        distanceFromCenter: 0.5
      },
      {
        id: 'HTL002',
        name: 'City View Hotel',
        rating: 4.5,
        stars: 4,
        address: '456 Park Avenue',
        city: params.destination,
        description: 'Modern hotel with excellent facilities near major attractions',
        images: ['/images/hotel2.jpg'],
        amenities: ['WiFi', 'Gym', 'Restaurant', 'Bar', 'Business Center'],
        rooms: [
          {
            id: 'ROOM003',
            type: 'Standard Room',
            maxOccupancy: 2,
            pricePerNight: 95,
            available: 10,
            amenities: ['Queen Bed', 'Work Desk', 'Coffee Maker']
          },
          {
            id: 'ROOM004',
            type: 'Family Room',
            maxOccupancy: 4,
            pricePerNight: 145,
            available: 6,
            amenities: ['Two Double Beds', 'Sitting Area', 'Mini Fridge']
          }
        ],
        pricePerNight: 95,
        totalPrice: 95 * nights,
        currency: 'EUR',
        cancellationPolicy: 'Free cancellation up to 48 hours before check-in',
        breakfast: true,
        distanceFromCenter: 1.2
      },
      {
        id: 'HTL003',
        name: 'Budget Inn Express',
        rating: 4.0,
        stars: 3,
        address: '789 Station Road',
        city: params.destination,
        description: 'Comfortable and affordable accommodation with easy transport links',
        images: ['/images/hotel3.jpg'],
        amenities: ['WiFi', 'Parking', 'Continental Breakfast'],
        rooms: [
          {
            id: 'ROOM005',
            type: 'Economy Room',
            maxOccupancy: 2,
            pricePerNight: 65,
            available: 15,
            amenities: ['Double Bed', 'TV', 'Shower']
          },
          {
            id: 'ROOM006',
            type: 'Triple Room',
            maxOccupancy: 3,
            pricePerNight: 85,
            available: 8,
            amenities: ['One Double + One Single Bed', 'TV']
          }
        ],
        pricePerNight: 65,
        totalPrice: 65 * nights,
        currency: 'EUR',
        cancellationPolicy: 'Non-refundable rate',
        breakfast: false,
        distanceFromCenter: 2.5
      },
      {
        id: 'HTL004',
        name: 'Boutique Art Hotel',
        rating: 4.6,
        stars: 4,
        address: '321 Gallery Lane',
        city: params.destination,
        description: 'Stylish boutique hotel with unique art collection and personalized service',
        images: ['/images/hotel4.jpg'],
        amenities: ['WiFi', 'Art Gallery', 'Rooftop Bar', 'Concierge', 'Pet Friendly'],
        rooms: [
          {
            id: 'ROOM007',
            type: 'Artist Room',
            maxOccupancy: 2,
            pricePerNight: 125,
            available: 7,
            amenities: ['Queen Bed', 'Original Artwork', 'Balcony']
          },
          {
            id: 'ROOM008',
            type: 'Designer Suite',
            maxOccupancy: 2,
            pricePerNight: 195,
            available: 3,
            amenities: ['King Bed', 'Separate Living Area', 'Terrace']
          }
        ],
        pricePerNight: 125,
        totalPrice: 125 * nights,
        currency: 'EUR',
        cancellationPolicy: 'Free cancellation up to 72 hours before check-in',
        breakfast: true,
        distanceFromCenter: 0.8
      },
      {
        id: 'HTL005',
        name: 'Airport Transit Hotel',
        rating: 3.8,
        stars: 3,
        address: '555 Airport Road',
        city: params.destination,
        description: 'Convenient hotel near the airport with shuttle service',
        images: ['/images/hotel5.jpg'],
        amenities: ['WiFi', 'Airport Shuttle', 'Restaurant', '24h Reception'],
        rooms: [
          {
            id: 'ROOM009',
            type: 'Transit Room',
            maxOccupancy: 1,
            pricePerNight: 55,
            available: 20,
            amenities: ['Single Bed', 'Desk', 'Soundproofing']
          },
          {
            id: 'ROOM010',
            type: 'Standard Double',
            maxOccupancy: 2,
            pricePerNight: 75,
            available: 12,
            amenities: ['Double Bed', 'Work Area', 'Coffee/Tea']
          }
        ],
        pricePerNight: 55,
        totalPrice: 55 * nights,
        currency: 'EUR',
        cancellationPolicy: 'Free cancellation up to 6 hours before check-in',
        breakfast: false,
        distanceFromCenter: 8.0
      }
    ];

    // Sort by rating by default
    return hotels.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Check hotel availability
   */
  static async checkAvailability(
    hotelId: string,
    checkIn: string,
    checkOut: string,
    rooms: number = 1
  ): Promise<{
    available: boolean;
    roomsAvailable: number;
    price?: number;
  }> {
    // In production, this would check actual inventory
    // For now, return mock availability
    return {
      available: true,
      roomsAvailable: Math.floor(Math.random() * 10) + 1,
      price: 150 + Math.random() * 200
    };
  }

  /**
   * Reserve hotel rooms
   */
  static async reserveRooms(
    hotelId: string,
    roomId: string,
    checkIn: string,
    checkOut: string,
    guests: number
  ): Promise<{
    success: boolean;
    confirmationNumber?: string;
    error?: string;
  }> {
    try {
      // Generate confirmation number
      const confirmationNumber = `HTL${Date.now().toString(36).toUpperCase()}`;
      
      // In production, this would create actual reservation
      return {
        success: true,
        confirmationNumber
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to reserve rooms'
      };
    }
  }

  /**
   * Get hotel details by ID
   */
  static async getHotelById(hotelId: string): Promise<HotelResult | null> {
    // In production, fetch from database
    const mockHotels = this.getMockHotels({ 
      destination: 'Paris',
      checkIn: new Date().toISOString(),
      checkOut: new Date(Date.now() + 86400000).toISOString(),
      adults: 2 
    }, 1);
    
    return mockHotels.find(h => h.id === hotelId) || null;
  }

  /**
   * Calculate total price including taxes and fees
   */
  static calculateTotalPrice(
    basePrice: number,
    nights: number,
    rooms: number = 1,
    includeTax: boolean = true
  ): number {
    let total = basePrice * nights * rooms;
    
    if (includeTax) {
      // Add 10% tax
      total *= 1.1;
      // Add city tax (€2 per night per room)
      total += (2 * nights * rooms);
    }
    
    return Math.round(total * 100) / 100;
  }
}