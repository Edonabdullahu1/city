import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { FlightService, GuaranteedFlight, SerpApiFlightResult } from './flightService';
import { HotelService, Hotel } from './hotelService';
import { TransferService, Transfer } from './transferService';
import { ExcursionService, Excursion } from './excursionService';
import { BookingService } from './bookingService';

const prisma = new PrismaClient();

// Input validation schemas
export const packageSearchSchema = z.object({
  origin: z.string().min(3, 'Origin must be at least 3 characters'),
  destination: z.string().min(3, 'Destination must be at least 3 characters'),
  departureDate: z.date(),
  returnDate: z.date(),
  passengers: z.number().int().min(1).max(9).default(1),
  roomOccupancy: z.number().int().min(1).max(8).default(1),
  flightClass: z.enum(['Economy', 'Premium Economy', 'Business', 'First']).default('Economy'),
  roomType: z.enum(['Single', 'Double', 'Triple', 'Suite', 'Family']).optional(),
  budget: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
  }).optional(),
});

export const createPackageBookingSchema = z.object({
  userId: z.string().uuid(),
  packageItems: z.object({
    flights: z.array(z.object({
      origin: z.string(),
      destination: z.string(),
      departureDate: z.date(),
      returnDate: z.date().optional(),
      passengers: z.number().int().min(1),
      class: z.string(),
      price: z.number().min(0),
      flightNumber: z.string().optional(),
      isBlockSeat: z.boolean().default(false),
      serpApiData: z.any().optional(),
    })),
    hotels: z.array(z.object({
      hotelName: z.string(),
      location: z.string(),
      checkIn: z.date(),
      checkOut: z.date(),
      roomType: z.string(),
      occupancy: z.number().int().min(1),
      nights: z.number().int().min(1),
      pricePerNight: z.number().min(0),
      specialRequests: z.string().optional(),
    })),
    transfers: z.array(z.object({
      fromLocation: z.string(),
      toLocation: z.string(),
      transferDate: z.date(),
      transferTime: z.string(),
      vehicleType: z.string(),
      passengers: z.number().int().min(1),
      price: z.number().min(0),
      notes: z.string().optional(),
    })),
    excursions: z.array(z.object({
      title: z.string(),
      description: z.string().optional(),
      location: z.string(),
      excursionDate: z.date(),
      excursionTime: z.string(),
      duration: z.number().int().min(30),
      participants: z.number().int().min(1),
      price: z.number().min(0),
      meetingPoint: z.string().optional(),
    })),
  }),
  totalAmount: z.number().min(0),
  currency: z.string().default('EUR'),
});

export type PackageSearchInput = z.infer<typeof packageSearchSchema>;
export type CreatePackageBookingInput = z.infer<typeof createPackageBookingSchema>;

export interface PackageComponent {
  id: string;
  type: 'flight' | 'hotel' | 'transfer' | 'excursion';
  name: string;
  price: number;
  details: any;
}

export interface TravelPackage {
  id: string;
  name: string;
  destination: string;
  duration: string; // e.g., "5 days, 4 nights"
  totalPrice: number;
  pricePerPerson: number;
  components: PackageComponent[];
  description: string;
  highlights: string[];
  includes: string[];
  excludes: string[];
  rating: number;
  reviewCount: number;
  images: string[];
  tags: string[];
}

export interface PackageSearchResult {
  packages: TravelPackage[];
  flights: {
    guaranteed: GuaranteedFlight[];
    dynamic: SerpApiFlightResult[];
  };
  hotels: Hotel[];
  transfers: Transfer[];
  excursions: Excursion[];
  searchParams: PackageSearchInput;
  totalNights: number;
  timestamp: Date;
}

// Pre-built package templates
export const PACKAGE_TEMPLATES: TravelPackage[] = [
  {
    id: 'package-001',
    name: 'Paris Weekend Getaway',
    destination: 'Paris',
    duration: '3 days, 2 nights',
    totalPrice: 450,
    pricePerPerson: 450,
    description: 'Experience the magic of Paris with this carefully curated weekend package including flights, accommodation, and guided tours.',
    highlights: ['Skip-the-line Louvre tour', 'Seine river cruise', 'Eiffel Tower visit', 'Luxury hotel stay'],
    includes: ['Return flights', '2 nights luxury hotel', 'Airport transfers', 'Guided city tour', 'Museum tickets'],
    excludes: ['Meals (except breakfast)', 'Personal expenses', 'Travel insurance'],
    rating: 4.8,
    reviewCount: 234,
    images: ['/images/packages/paris-weekend-1.jpg', '/images/packages/paris-weekend-2.jpg'],
    tags: ['Cultural', 'Romantic', 'City Break', 'Weekend'],
    components: [
      {
        id: 'gf-001',
        type: 'flight',
        name: 'London to Paris',
        price: 150,
        details: { flightNumber: 'MX101', duration: '1h 15m' },
      },
      {
        id: 'hotel-001',
        type: 'hotel',
        name: 'Grand Hotel Paris - Double Room',
        price: 280,
        details: { nights: 2, roomType: 'Double' },
      },
      {
        id: 'transfer-001',
        type: 'transfer',
        name: 'Airport to Hotel Transfer',
        price: 45,
        details: { vehicleType: 'Premium Car' },
      },
    ],
  },
  {
    id: 'package-002',
    name: 'Roman Holiday Experience',
    destination: 'Rome',
    duration: '4 days, 3 nights',
    totalPrice: 680,
    pricePerPerson: 680,
    description: 'Discover the eternal city with this comprehensive package featuring ancient monuments, Vatican tours, and authentic dining experiences.',
    highlights: ['Colosseum priority access', 'Vatican Museums tour', 'Roman Forum exploration', 'Traditional food tour'],
    includes: ['Return flights', '3 nights boutique hotel', 'Airport transfers', 'Guided historical tours', 'Museum entries'],
    excludes: ['Most meals', 'Personal expenses', 'Travel insurance', 'Spa services'],
    rating: 4.7,
    reviewCount: 189,
    images: ['/images/packages/rome-holiday-1.jpg', '/images/packages/rome-holiday-2.jpg'],
    tags: ['Historical', 'Cultural', 'City Break', 'Adventure'],
    components: [
      {
        id: 'gf-003',
        type: 'flight',
        name: 'Barcelona to Rome',
        price: 120,
        details: { flightNumber: 'MX201', duration: '1h 45m' },
      },
      {
        id: 'hotel-002',
        type: 'hotel',
        name: 'Hotel Roma Central - Double Room',
        price: 220,
        details: { nights: 3, roomType: 'Double' },
      },
      {
        id: 'excursion-003',
        type: 'excursion',
        name: 'Colosseum and Roman Forum Tour',
        price: 55,
        details: { duration: 180, category: 'Historical' },
      },
    ],
  },
  {
    id: 'package-003',
    name: 'Barcelona Beach & Culture',
    destination: 'Barcelona',
    duration: '5 days, 4 nights',
    totalPrice: 890,
    pricePerPerson: 890,
    description: 'Perfect blend of beach relaxation and cultural exploration in vibrant Barcelona with Gaudí tours and tapas experiences.',
    highlights: ['Sagrada Familia tour', 'Beach resort stay', 'Tapas and wine tasting', 'Gothic Quarter walk'],
    includes: ['Return flights', '4 nights beachfront hotel', 'Airport transfers', 'Cultural tours', 'Food experiences'],
    excludes: ['Some meals', 'Personal expenses', 'Beach equipment rental', 'Travel insurance'],
    rating: 4.9,
    reviewCount: 345,
    images: ['/images/packages/barcelona-culture-1.jpg', '/images/packages/barcelona-culture-2.jpg'],
    tags: ['Beach', 'Cultural', 'Food & Drink', 'Architecture'],
    components: [
      {
        id: 'gf-004',
        type: 'flight',
        name: 'Rome to Barcelona',
        price: 120,
        details: { flightNumber: 'MX202', duration: '1h 45m' },
      },
      {
        id: 'hotel-003',
        type: 'hotel',
        name: 'Barcelona Beach Resort - Double Room',
        price: 380,
        details: { nights: 4, roomType: 'Double' },
      },
      {
        id: 'excursion-005',
        type: 'excursion',
        name: 'Sagrada Familia and Gothic Quarter Tour',
        price: 95,
        details: { duration: 420, category: 'Cultural' },
      },
      {
        id: 'excursion-006',
        type: 'excursion',
        name: 'Tapas and Wine Tasting Tour',
        price: 85,
        details: { duration: 240, category: 'Food & Drink' },
      },
    ],
  },
  {
    id: 'package-004',
    name: 'Vienna Imperial Getaway',
    destination: 'Vienna',
    duration: '4 days, 3 nights',
    totalPrice: 780,
    pricePerPerson: 780,
    description: 'Immerse yourself in Vienna\'s imperial heritage with palace tours, classical concerts, and luxury accommodations.',
    highlights: ['Schönbrunn Palace tour', 'Danube River cruise with dinner', 'Imperial hotel stay', 'Classical music experience'],
    includes: ['Return flights', '3 nights luxury hotel', 'Airport transfers', 'Palace tours', 'Dinner cruise'],
    excludes: ['Some meals', 'Personal expenses', 'Concert tickets (optional)', 'Travel insurance'],
    rating: 4.6,
    reviewCount: 156,
    images: ['/images/packages/vienna-imperial-1.jpg', '/images/packages/vienna-imperial-2.jpg'],
    tags: ['Imperial', 'Cultural', 'Luxury', 'Music'],
    components: [
      {
        id: 'gf-005',
        type: 'flight',
        name: 'Amsterdam to Vienna',
        price: 180,
        details: { flightNumber: 'MX301', duration: '1h 45m' },
      },
      {
        id: 'hotel-004',
        type: 'hotel',
        name: 'Vienna Imperial - Double Room',
        price: 390,
        details: { nights: 3, roomType: 'Double' },
      },
      {
        id: 'excursion-007',
        type: 'excursion',
        name: 'Schönbrunn Palace and Gardens',
        price: 62,
        details: { duration: 180, category: 'Historical' },
      },
      {
        id: 'excursion-008',
        type: 'excursion',
        name: 'Danube River Cruise with Dinner',
        price: 89,
        details: { duration: 180, category: 'Entertainment' },
      },
    ],
  },
];

export class PackageService {
  /**
   * Search for travel packages and individual components
   */
  static async searchPackages(input: PackageSearchInput): Promise<PackageSearchResult> {
    const validatedInput = packageSearchSchema.parse(input);
    
    // Calculate number of nights
    const totalNights = Math.ceil(
      (validatedInput.returnDate.getTime() - validatedInput.departureDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Search individual components
    const [flightResults, hotelResults, transferResults, excursionResults] = await Promise.all([
      FlightService.searchFlights({
        origin: validatedInput.origin,
        destination: validatedInput.destination,
        departureDate: validatedInput.departureDate,
        returnDate: validatedInput.returnDate,
        passengers: validatedInput.passengers,
        class: validatedInput.flightClass,
      }),
      HotelService.searchHotels({
        location: validatedInput.destination,
        checkIn: validatedInput.departureDate,
        checkOut: validatedInput.returnDate,
        occupancy: validatedInput.roomOccupancy,
        roomType: validatedInput.roomType,
      }),
      TransferService.searchTransfers({
        fromLocation: 'Airport',
        toLocation: validatedInput.destination,
        transferDate: validatedInput.departureDate,
        transferTime: '10:00',
        passengers: validatedInput.passengers,
      }),
      ExcursionService.searchExcursions({
        location: validatedInput.destination,
        excursionDate: validatedInput.departureDate,
        participants: validatedInput.passengers,
      }),
    ]);

    // Filter pre-built packages based on search criteria
    const matchingPackages = this.filterPackagesBySearch(validatedInput);

    return {
      packages: matchingPackages,
      flights: {
        guaranteed: flightResults.guaranteed,
        dynamic: flightResults.dynamic,
      },
      hotels: hotelResults.hotels,
      transfers: transferResults.transfers,
      excursions: excursionResults.excursions,
      searchParams: validatedInput,
      totalNights,
      timestamp: new Date(),
    };
  }

  /**
   * Filter packages by search criteria
   */
  private static filterPackagesBySearch(searchInput: PackageSearchInput): TravelPackage[] {
    return PACKAGE_TEMPLATES.filter(pkg => {
      // Check destination match
      const destinationMatch = pkg.destination.toLowerCase() === searchInput.destination.toLowerCase() ||
                              pkg.destination.toLowerCase().includes(searchInput.destination.toLowerCase());

      // Check budget constraints if provided
      let budgetMatch = true;
      if (searchInput.budget) {
        if (searchInput.budget.min && pkg.pricePerPerson < searchInput.budget.min) {
          budgetMatch = false;
        }
        if (searchInput.budget.max && pkg.pricePerPerson > searchInput.budget.max) {
          budgetMatch = false;
        }
      }

      return destinationMatch && budgetMatch;
    });
  }

  /**
   * Create a custom package booking with multiple services
   */
  static async createPackageBooking(input: CreatePackageBookingInput) {
    const validatedInput = createPackageBookingSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      // Create the main booking first
      const booking = await BookingService.createSoftBooking({
        userId: validatedInput.userId,
        totalAmount: validatedInput.totalAmount,
        currency: validatedInput.currency,
      });

      const bookingResults = {
        booking,
        flights: [],
        hotels: [],
        transfers: [],
        excursions: [],
      };

      // Book flights
      for (const flightData of validatedInput.packageItems.flights) {
        const flightBooking = await FlightService.bookFlight({
          bookingId: booking.id,
          ...flightData,
        });
        bookingResults.flights.push(flightBooking);
      }

      // Book hotels
      for (const hotelData of validatedInput.packageItems.hotels) {
        const hotelBooking = await HotelService.bookHotel({
          bookingId: booking.id,
          ...hotelData,
        });
        bookingResults.hotels.push(hotelBooking);
      }

      // Book transfers
      for (const transferData of validatedInput.packageItems.transfers) {
        const transferBooking = await TransferService.bookTransfer({
          bookingId: booking.id,
          ...transferData,
        });
        bookingResults.transfers.push(transferBooking);
      }

      // Book excursions
      for (const excursionData of validatedInput.packageItems.excursions) {
        const excursionBooking = await ExcursionService.bookExcursion({
          bookingId: booking.id,
          ...excursionData,
        });
        bookingResults.excursions.push(excursionBooking);
      }

      return bookingResults;
    });
  }

  /**
   * Calculate package price with discounts
   */
  static calculatePackagePrice(components: {
    flightPrice: number;
    hotelPrice: number;
    transferPrice: number;
    excursionPrice: number;
  }, passengers: number): { originalPrice: number; discountedPrice: number; discountPercentage: number } {
    const originalPrice = components.flightPrice + components.hotelPrice + components.transferPrice + components.excursionPrice;
    
    let discountPercentage = 0;
    
    // Package discount tiers
    if (originalPrice > 2000) {
      discountPercentage = 15; // 15% discount for premium packages
    } else if (originalPrice > 1000) {
      discountPercentage = 10; // 10% discount for mid-range packages
    } else if (originalPrice > 500) {
      discountPercentage = 5; // 5% discount for budget packages
    }

    // Group discount
    if (passengers >= 4) {
      discountPercentage += 5; // Additional 5% for groups
    }

    const discountAmount = (originalPrice * discountPercentage) / 100;
    const discountedPrice = originalPrice - discountAmount;

    return {
      originalPrice,
      discountedPrice,
      discountPercentage,
    };
  }

  /**
   * Get package by ID
   */
  static getPackageById(id: string): TravelPackage | undefined {
    return PACKAGE_TEMPLATES.find(pkg => pkg.id === id);
  }

  /**
   * Get packages by destination
   */
  static getPackagesByDestination(destination: string): TravelPackage[] {
    return PACKAGE_TEMPLATES.filter(pkg => 
      pkg.destination.toLowerCase().includes(destination.toLowerCase())
    );
  }

  /**
   * Get popular packages
   */
  static getPopularPackages(limit: number = 10): TravelPackage[] {
    return [...PACKAGE_TEMPLATES]
      .sort((a, b) => {
        // Sort by rating first, then by review count
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        return b.reviewCount - a.reviewCount;
      })
      .slice(0, limit);
  }

  /**
   * Get packages by budget range
   */
  static getPackagesByBudget(minPrice: number, maxPrice: number): TravelPackage[] {
    return PACKAGE_TEMPLATES.filter(pkg => 
      pkg.pricePerPerson >= minPrice && pkg.pricePerPerson <= maxPrice
    );
  }

  /**
   * Get packages by tags
   */
  static getPackagesByTags(tags: string[]): TravelPackage[] {
    return PACKAGE_TEMPLATES.filter(pkg => 
      tags.some(tag => pkg.tags.includes(tag))
    );
  }

  /**
   * Build custom package from individual components
   */
  static buildCustomPackage(components: {
    flights: any[];
    hotels: any[];
    transfers?: any[];
    excursions?: any[];
  }): { totalPrice: number; packageSummary: any } {
    let totalPrice = 0;
    const packageSummary = {
      flights: [],
      hotels: [],
      transfers: [],
      excursions: [],
      totalNights: 0,
      totalPassengers: 0,
    };

    // Calculate flight costs
    components.flights.forEach(flight => {
      totalPrice += flight.price * flight.passengers;
      packageSummary.flights.push({
        route: `${flight.origin} to ${flight.destination}`,
        price: flight.price * flight.passengers,
        passengers: flight.passengers,
      });
      packageSummary.totalPassengers = Math.max(packageSummary.totalPassengers, flight.passengers);
    });

    // Calculate hotel costs
    components.hotels.forEach(hotel => {
      const hotelTotal = hotel.pricePerNight * hotel.nights;
      totalPrice += hotelTotal;
      packageSummary.hotels.push({
        name: hotel.hotelName,
        price: hotelTotal,
        nights: hotel.nights,
        roomType: hotel.roomType,
      });
      packageSummary.totalNights += hotel.nights;
    });

    // Calculate transfer costs
    if (components.transfers) {
      components.transfers.forEach(transfer => {
        totalPrice += transfer.price;
        packageSummary.transfers.push({
          route: `${transfer.fromLocation} to ${transfer.toLocation}`,
          price: transfer.price,
          vehicleType: transfer.vehicleType,
        });
      });
    }

    // Calculate excursion costs
    if (components.excursions) {
      components.excursions.forEach(excursion => {
        const excursionTotal = excursion.price * excursion.participants;
        totalPrice += excursionTotal;
        packageSummary.excursions.push({
          title: excursion.title,
          price: excursionTotal,
          participants: excursion.participants,
        });
      });
    }

    return {
      totalPrice,
      packageSummary,
    };
  }

  /**
   * Check package availability for given dates
   */
  static async checkPackageAvailability(
    packageId: string,
    departureDate: Date,
    returnDate: Date,
    passengers: number
  ): Promise<{ available: boolean; unavailableComponents: string[] }> {
    const pkg = this.getPackageById(packageId);
    if (!pkg) {
      return { available: false, unavailableComponents: ['Package not found'] };
    }

    const unavailableComponents: string[] = [];

    // Check each component availability
    for (const component of pkg.components) {
      switch (component.type) {
        case 'flight':
          if (component.details.flightNumber) {
            const isAvailable = await FlightService.checkFlightAvailability(component.id, passengers);
            if (!isAvailable) {
              unavailableComponents.push(`Flight: ${component.name}`);
            }
          }
          break;

        case 'hotel':
          const hotelAvailable = HotelService.checkRoomAvailability(
            component.id,
            component.details.roomType,
            departureDate,
            returnDate
          );
          if (!hotelAvailable) {
            unavailableComponents.push(`Hotel: ${component.name}`);
          }
          break;

        case 'transfer':
          // Transfers are generally available, could add specific checks here
          break;

        case 'excursion':
          const excursionAvailable = ExcursionService.checkExcursionAvailability(component.id, passengers);
          if (!excursionAvailable) {
            unavailableComponents.push(`Excursion: ${component.name}`);
          }
          break;
      }
    }

    return {
      available: unavailableComponents.length === 0,
      unavailableComponents,
    };
  }

  /**
   * Get package statistics
   */
  static async getPackageStats(): Promise<{
    totalPackages: number;
    averagePrice: number;
    popularDestinations: string[];
    popularTags: string[];
  }> {
    const totalPackages = PACKAGE_TEMPLATES.length;
    const averagePrice = Math.round(
      PACKAGE_TEMPLATES.reduce((sum, pkg) => sum + pkg.pricePerPerson, 0) / totalPackages
    );

    // Get popular destinations
    const destinationCounts = new Map();
    PACKAGE_TEMPLATES.forEach(pkg => {
      destinationCounts.set(pkg.destination, (destinationCounts.get(pkg.destination) || 0) + 1);
    });
    const popularDestinations = Array.from(destinationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);

    // Get popular tags
    const tagCounts = new Map();
    PACKAGE_TEMPLATES.forEach(pkg => {
      pkg.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    const popularTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);

    return {
      totalPackages,
      averagePrice,
      popularDestinations,
      popularTags,
    };
  }

  /**
   * Validate package components before booking
   */
  static validatePackageComponents(packageItems: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate flights
    if (!packageItems.flights || packageItems.flights.length === 0) {
      errors.push('At least one flight is required');
    }

    // Validate hotels
    if (!packageItems.hotels || packageItems.hotels.length === 0) {
      errors.push('At least one hotel is required');
    }

    // Check date consistency
    if (packageItems.flights.length > 0 && packageItems.hotels.length > 0) {
      const flight = packageItems.flights[0];
      const hotel = packageItems.hotels[0];
      
      if (new Date(flight.departureDate) > new Date(hotel.checkIn)) {
        errors.push('Flight departure date should not be after hotel check-in');
      }
      
      if (new Date(flight.returnDate) < new Date(hotel.checkOut)) {
        errors.push('Flight return date should not be before hotel check-out');
      }
    }

    // Validate passenger consistency
    const flightPassengers = packageItems.flights[0]?.passengers || 0;
    const hotelOccupancy = packageItems.hotels[0]?.occupancy || 0;
    
    if (flightPassengers !== hotelOccupancy) {
      errors.push('Flight passengers and hotel occupancy should match');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get all available packages
   */
  static getAllPackages(): TravelPackage[] {
    return [...PACKAGE_TEMPLATES]; // Return a copy
  }
}