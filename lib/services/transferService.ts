import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TransferSearchParams {
  fromLocation: string;
  toLocation: string;
  passengers: number;
  transferDate: Date;
}

export interface CreateTransferParams {
  name: string;
  fromLocation: string;
  toLocation: string;
  vehicleType: string;
  capacity: number;
  price: number;
  duration: number;
  description?: string;
}

export class TransferService {
  /**
   * Search for available transfers
   */
  static async searchTransfers({
    fromLocation,
    toLocation,
    passengers,
    transferDate
  }: TransferSearchParams) {
    const transfers = await prisma.transfer.findMany({
      where: {
        fromLocation: {
          contains: fromLocation,
          mode: 'insensitive'
        },
        toLocation: {
          contains: toLocation,
          mode: 'insensitive'
        },
        capacity: {
          gte: passengers
        },
        active: true
      },
      orderBy: {
        price: 'asc'
      }
    });

    return transfers;
  }

  /**
   * Create a new transfer service
   */
  static async createTransfer(data: CreateTransferParams) {
    const transfer = await prisma.transfer.create({
      data: {
        ...data,
        price: Math.round(data.price * 100) // Convert to cents
      }
    });

    return transfer;
  }

  /**
   * Update transfer service
   */
  static async updateTransfer(id: string, data: Partial<CreateTransferParams>) {
    const updateData: any = { ...data };
    if (data.price) {
      updateData.price = Math.round(data.price * 100);
    }

    const transfer = await prisma.transfer.update({
      where: { id },
      data: updateData
    });

    return transfer;
  }

  /**
   * Delete transfer service (soft delete by marking inactive)
   */
  static async deleteTransfer(id: string) {
    const transfer = await prisma.transfer.update({
      where: { id },
      data: { active: false }
    });

    return transfer;
  }

  /**
   * Get all transfers
   */
  static async getAllTransfers(includeInactive = false) {
    const transfers = await prisma.transfer.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: {
        fromLocation: 'asc'
      }
    });

    return transfers;
  }

  /**
   * Get transfer by ID
   */
  static async getTransferById(id: string) {
    const transfer = await prisma.transfer.findUnique({
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

    return transfer;
  }

  /**
   * Book a transfer
   */
  static async bookTransfer({
    bookingId,
    transferId,
    transferDate,
    transferTime,
    passengers,
    notes
  }: {
    bookingId: string;
    transferId: string;
    transferDate: Date;
    transferTime: string;
    passengers: number;
    notes?: string;
  }) {
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId }
    });

    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.capacity < passengers) {
      throw new Error('Transfer capacity exceeded');
    }

    const bookingNumber = `TRF-${Date.now().toString(36).toUpperCase()}`;

    const transferBooking = await prisma.transferBooking.create({
      data: {
        bookingId,
        transferId,
        fromLocation: transfer.fromLocation,
        toLocation: transfer.toLocation,
        transferDate,
        transferTime,
        vehicleType: transfer.vehicleType,
        passengers,
        price: transfer.price,
        bookingNumber,
        notes
      }
    });

    return transferBooking;
  }

  /**
   * Get popular routes
   */
  static async getPopularRoutes() {
    const bookings = await prisma.transferBooking.groupBy({
      by: ['fromLocation', 'toLocation'],
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
}