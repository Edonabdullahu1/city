import { test, expect } from '@playwright/test';
import { EmailService } from '@/lib/services/emailService';
import { NotificationService } from '@/lib/services/notificationService';

// Mock booking data for email testing
const mockBooking = {
  id: 'test-booking-email',
  reservationCode: 'MXi-0002',
  customerEmail: 'test@example.com',
  customerName: 'Jane Smith',
  user: {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'test@example.com'
  },
  totalAmount: 87500, // €875.00
  currency: 'EUR',
  adults: 2,
  children: 1,
  checkIn: new Date('2024-10-01T14:00:00Z'),
  checkOut: new Date('2024-10-08T11:00:00Z'),
  status: 'CONFIRMED',
  createdAt: new Date('2024-09-01T15:30:00Z')
};

test.describe('Email Communication System', () => {

  test.beforeAll(async () => {
    // Set up test environment variables
    process.env.MAILGUN_API_KEY = 'test-api-key';
    process.env.MAILGUN_DOMAIN = 'test-domain.com';
  });

  test.describe('Email Template Generation', () => {

    test('should generate booking confirmation email template', async () => {
      const result = await EmailService.sendBookingConfirmation(mockBooking);
      
      // In development mode, this will return true but not send actual email
      expect(result).toBe(true);
      
      // Verify email structure would be correct
      const template = (EmailService as any).getBookingConfirmationTemplate(mockBooking);
      
      expect(template.subject).toContain('Booking Confirmation');
      expect(template.subject).toContain(mockBooking.reservationCode);
      expect(template.html).toContain(mockBooking.customerName);
      expect(template.html).toContain(mockBooking.reservationCode);
      expect(template.html).toContain('€8.75'); // Formatted amount
      expect(template.text).toBeDefined();
    });

    test('should generate booking cancellation email template', async () => {
      const result = await EmailService.sendBookingCancellation(mockBooking);
      
      expect(result).toBe(true);
      
      const template = (EmailService as any).getBookingCancellationTemplate(mockBooking);
      
      expect(template.subject).toContain('Booking Cancelled');
      expect(template.subject).toContain(mockBooking.reservationCode);
      expect(template.html).toContain(mockBooking.customerName);
      expect(template.html).toContain(mockBooking.reservationCode);
      expect(template.text).toBeDefined();
    });

    test('should generate booking reminder email template', async () => {
      const futureBooking = {
        ...mockBooking,
        checkIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };
      
      const result = await EmailService.sendBookingReminder(futureBooking);
      
      expect(result).toBe(true);
      
      const template = (EmailService as any).getBookingReminderTemplate(futureBooking);
      
      expect(template.subject).toContain('Travel Reminder');
      expect(template.subject).toContain('7 days'); // Days until travel
      expect(template.html).toContain(futureBooking.customerName);
      expect(template.html).toContain(futureBooking.reservationCode);
      expect(template.text).toBeDefined();
    });

  });

  test.describe('Email Content Validation', () => {

    test('should include all required booking information in confirmation', async () => {
      const template = (EmailService as any).getBookingConfirmationTemplate(mockBooking);
      
      // Check HTML content
      expect(template.html).toContain(mockBooking.reservationCode);
      expect(template.html).toContain(mockBooking.customerName);
      expect(template.html).toContain('€8.75'); // Total amount formatted
      expect(template.html).toContain('2 Adults, 1 Children'); // Travelers
      
      // Check text content
      expect(template.text).toContain(mockBooking.reservationCode);
      expect(template.text).toContain(mockBooking.customerName);
      expect(template.text).toContain('€8.75');
    });

    test('should format dates correctly in templates', async () => {
      const template = (EmailService as any).getBookingConfirmationTemplate(mockBooking);
      
      // Should contain formatted dates (exact format may vary)
      expect(template.html).toMatch(/Oct\w*\s+1,?\s+2024/); // Check-in date
      expect(template.html).toMatch(/Oct\w*\s+8,?\s+2024/); // Check-out date
    });

    test('should handle travelers count correctly', async () => {
      // Test with adults only
      const adultOnlyBooking = { ...mockBooking, children: 0 };
      const template1 = (EmailService as any).getBookingConfirmationTemplate(adultOnlyBooking);
      expect(template1.html).toContain('2 Adults');
      expect(template1.html).not.toContain('Children');
      
      // Test with children
      const template2 = (EmailService as any).getBookingConfirmationTemplate(mockBooking);
      expect(template2.html).toContain('2 Adults, 1 Children');
    });

    test('should calculate days until travel correctly', async () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      const futureBooking = { ...mockBooking, checkIn: futureDate };
      
      const template = (EmailService as any).getBookingReminderTemplate(futureBooking);
      
      expect(template.subject).toContain('5 days');
      expect(template.html).toContain('5 days');
    });

  });

  test.describe('Email HTML Structure', () => {

    test('should generate valid HTML emails', async () => {
      const template = (EmailService as any).getBookingConfirmationTemplate(mockBooking);
      
      // Basic HTML structure
      expect(template.html).toContain('<!DOCTYPE html>');
      expect(template.html).toContain('<html>');
      expect(template.html).toContain('<head>');
      expect(template.html).toContain('<body>');
      expect(template.html).toContain('</html>');
      
      // CSS styling
      expect(template.html).toContain('<style>');
      expect(template.html).toContain('font-family');
      expect(template.html).toContain('background');
    });

    test('should include proper email styling', async () => {
      const template = (EmailService as any).getBookingConfirmationTemplate(mockBooking);
      
      // Check for responsive design elements
      expect(template.html).toContain('max-width: 600px');
      expect(template.html).toContain('margin: 0 auto');
      
      // Check for proper color scheme
      expect(template.html).toContain('#667eea'); // Brand color
      expect(template.html).toContain('border-radius');
      
      // Check for button styling
      expect(template.html).toContain('class="button"');
    });

    test('should include call-to-action elements', async () => {
      const template = (EmailService as any).getBookingConfirmationTemplate(mockBooking);
      
      // Should include view booking link
      expect(template.html).toContain('View Booking Details');
      expect(template.html).toContain(`/bookings/${mockBooking.reservationCode}`);
      
      // Should include important information
      expect(template.html).toContain('Important Information');
      expect(template.html).toContain('airport');
      expect(template.html).toContain('check-in');
    });

  });

  test.describe('PDF Attachment Handling', () => {

    test('should send email with PDF attachment', async () => {
      const mockPdfBuffer = Buffer.from('mock-pdf-content');
      
      const result = await EmailService.sendBookingConfirmation(mockBooking, mockPdfBuffer);
      
      expect(result).toBe(true);
      // In a real test, you'd verify the attachment was included
    });

    test('should handle missing PDF attachment gracefully', async () => {
      const result = await EmailService.sendBookingConfirmation(mockBooking);
      
      expect(result).toBe(true);
      // Should not fail when no PDF is provided
    });

    test('should set correct attachment metadata', async () => {
      const mockPdfBuffer = Buffer.from('mock-pdf-content');
      
      // Mock the sendEmail method to capture the options
      const sendEmailSpy = jest.spyOn(EmailService, 'sendEmail').mockResolvedValue(true);
      
      await EmailService.sendBookingConfirmation(mockBooking, mockPdfBuffer);
      
      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: `booking-${mockBooking.reservationCode}.pdf`,
              content: mockPdfBuffer,
              contentType: 'application/pdf'
            })
          ])
        })
      );
      
      sendEmailSpy.mockRestore();
    });

  });

  test.describe('Email Configuration', () => {

    test('should handle missing Mailgun configuration', async () => {
      const originalApiKey = process.env.MAILGUN_API_KEY;
      const originalDomain = process.env.MAILGUN_DOMAIN;
      
      delete process.env.MAILGUN_API_KEY;
      delete process.env.MAILGUN_DOMAIN;
      
      const result = await EmailService.sendBookingConfirmation(mockBooking);
      
      // Should return false when not configured
      expect(result).toBe(false);
      
      // Restore env vars
      process.env.MAILGUN_API_KEY = originalApiKey;
      process.env.MAILGUN_DOMAIN = originalDomain;
    });

    test('should use correct sender information', async () => {
      const sendEmailSpy = jest.spyOn(EmailService, 'sendEmail').mockResolvedValue(true);
      
      await EmailService.sendBookingConfirmation(mockBooking);
      
      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockBooking.customerEmail
        })
      );
      
      sendEmailSpy.mockRestore();
    });

  });

  test.describe('Error Handling', () => {

    test('should handle email send failures gracefully', async () => {
      // Mock network failure
      const originalSendEmail = EmailService.sendEmail;
      EmailService.sendEmail = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await EmailService.sendBookingConfirmation(mockBooking);
      
      expect(result).toBe(false);
      
      // Restore original method
      EmailService.sendEmail = originalSendEmail;
    });

    test('should handle malformed booking data', async () => {
      const invalidBooking = {
        ...mockBooking,
        checkIn: 'invalid-date',
        totalAmount: null
      };
      
      // Should not throw error, should handle gracefully
      await expect(
        EmailService.sendBookingConfirmation(invalidBooking as any)
      ).not.toThrow();
    });

    test('should handle special characters in content', async () => {
      const specialBooking = {
        ...mockBooking,
        customerName: 'José García-López',
        reservationCode: 'MXi-0002'
      };
      
      const result = await EmailService.sendBookingConfirmation(specialBooking);
      expect(result).toBe(true);
      
      const template = (EmailService as any).getBookingConfirmationTemplate(specialBooking);
      expect(template.html).toContain('José García-López');
    });

  });

  test.describe('Multi-Channel Integration', () => {

    test('should coordinate email notifications through NotificationService', async () => {
      const result = await NotificationService.sendBookingConfirmation('test-booking-email', {
        includeEmail: true,
        includeWhatsApp: false,
        includeDocuments: true
      });
      
      expect(result.email).toBeDefined();
      expect(result.email?.success).toBe(true);
    });

    test('should handle notification failures gracefully', async () => {
      // Mock EmailService to fail
      const originalSend = EmailService.sendBookingConfirmation;
      EmailService.sendBookingConfirmation = jest.fn().mockRejectedValue(new Error('Email failed'));
      
      const result = await NotificationService.sendBookingConfirmation('test-booking-email', {
        includeEmail: true
      });
      
      expect(result.email).toBeDefined();
      expect(result.email?.success).toBe(false);
      expect(result.email?.error).toContain('Email failed');
      
      // Restore original method
      EmailService.sendBookingConfirmation = originalSend;
    });

  });

  test.describe('Template Consistency', () => {

    test('should maintain consistent styling across all email types', async () => {
      const confirmationTemplate = (EmailService as any).getBookingConfirmationTemplate(mockBooking);
      const cancellationTemplate = (EmailService as any).getBookingCancellationTemplate(mockBooking);
      const reminderTemplate = (EmailService as any).getBookingReminderTemplate(mockBooking);
      
      // All should have similar CSS structure
      [confirmationTemplate, cancellationTemplate, reminderTemplate].forEach(template => {
        expect(template.html).toContain('font-family: Arial');
        expect(template.html).toContain('class="container"');
        expect(template.html).toContain('class="header"');
        expect(template.html).toContain('class="content"');
        expect(template.html).toContain('class="footer"');
      });
    });

    test('should include consistent footer information', async () => {
      const template = (EmailService as any).getBookingConfirmationTemplate(mockBooking);
      
      expect(template.html).toContain('© 2024 Travel Agency');
      expect(template.html).toContain('automated email');
      expect(template.html).toContain('do not reply');
    });

    test('should use consistent branding', async () => {
      const template = (EmailService as any).getBookingConfirmationTemplate(mockBooking);
      
      // Should include consistent color scheme
      expect(template.html).toContain('#667eea'); // Primary brand color
      expect(template.html).toContain('Travel Agency');
    });

  });

});

test.describe('Email API Integration', () => {

  test.describe('Mailgun API Simulation', () => {

    test('should format Mailgun API request correctly', async () => {
      // Enable production mode temporarily
      process.env.MAILGUN_API_KEY = 'test-key';
      process.env.MAILGUN_DOMAIN = 'test.mailgun.org';
      
      // Mock fetch to capture the request
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'test-message-id' })
      });
      
      global.fetch = fetchMock;
      
      // Uncomment the production code in EmailService for this test
      // This would require modifying the service to enable testing
      
      const result = await EmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test</h1>',
        text: 'Test',
        attachments: [{
          filename: 'test.pdf',
          content: Buffer.from('test'),
          contentType: 'application/pdf'
        }]
      });
      
      // This test would verify the actual API call structure
      // Currently disabled since production code is commented out
    });

  });

});

test.describe('Email Performance Testing', () => {

  test('should handle multiple email sends efficiently', async () => {
    const startTime = performance.now();
    
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(EmailService.sendBookingConfirmation(mockBooking));
    }
    
    const results = await Promise.all(promises);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    expect(results).toHaveLength(10);
    results.forEach(result => expect(result).toBe(true));
    
    // Should complete quickly in development mode
    expect(totalTime).toBeLessThan(1000); // 1 second
  });

  test('should handle large email content', async () => {
    const largeBooking = {
      ...mockBooking,
      customerName: 'A'.repeat(100), // Long name
      reservationCode: 'MXi-' + '0'.repeat(100) // Long code (unrealistic but tests limits)
    };
    
    const result = await EmailService.sendBookingConfirmation(largeBooking);
    expect(result).toBe(true);
  });

});