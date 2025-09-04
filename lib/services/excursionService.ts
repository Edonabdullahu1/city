import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ExcursionSearchParams {
  location?: string;
  date?: Date;
  participants?: number;
  minPrice?: number;
  maxPrice?: number;
}

export interface CreateExcursionParams {
  title: string;
  description: string;
  location: string;
  duration: number;
  price: number;
  capacity: number;
  meetingPoint: string;
  includes: string[];
  excludes: string[];
  images?: string[];
}

export class ExcursionService {
  /**
   * Search for available excursions
   */
  static async searchExcursions({
    location,
    date,
    participants = 1,
    minPrice,
    maxPrice
  }: ExcursionSearchParams) {
    const where: any = {
      active: true,
      capacity: {
        gte: participants
      }
    };

    if (location) {
      where.location = {
        contains: location,
        mode: 'insensitive'
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = Math.round(minPrice * 100);
      }
      if (maxPrice !== undefined) {
        where.price.lte = Math.round(maxPrice * 100);
      }
    }

    const excursions = await prisma.excursion.findMany({
      where,
      orderBy: {
        price: 'asc'
      }
    });

    // Check availability for specific date if provided
    if (date) {
      // For now, we assume all excursions are available on all dates
      // In the future, this could check against a schedule or availability calendar
    }

    return excursions;
  }

  /**
   * Create a new excursion
   */
  static async createExcursion(data: CreateExcursionParams) {
    const excursion = await prisma.excursion.create({
      data: {
        ...data,
        price: Math.round(data.price * 100), // Convert to cents
        images: data.images || []
      }
    });

    return excursion;
  }

  /**
   * Update excursion
   */
  static async updateExcursion(id: string, data: Partial<CreateExcursionParams>) {
    const updateData: any = { ...data };
    if (data.price) {
      updateData.price = Math.round(data.price * 100);
    }

    const excursion = await prisma.excursion.update({
      where: { id },
      data: updateData
    });

    return excursion;
  }

  /**
   * Delete excursion (soft delete)
   */
  static async deleteExcursion(id: string) {
    const excursion = await prisma.excursion.update({
      where: { id },
      data: { active: false }
    });

    return excursion;
  }

  /**
   * Get all excursions
   */
  static async getAllExcursions(includeInactive = false) {
    const excursions = await prisma.excursion.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: {
        location: 'asc'
      }
    });

    return excursions;
  }

  /**
   * Get excursion by ID
   */
  static async getExcursionById(id: string) {
    const excursion = await prisma.excursion.findUnique({
      where: { id },
      include: {
        bookings: {
          take: 10,
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    return excursion;
  }

  /**
   * Book an excursion
   */
  static async bookExcursion({
    bookingId,
    excursionId,
    excursionDate,
    excursionTime,
    participants,
    specialRequests
  }: {
    bookingId: string;
    excursionId: string;
    excursionDate: Date;
    excursionTime: string;
    participants: number;
    specialRequests?: string;
  }) {
    const excursion = await prisma.excursion.findUnique({
      where: { id: excursionId }
    });

    if (!excursion) {
      throw new Error('Excursion not found');
    }

    if (excursion.capacity < participants) {
      throw new Error('Excursion capacity exceeded');
    }

    const bookingNumber = `EXC-${Date.now().toString(36).toUpperCase()}`;
    const totalPrice = excursion.price * participants;

    const excursionBooking = await prisma.excursionBooking.create({
      data: {
        bookingId,
        excursionId,
        title: excursion.title,
        description: excursion.description,
        location: excursion.location,
        excursionDate,
        excursionTime,
        duration: excursion.duration,
        participants,
        price: excursion.price,
        totalPrice,
        bookingNumber,
        meetingPoint: excursion.meetingPoint
      }
    });

    return excursionBooking;
  }

  /**
   * Get popular excursions
   */
  static async getPopularExcursions() {
    const bookings = await prisma.excursionBooking.groupBy({
      by: ['excursionId', 'title'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    return bookings;
  }

  /**
   * Get excursions by location
   */
  static async getExcursionsByLocation(location: string) {
    const excursions = await prisma.excursion.findMany({
      where: {
        location: {
          contains: location,
          mode: 'insensitive'
        },
        active: true
      },
      orderBy: {
        price: 'asc'
      }
    });

    return excursions;
  }
}