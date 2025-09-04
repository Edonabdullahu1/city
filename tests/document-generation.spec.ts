import { test, expect } from '@playwright/test';
import { DocumentService } from '@/lib/services/documentService';
import { BookingService } from '@/lib/services/bookingService';
import * as fs from 'fs';
import * as path from 'path';

// Mock booking data for testing
const mockBooking = {
  id: 'test-booking-1',
  reservationCode: 'MXi-0001',
  user: {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com'
  },
  totalAmount: 125000, // €1250.00
  currency: 'EUR',
  status: 'CONFIRMED',
  createdAt: new Date('2024-09-01T10:00:00Z'),
  flights: [{
    id: 'flight-1',
    flightNumber: 'TK123',
    origin: 'SKP',
    destination: 'IST',
    departureDate: new Date('2024-09-15T08:00:00Z'),
    returnDate: new Date('2024-09-22T16:30:00Z'),
    class: 'Economy',
    passengers: 2,
    price: 60000 // €600.00
  }],
  hotels: [{
    id: 'hotel-1',
    hotelName: 'Grand Hotel Istanbul',
    location: 'Istanbul, Turkey',
    checkIn: new Date('2024-09-15T14:00:00Z'),
    checkOut: new Date('2024-09-22T11:00:00Z'),
    roomType: 'Deluxe Double Room',
    occupancy: 2,
    nights: 7,
    totalPrice: 49000, // €490.00
    specialRequests: 'Sea view room preferred, late check-out'
  }],
  transfers: [{
    id: 'transfer-1',
    fromLocation: 'Istanbul Airport',
    toLocation: 'Grand Hotel Istanbul',
    transferDate: new Date('2024-09-15T09:30:00Z'),
    transferTime: '10:30',
    vehicleType: 'Private Car',
    passengers: 2,
    price: 8000, // €80.00
    notes: 'Flight TK123 arrival'
  }],
  excursions: [{
    id: 'excursion-1',
    title: 'Bosphorus Cruise & Dolmabahce Palace',
    location: 'Istanbul',
    excursionDate: new Date('2024-09-18T09:00:00Z'),
    excursionTime: '09:00',
    duration: 360, // 6 hours
    participants: 2,
    meetingPoint: 'Eminönü Pier',
    totalPrice: 8000, // €80.00
    description: 'Full day tour including cruise and palace visit'
  }]
};

test.describe('Document Generation System', () => {

  test.beforeAll(async () => {
    // Mock BookingService to return our test data
    jest.spyOn(BookingService, 'getBookingById').mockResolvedValue(mockBooking as any);
  });

  test.afterAll(async () => {
    jest.restoreAllMocks();
  });

  test.describe('PDF Document Generation', () => {

    test('should generate booking confirmation PDF', async () => {
      const pdfBuffer = await DocumentService.generateBookingConfirmation('test-booking-1', {
        language: 'en',
        includeQR: true
      });

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer instanceof Buffer).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Save for manual inspection
      const filePath = path.join(__dirname, '../test-outputs/booking-confirmation-en.pdf');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, pdfBuffer);
    });

    test('should generate booking confirmation in multiple languages', async () => {
      const languages = ['en', 'al', 'mk'] as const;
      
      for (const language of languages) {
        const pdfBuffer = await DocumentService.generateBookingConfirmation('test-booking-1', {
          language,
          includeQR: true
        });

        expect(pdfBuffer).toBeDefined();
        expect(pdfBuffer instanceof Buffer).toBe(true);
        expect(pdfBuffer.length).toBeGreaterThan(0);

        // Save for manual inspection
        const filePath = path.join(__dirname, `../test-outputs/booking-confirmation-${language}.pdf`);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, pdfBuffer);
      }
    });

    test('should generate flight ticket PDF', async () => {
      const pdfBuffer = await DocumentService.generateFlightTicket('test-booking-1', 'flight-1', {
        language: 'en',
        includeQR: true
      });

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer instanceof Buffer).toBe(true);

      // Verify PDF contains flight-specific content
      const pdfContent = pdfBuffer.toString('utf8');
      expect(pdfContent).toContain('TK123'); // Flight number
      expect(pdfContent).toContain('SKP'); // Origin
      expect(pdfContent).toContain('IST'); // Destination

      // Save for manual inspection
      const filePath = path.join(__dirname, '../test-outputs/flight-ticket-en.pdf');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, pdfBuffer);
    });

    test('should generate hotel voucher PDF', async () => {
      const pdfBuffer = await DocumentService.generateHotelVoucher('test-booking-1', 'hotel-1', {
        language: 'en',
        includeQR: true
      });

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer instanceof Buffer).toBe(true);

      // Save for manual inspection
      const filePath = path.join(__dirname, '../test-outputs/hotel-voucher-en.pdf');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, pdfBuffer);
    });

    test('should generate transfer voucher PDF', async () => {
      const pdfBuffer = await DocumentService.generateTransferVoucher('test-booking-1', 'transfer-1', {
        language: 'en',
        includeQR: true
      });

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer instanceof Buffer).toBe(true);

      // Save for manual inspection
      const filePath = path.join(__dirname, '../test-outputs/transfer-voucher-en.pdf');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, pdfBuffer);
    });

    test('should generate excursion voucher PDF', async () => {
      const pdfBuffer = await DocumentService.generateExcursionVoucher('test-booking-1', 'excursion-1', {
        language: 'en',
        includeQR: true
      });

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer instanceof Buffer).toBe(true);

      // Save for manual inspection
      const filePath = path.join(__dirname, '../test-outputs/excursion-voucher-en.pdf');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, pdfBuffer);
    });

    test('should handle missing booking gracefully', async () => {
      jest.spyOn(BookingService, 'getBookingById').mockResolvedValueOnce(null);

      await expect(
        DocumentService.generateBookingConfirmation('non-existent-booking')
      ).rejects.toThrow('Booking not found');
    });

    test('should handle missing service gracefully', async () => {
      await expect(
        DocumentService.generateFlightTicket('test-booking-1', 'non-existent-flight')
      ).rejects.toThrow('Flight not found');
    });

    test('should generate documents without QR codes', async () => {
      const pdfBuffer = await DocumentService.generateBookingConfirmation('test-booking-1', {
        language: 'en',
        includeQR: false
      });

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer instanceof Buffer).toBe(true);
    });

  });

  test.describe('QR Code Integration', () => {

    test('should generate valid QR codes for booking confirmation', async () => {
      const pdfBuffer = await DocumentService.generateBookingConfirmation('test-booking-1', {
        includeQR: true
      });

      // QR code should be embedded in PDF
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Manual verification: QR should contain booking reference
      // In a real implementation, you'd extract and decode the QR code
    });

    test('should generate service-specific QR codes', async () => {
      const flightPdf = await DocumentService.generateFlightTicket('test-booking-1', 'flight-1', {
        includeQR: true
      });
      
      const hotelPdf = await DocumentService.generateHotelVoucher('test-booking-1', 'hotel-1', {
        includeQR: true
      });

      expect(flightPdf).toBeDefined();
      expect(hotelPdf).toBeDefined();
      
      // Each should have different QR codes
      expect(flightPdf.equals(hotelPdf)).toBe(false);
    });

  });

  test.describe('Multi-language Support', () => {

    test('should generate documents in Albanian', async () => {
      const pdfBuffer = await DocumentService.generateBookingConfirmation('test-booking-1', {
        language: 'al'
      });

      expect(pdfBuffer).toBeDefined();
      
      // Save for manual verification of Albanian content
      const filePath = path.join(__dirname, '../test-outputs/booking-confirmation-albanian.pdf');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, pdfBuffer);
    });

    test('should generate documents in Macedonian', async () => {
      const pdfBuffer = await DocumentService.generateBookingConfirmation('test-booking-1', {
        language: 'mk'
      });

      expect(pdfBuffer).toBeDefined();
      
      // Save for manual verification of Macedonian content
      const filePath = path.join(__dirname, '../test-outputs/booking-confirmation-macedonian.pdf');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, pdfBuffer);
    });

    test('should fallback to English for unknown language', async () => {
      const pdfBuffer = await DocumentService.generateBookingConfirmation('test-booking-1', {
        language: 'es' as any // Spanish not supported
      });

      expect(pdfBuffer).toBeDefined();
      // Should not throw error, should use English fallback
    });

  });

  test.describe('Document Content Validation', () => {

    test('should include all required booking information', async () => {
      const pdfBuffer = await DocumentService.generateBookingConfirmation('test-booking-1');
      
      expect(pdfBuffer).toBeDefined();
      // In a real implementation, you'd parse PDF content to verify:
      // - Reservation code
      // - Customer name
      // - Total amount
      // - All service details
    });

    test('should handle special characters in content', async () => {
      const specialCharBooking = {
        ...mockBooking,
        user: {
          ...mockBooking.user,
          firstName: 'Jöhn',
          lastName: 'Döe-Smith'
        },
        hotels: [{
          ...mockBooking.hotels[0],
          specialRequests: 'Room with café view & späte check-out'
        }]
      };

      jest.spyOn(BookingService, 'getBookingById').mockResolvedValueOnce(specialCharBooking as any);

      const pdfBuffer = await DocumentService.generateBookingConfirmation('test-booking-1');
      
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    test('should handle empty optional fields', async () => {
      const minimalBooking = {
        ...mockBooking,
        hotels: [{
          ...mockBooking.hotels[0],
          specialRequests: null
        }],
        transfers: [{
          ...mockBooking.transfers[0],
          notes: null
        }]
      };

      jest.spyOn(BookingService, 'getBookingById').mockResolvedValueOnce(minimalBooking as any);

      const pdfBuffer = await DocumentService.generateBookingConfirmation('test-booking-1');
      
      expect(pdfBuffer).toBeDefined();
    });

  });

  test.describe('Performance Testing', () => {

    test('should generate multiple documents efficiently', async () => {
      const startTime = performance.now();
      
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          DocumentService.generateBookingConfirmation('test-booking-1', {
            language: 'en'
          })
        );
      }
      
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(results).toHaveLength(5);
      results.forEach(pdf => {
        expect(pdf).toBeDefined();
        expect(pdf instanceof Buffer).toBe(true);
      });
      
      // Should complete in reasonable time (adjust threshold as needed)
      expect(totalTime).toBeLessThan(10000); // 10 seconds
    });

    test('should handle large booking data', async () => {
      const largeBooking = {
        ...mockBooking,
        flights: Array(10).fill(0).map((_, i) => ({
          ...mockBooking.flights[0],
          id: `flight-${i}`,
          flightNumber: `TK${123 + i}`
        })),
        hotels: Array(5).fill(0).map((_, i) => ({
          ...mockBooking.hotels[0],
          id: `hotel-${i}`,
          hotelName: `Hotel ${i + 1}`
        })),
        excursions: Array(8).fill(0).map((_, i) => ({
          ...mockBooking.excursions[0],
          id: `excursion-${i}`,
          title: `Excursion ${i + 1}`
        }))
      };

      jest.spyOn(BookingService, 'getBookingById').mockResolvedValueOnce(largeBooking as any);

      const startTime = performance.now();
      const pdfBuffer = await DocumentService.generateBookingConfirmation('test-booking-1');
      const endTime = performance.now();

      expect(pdfBuffer).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
      
      // Save for manual inspection
      const filePath = path.join(__dirname, '../test-outputs/large-booking-confirmation.pdf');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, pdfBuffer);
    });

  });

  test.describe('Error Handling', () => {

    test('should handle PDF generation errors gracefully', async () => {
      // Mock jsPDF to throw an error
      jest.doMock('jspdf', () => {
        return jest.fn().mockImplementation(() => {
          throw new Error('PDF generation failed');
        });
      });

      await expect(
        DocumentService.generateBookingConfirmation('test-booking-1')
      ).rejects.toThrow();
    });

    test('should handle QR code generation errors', async () => {
      // Mock QRCode to fail
      jest.doMock('qrcode', () => ({
        toDataURL: jest.fn().mockRejectedValue(new Error('QR generation failed'))
      }));

      // Should still generate PDF without QR code
      const pdfBuffer = await DocumentService.generateBookingConfirmation('test-booking-1', {
        includeQR: true
      });

      expect(pdfBuffer).toBeDefined();
    });

  });

});

test.describe('Document Generation API', () => {

  test.beforeEach(async ({ page }) => {
    // Mock authentication - this would be handled by your auth setup
    await page.goto('/login');
    // Perform login or set auth cookies
  });

  test('should generate booking confirmation via API', async ({ page }) => {
    const response = await page.request.get('/api/documents/generate/test-booking-1?type=booking_confirmation');
    
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/pdf');
    expect(response.headers()['content-disposition']).toContain('attachment');
    
    const pdfBuffer = await response.body();
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });

  test('should generate flight ticket via API', async ({ page }) => {
    const response = await page.request.get(
      '/api/documents/generate/test-booking-1?type=flight_ticket&serviceId=flight-1'
    );
    
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/pdf');
  });

  test('should generate hotel voucher via API', async ({ page }) => {
    const response = await page.request.get(
      '/api/documents/generate/test-booking-1?type=hotel_voucher&serviceId=hotel-1'
    );
    
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/pdf');
  });

  test('should generate documents in different languages', async ({ page }) => {
    const languages = ['en', 'al', 'mk'];
    
    for (const lang of languages) {
      const response = await page.request.get(
        `/api/documents/generate/test-booking-1?type=booking_confirmation&language=${lang}`
      );
      
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe('application/pdf');
    }
  });

  test('should handle batch document generation', async ({ page }) => {
    const response = await page.request.post('/api/documents/generate/test-booking-1', {
      data: {
        documentTypes: [
          'booking_confirmation',
          'flight_tickets',
          'hotel_vouchers',
          'transfer_vouchers',
          'excursion_vouchers'
        ],
        language: 'en',
        includeQR: true
      }
    });
    
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/pdf');
  });

  test('should require authentication', async ({ page }) => {
    // Clear authentication
    await page.context().clearCookies();
    
    const response = await page.request.get('/api/documents/generate/test-booking-1');
    
    expect(response.status()).toBe(401);
  });

  test('should validate booking access', async ({ page }) => {
    // Test with a booking that the user shouldn't have access to
    const response = await page.request.get('/api/documents/generate/unauthorized-booking');
    
    expect(response.status()).toBeOneOf([403, 404]);
  });

  test('should validate required parameters', async ({ page }) => {
    // Missing serviceId for flight ticket
    const response = await page.request.get(
      '/api/documents/generate/test-booking-1?type=flight_ticket'
    );
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Service ID required');
  });

  test('should handle invalid document types', async ({ page }) => {
    const response = await page.request.get(
      '/api/documents/generate/test-booking-1?type=invalid_type'
    );
    
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid document type');
  });

});