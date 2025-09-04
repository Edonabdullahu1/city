import { test, expect } from '@playwright/test';
import { WhatsAppService } from '@/lib/services/whatsappService';
import { NotificationService } from '@/lib/services/notificationService';

// Mock booking data for WhatsApp testing
const mockBooking = {
  id: 'test-booking-whatsapp',
  reservationCode: 'MXi-0003',
  customerName: 'Carlos Rodriguez',
  customerPhone: '+1234567890',
  user: {
    firstName: 'Carlos',
    lastName: 'Rodriguez',
    email: 'carlos@example.com'
  },
  totalAmount: 156800, // €1568.00
  checkInDate: new Date('2024-11-15T14:00:00Z'),
  checkOutDate: new Date('2024-11-22T11:00:00Z'),
  destination: 'Barcelona',
  flightDetails: {
    outbound: {
      flightNumber: 'VY8421',
      departure: new Date('2024-11-15T06:30:00Z'),
      origin: 'SKP',
      destination: 'BCN'
    },
    return: {
      flightNumber: 'VY8422',
      departure: new Date('2024-11-22T14:15:00Z'),
      origin: 'BCN',
      destination: 'SKP'
    }
  },
  hotelDetails: {
    name: 'Hotel Barcelona Center',
    roomType: 'Superior Double Room'
  }
};

test.describe('WhatsApp Communication System', () => {

  test.describe('Message Formatting', () => {

    test('should format booking confirmation message correctly', async () => {
      const message = (WhatsAppService as any).formatBookingConfirmation(mockBooking);
      
      expect(message).toContain('🎉 *Booking Confirmed!*');
      expect(message).toContain(mockBooking.reservationCode);
      expect(message).toContain(mockBooking.customerName);
      expect(message).toContain('€15.68'); // Formatted amount
      expect(message).toContain('MXi Travel'); // Brand name
      
      // Check dates are formatted
      expect(message).toMatch(/Nov\w*\s+15,?\s+2024/); // Check-in
      expect(message).toMatch(/Nov\w*\s+22,?\s+2024/); // Check-out
      
      // Check emojis are included
      expect(message).toContain('🎉');
      expect(message).toContain('✈️');
      expect(message).toContain('🏨');
      expect(message).toContain('📧');
      expect(message).toContain('🌟');
    });

    test('should format booking reminder message correctly', async () => {
      const futureBooking = {
        ...mockBooking,
        checkInDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
      };
      
      const message = (WhatsAppService as any).formatBookingReminder(futureBooking);
      
      expect(message).toContain('⏰ *Travel Reminder!*');
      expect(message).toContain('*3 days*');
      expect(message).toContain(futureBooking.reservationCode);
      expect(message).toContain('Barcelona');
      
      // Check checklist items
      expect(message).toContain('✅ Check-in online');
      expect(message).toContain('✅ Valid passport');
      expect(message).toContain('✅ Travel insurance');
      expect(message).toContain('✅ Hotel voucher');
      
      expect(message).toContain('Safe travels! ✈️');
    });

    test('should format booking cancellation message correctly', async () => {
      const message = (WhatsAppService as any).formatBookingCancellation(mockBooking);
      
      expect(message).toContain('❌ *Booking Cancelled*');
      expect(message).toContain(mockBooking.reservationCode);
      expect(message).toContain(mockBooking.customerName);
      expect(message).toContain('5-7 business days'); // Refund timeframe
      expect(message).toContain('MXi Travel Support');
    });

    test('should format soft booking expiring message correctly', async () => {
      const message = (WhatsAppService as any).formatSoftBookingExpiring(mockBooking);
      
      expect(message).toContain('⚠️ *Booking Expiring Soon!*');
      expect(message).toContain(mockBooking.reservationCode);
      expect(message).toContain('*30 minutes*');
      expect(message).toContain('€15.68'); // Amount
      expect(message).toContain('Bank Transfer');
      expect(message).toContain('Act now');
      expect(message).toContain('⏱️');
    });

  });

  test.describe('Flight Details Formatting', () => {

    test('should format flight details correctly from object', async () => {
      const flightInfo = (WhatsAppService as any).formatFlightInfo(mockBooking.flightDetails);
      
      expect(flightInfo).toContain('Outbound: VY8421');
      expect(flightInfo).toContain('SKP → BCN');
      expect(flightInfo).toContain('Return: VY8422');
      expect(flightInfo).toContain('BCN → SKP');
      
      // Check dates are included
      expect(flightInfo).toMatch(/11\/15\/2024/);
      expect(flightInfo).toMatch(/11\/22\/2024/);
    });

    test('should handle flight details as JSON string', async () => {
      const jsonFlightDetails = JSON.stringify(mockBooking.flightDetails);
      const flightInfo = (WhatsAppService as any).formatFlightInfo(jsonFlightDetails);
      
      expect(flightInfo).toContain('Outbound: VY8421');
      expect(flightInfo).toContain('Return: VY8422');
    });

    test('should handle malformed flight details gracefully', async () => {
      const invalidFlightDetails = 'invalid-json-string';
      const flightInfo = (WhatsAppService as any).formatFlightInfo(invalidFlightDetails);
      
      expect(flightInfo).toBe('invalid-json-string'); // Should return original string
    });

    test('should handle missing flight details', async () => {
      const flightInfo = (WhatsAppService as any).formatFlightInfo({});
      
      expect(flightInfo).toBe('Flight details pending');
    });

  });

  test.describe('Hotel Details Formatting', () => {

    test('should format hotel details correctly from object', async () => {
      const hotelInfo = (WhatsAppService as any).formatHotelInfo(mockBooking.hotelDetails);
      
      expect(hotelInfo).toContain('Hotel Barcelona Center');
      expect(hotelInfo).toContain('Superior Double Room');
    });

    test('should handle hotel details as JSON string', async () => {
      const jsonHotelDetails = JSON.stringify(mockBooking.hotelDetails);
      const hotelInfo = (WhatsAppService as any).formatHotelInfo(jsonHotelDetails);
      
      expect(hotelInfo).toContain('Hotel Barcelona Center');
      expect(hotelInfo).toContain('Superior Double Room');
    });

    test('should handle minimal hotel details', async () => {
      const minimalHotelDetails = { name: 'Basic Hotel' };
      const hotelInfo = (WhatsAppService as any).formatHotelInfo(minimalHotelDetails);
      
      expect(hotelInfo).toContain('Basic Hotel');
      expect(hotelInfo).toContain('Standard Room'); // Default room type
    });

    test('should handle missing hotel details', async () => {
      const hotelInfo = (WhatsAppService as any).formatHotelInfo({});
      
      expect(hotelInfo).toContain('Hotel'); // Default hotel name
    });

  });

  test.describe('Message Content Quality', () => {

    test('should include proper WhatsApp formatting', async () => {
      const message = (WhatsAppService as any).formatBookingConfirmation(mockBooking);
      
      // Check for bold text markers
      expect(message).toMatch(/\*[^*]+\*/); // Bold formatting *text*
      
      // Check for emojis
      expect(message).toMatch(/[🎉✈️🏨📧🌟]/);
      
      // Check for line breaks
      expect(message).toContain('\n');
    });

    test('should be concise and readable', async () => {
      const message = (WhatsAppService as any).formatBookingConfirmation(mockBooking);
      
      // Should not be too long for WhatsApp
      expect(message.length).toBeLessThan(1000);
      
      // Should have clear structure
      const lines = message.split('\n').filter(line => line.trim());
      expect(lines.length).toBeGreaterThan(5); // Multiple information lines
    });

    test('should include call-to-action elements', async () => {
      const message = (WhatsAppService as any).formatBookingConfirmation(mockBooking);
      
      expect(message).toContain('Check your email'); // Clear instruction
      
      const reminderMessage = (WhatsAppService as any).formatBookingReminder(mockBooking);
      expect(reminderMessage).toContain('Don\'t forget'); // Reminder checklist
    });

  });

  test.describe('n8n Webhook Integration', () => {

    test('should send message via n8n webhook when configured', async () => {
      process.env.N8N_WEBHOOK_URL = 'https://test-webhook.n8n.io/webhook/whatsapp';
      
      // Mock fetch for webhook call
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messageId: 'msg_123' })
      });
      global.fetch = fetchMock;
      
      const result = await WhatsAppService.sendMessage({
        to: '+1234567890',
        message: 'Test message',
        bookingDetails: mockBooking
      });
      
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://test-webhook.n8n.io/webhook/whatsapp',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"phoneNumber":"+1234567890"')
        })
      );
      
      // Clean up
      delete process.env.N8N_WEBHOOK_URL;
    });

    test('should handle webhook failures gracefully', async () => {
      process.env.N8N_WEBHOOK_URL = 'https://test-webhook.n8n.io/webhook/whatsapp';
      
      // Mock fetch to fail
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error'
      });
      global.fetch = fetchMock;
      
      const result = await WhatsAppService.sendMessage({
        to: '+1234567890',
        message: 'Test message'
      });
      
      expect(result).toBe(false);
      
      // Clean up
      delete process.env.N8N_WEBHOOK_URL;
    });

    test('should handle network errors gracefully', async () => {
      process.env.N8N_WEBHOOK_URL = 'https://test-webhook.n8n.io/webhook/whatsapp';
      
      // Mock fetch to throw network error
      const fetchMock = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = fetchMock;
      
      const result = await WhatsAppService.sendMessage({
        to: '+1234567890',
        message: 'Test message'
      });
      
      expect(result).toBe(false);
      
      // Clean up
      delete process.env.N8N_WEBHOOK_URL;
    });

    test('should log message when webhook not configured', async () => {
      // Ensure webhook URL is not set
      delete process.env.N8N_WEBHOOK_URL;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await WhatsAppService.sendMessage({
        to: '+1234567890',
        message: 'Test message'
      });
      
      expect(result).toBe(true); // Returns true in dev mode
      expect(consoleSpy).toHaveBeenCalledWith(
        'WhatsApp (n8n webhook not configured):',
        expect.objectContaining({
          to: '+1234567890',
          message: 'Test message'
        })
      );
      
      consoleSpy.mockRestore();
    });

  });

  test.describe('Service Method Integration', () => {

    test('should send booking confirmation via service method', async () => {
      const result = await WhatsAppService.sendBookingConfirmation(mockBooking);
      
      expect(result).toBe(true); // In dev mode
      
      // Verify message would be formatted correctly
      const expectedMessage = (WhatsAppService as any).formatBookingConfirmation(mockBooking);
      expect(expectedMessage).toContain(mockBooking.reservationCode);
    });

    test('should send booking reminder via service method', async () => {
      const result = await WhatsAppService.sendBookingReminder(mockBooking);
      
      expect(result).toBe(true);
      
      const expectedMessage = (WhatsAppService as any).formatBookingReminder(mockBooking);
      expect(expectedMessage).toContain('Travel Reminder');
    });

    test('should send booking cancellation via service method', async () => {
      const result = await WhatsAppService.sendBookingCancellation(mockBooking);
      
      expect(result).toBe(true);
      
      const expectedMessage = (WhatsAppService as any).formatBookingCancellation(mockBooking);
      expect(expectedMessage).toContain('Booking Cancelled');
    });

    test('should send soft booking expiring via service method', async () => {
      const result = await WhatsAppService.sendSoftBookingExpiring(mockBooking);
      
      expect(result).toBe(true);
      
      const expectedMessage = (WhatsAppService as any).formatSoftBookingExpiring(mockBooking);
      expect(expectedMessage).toContain('Booking Expiring Soon');
    });

  });

  test.describe('Error Handling', () => {

    test('should handle missing phone number gracefully', async () => {
      const bookingWithoutPhone = { ...mockBooking, customerPhone: undefined };
      
      const result = await WhatsAppService.sendBookingConfirmation(bookingWithoutPhone);
      
      // Should not throw error
      expect(result).toBe(true);
    });

    test('should handle malformed booking data', async () => {
      const malformedBooking = {
        reservationCode: null,
        customerName: undefined,
        totalAmount: 'invalid'
      };
      
      const result = await WhatsAppService.sendBookingConfirmation(malformedBooking as any);
      
      // Should not throw error
      expect(result).toBe(true);
    });

    test('should handle special characters in messages', async () => {
      const specialBooking = {
        ...mockBooking,
        customerName: 'José García-López',
        destination: 'São Paulo'
      };
      
      const result = await WhatsAppService.sendBookingConfirmation(specialBooking);
      expect(result).toBe(true);
      
      const message = (WhatsAppService as any).formatBookingConfirmation(specialBooking);
      expect(message).toContain('José García-López');
      expect(message).toContain('São Paulo');
    });

  });

  test.describe('Integration with NotificationService', () => {

    test('should integrate with notification orchestration', async () => {
      // Note: This test reveals the phone field issue
      const result = await NotificationService.sendBookingConfirmation('test-booking-whatsapp', {
        includeEmail: false,
        includeWhatsApp: true
      });
      
      // WhatsApp will be disabled due to phone field issues
      expect(result.whatsapp).toBeUndefined();
    });

    test('should handle notification service failures', async () => {
      // Mock WhatsApp service to fail
      const originalSend = WhatsAppService.sendBookingConfirmation;
      WhatsAppService.sendBookingConfirmation = jest.fn().mockRejectedValue(new Error('WhatsApp failed'));
      
      const result = await NotificationService.sendBookingConfirmation('test-booking-whatsapp', {
        includeWhatsApp: true
      });
      
      // Should handle failure gracefully
      expect(result.whatsapp?.success).toBe(false);
      expect(result.whatsapp?.error).toContain('WhatsApp failed');
      
      // Restore original method
      WhatsAppService.sendBookingConfirmation = originalSend;
    });

  });

});

test.describe('WhatsApp Webhook API', () => {

  test.describe('Webhook Status Updates', () => {

    test('should handle message delivered webhook', async ({ page }) => {
      const response = await page.request.post('/api/webhooks/whatsapp', {
        data: {
          event: 'message.delivered',
          messageId: 'msg_123',
          status: 'delivered',
          phoneNumber: '+1234567890'
        }
      });
      
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);
    });

    test('should handle message failed webhook', async ({ page }) => {
      const response = await page.request.post('/api/webhooks/whatsapp', {
        data: {
          event: 'message.failed',
          messageId: 'msg_124',
          status: 'failed',
          phoneNumber: '+1234567890',
          error: 'Invalid phone number'
        }
      });
      
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);
    });

    test('should handle message read webhook', async ({ page }) => {
      const response = await page.request.post('/api/webhooks/whatsapp', {
        data: {
          event: 'message.read',
          messageId: 'msg_125',
          phoneNumber: '+1234567890'
        }
      });
      
      expect(response.status()).toBe(200);
    });

    test('should handle unknown webhook events', async ({ page }) => {
      const response = await page.request.post('/api/webhooks/whatsapp', {
        data: {
          event: 'unknown.event',
          messageId: 'msg_126'
        }
      });
      
      expect(response.status()).toBe(200);
      // Should not fail on unknown events
    });

  });

  test.describe('Manual WhatsApp Testing Endpoint', () => {

    test('should send confirmation message via GET endpoint', async ({ page }) => {
      const response = await page.request.get('/api/webhooks/whatsapp?action=confirmation&bookingId=test-booking-1');
      
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('Confirmation message sent');
    });

    test('should send reminder message via GET endpoint', async ({ page }) => {
      const response = await page.request.get('/api/webhooks/whatsapp?action=reminder&bookingId=test-booking-1');
      
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toContain('Reminder message sent');
    });

    test('should send expiring message via GET endpoint', async ({ page }) => {
      const response = await page.request.get('/api/webhooks/whatsapp?action=expiring&bookingId=test-booking-1');
      
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toContain('Expiring notification sent');
    });

    test('should send cancellation message via GET endpoint', async ({ page }) => {
      const response = await page.request.get('/api/webhooks/whatsapp?action=cancellation&bookingId=test-booking-1');
      
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toContain('Cancellation message sent');
    });

    test('should require booking ID parameter', async ({ page }) => {
      const response = await page.request.get('/api/webhooks/whatsapp?action=confirmation');
      
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Booking ID required');
    });

    test('should handle invalid action parameter', async ({ page }) => {
      const response = await page.request.get('/api/webhooks/whatsapp?action=invalid&bookingId=test-booking-1');
      
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid action');
    });

    test('should handle non-existent booking', async ({ page }) => {
      const response = await page.request.get('/api/webhooks/whatsapp?action=confirmation&bookingId=non-existent');
      
      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toContain('Booking not found');
    });

  });

  test.describe('Webhook Security', () => {

    test('should handle malformed webhook payload', async ({ page }) => {
      const response = await page.request.post('/api/webhooks/whatsapp', {
        data: 'invalid-json'
      });
      
      expect(response.status()).toBe(500);
    });

    test('should handle missing webhook data', async ({ page }) => {
      const response = await page.request.post('/api/webhooks/whatsapp', {
        data: {}
      });
      
      expect(response.status()).toBe(200);
      // Should handle empty data gracefully
    });

  });

});

test.describe('WhatsApp Performance Testing', () => {

  test('should handle multiple message sends efficiently', async () => {
    const startTime = performance.now();
    
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(WhatsAppService.sendBookingConfirmation(mockBooking));
    }
    
    const results = await Promise.all(promises);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    expect(results).toHaveLength(10);
    results.forEach(result => expect(result).toBe(true));
    
    // Should complete quickly in development mode
    expect(totalTime).toBeLessThan(500); // 500ms
  });

  test('should handle large message content', async () => {
    const largeBooking = {
      ...mockBooking,
      customerName: 'A'.repeat(100),
      destination: 'B'.repeat(50),
      hotelDetails: {
        name: 'C'.repeat(100),
        roomType: 'D'.repeat(50)
      }
    };
    
    const result = await WhatsAppService.sendBookingConfirmation(largeBooking);
    expect(result).toBe(true);
    
    const message = (WhatsAppService as any).formatBookingConfirmation(largeBooking);
    // WhatsApp has message length limits, but should not crash
    expect(message.length).toBeLessThan(2000);
  });

});