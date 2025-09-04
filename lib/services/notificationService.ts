import { EmailService, EmailOptions } from './emailService';
import { WhatsAppService, WhatsAppOptions } from './whatsappService';
import { BookingService } from './bookingService';

export interface NotificationOptions {
  email?: EmailOptions;
  whatsapp?: WhatsAppOptions;
  includeEmail?: boolean;
  includeWhatsApp?: boolean;
  includeDocuments?: boolean;
}

export interface NotificationResult {
  email?: {
    success: boolean;
    error?: string;
  };
  whatsapp?: {
    success: boolean;
    error?: string;
  };
}

export interface NotificationQueue {
  id: string;
  type: NotificationType;
  recipient: {
    email?: string;
    phone?: string;
    name?: string;
  };
  data: Record<string, any>;
  options: NotificationOptions;
  scheduledAt?: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  lastAttemptAt?: Date;
  error?: string;
}

export type NotificationType = 
  | 'booking_confirmation'
  | 'soft_booking_reminder'
  | 'payment_instructions'
  | 'status_update'
  | 'flight_reminder'
  | 'excursion_upselling'
  | 'welcome'
  | 'payment_confirmation'
  | 'custom';

export class NotificationService {
  private static queue: NotificationQueue[] = [];
  private static isProcessing = false;
  
  /**
   * Send booking confirmation via multiple channels
   */
  static async sendBookingConfirmation(
    bookingId: string,
    options: NotificationOptions = {}
  ): Promise<NotificationResult> {
    const {
      includeEmail = true,
      includeWhatsApp = false,
      includeDocuments = true,
      email: emailOptions = {},
      whatsapp: whatsappOptions = {}
    } = options;

    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const result: NotificationResult = {};

    // Send email notification
    if (includeEmail) {
      try {
        await EmailService.sendBookingConfirmation(bookingId, {
          ...emailOptions,
          attachments: includeDocuments ? undefined : [] // Let EmailService handle document attachment
        });
        result.email = { success: true };
      } catch (error) {
        console.error('Email notification failed:', error);
        result.email = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // Send WhatsApp notification
    if (includeWhatsApp && false) { // Phone field not available in user model
      try {
        await WhatsAppService.sendBookingConfirmation(
          bookingId, 
          "+1234567890", // Placeholder phone - phone field not available in user model
          whatsappOptions
        );
        result.whatsapp = { success: true };
      } catch (error) {
        console.error('WhatsApp notification failed:', error);
        result.whatsapp = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return result;
  }

  /**
   * Send soft booking reminder via multiple channels
   */
  static async sendSoftBookingReminder(
    bookingId: string,
    options: NotificationOptions = {}
  ): Promise<NotificationResult> {
    const {
      includeEmail = true,
      includeWhatsApp = true, // More urgent, enable WhatsApp by default
      email: emailOptions = {},
      whatsapp: whatsappOptions = {}
    } = options;

    const booking = await BookingService.getBookingById(bookingId);
    if (!booking || booking.status !== 'SOFT') {
      throw new Error('Booking not found or not a soft booking');
    }

    const result: NotificationResult = {};

    // Send email reminder
    if (includeEmail) {
      try {
        await EmailService.sendSoftBookingReminder(bookingId, emailOptions);
        result.email = { success: true };
      } catch (error) {
        console.error('Email reminder failed:', error);
        result.email = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // Send WhatsApp reminder
    if (includeWhatsApp && false) { // Phone field not available in user model
      try {
        await WhatsAppService.sendSoftBookingReminder(
          bookingId, 
          "+1234567890", // Placeholder phone - phone field not available in user model
          whatsappOptions
        );
        result.whatsapp = { success: true };
      } catch (error) {
        console.error('WhatsApp reminder failed:', error);
        result.whatsapp = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return result;
  }

  /**
   * Send payment instructions
   */
  static async sendPaymentInstructions(
    bookingId: string,
    options: NotificationOptions = {}
  ): Promise<NotificationResult> {
    const {
      includeEmail = true,
      includeWhatsApp = false,
      email: emailOptions = {},
      whatsapp: whatsappOptions = {}
    } = options;

    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const result: NotificationResult = {};

    if (includeEmail) {
      try {
        await EmailService.sendPaymentInstructions(bookingId, emailOptions);
        result.email = { success: true };
      } catch (error) {
        console.error('Payment instructions email failed:', error);
        result.email = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    if (includeWhatsApp && false) { // Phone field not available in user model
      try {
        // For payment instructions, we might want to send a simple WhatsApp message
        await WhatsAppService.sendCustomMessage(
          "+1234567890", // Placeholder phone - phone field not available in user model
          `💳 Payment instructions for booking ${booking.reservationCode} have been sent to your email. Please check your inbox and complete payment to secure your booking.`
        );
        result.whatsapp = { success: true };
      } catch (error) {
        console.error('Payment instructions WhatsApp failed:', error);
        result.whatsapp = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return result;
  }

  /**
   * Send booking status update
   */
  static async sendStatusUpdate(
    bookingId: string,
    oldStatus: string,
    newStatus: string,
    options: NotificationOptions = {}
  ): Promise<NotificationResult> {
    const {
      includeEmail = true,
      includeWhatsApp = true, // Status updates are important
      email: emailOptions = {},
      whatsapp: whatsappOptions = {}
    } = options;

    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const result: NotificationResult = {};

    if (includeEmail) {
      try {
        await EmailService.sendStatusUpdate(bookingId, oldStatus, newStatus, emailOptions);
        result.email = { success: true };
      } catch (error) {
        console.error('Status update email failed:', error);
        result.email = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    if (includeWhatsApp && false) { // Phone field not available in user model
      try {
        // Handle specific status updates with WhatsApp
        if (newStatus === 'PAID') {
          await WhatsAppService.sendPaymentConfirmation(
            bookingId,
            "+1234567890", // Placeholder phone - phone field not available in user model
            whatsappOptions
          );
        } else {
          // Generic status update message
          const statusMessage = this.getStatusUpdateMessage(
            booking.reservationCode,
            oldStatus,
            newStatus,
            whatsappOptions.language || 'en'
          );
          await WhatsAppService.sendCustomMessage(undefined, statusMessage); // Phone field not available in user model
        }
        result.whatsapp = { success: true };
      } catch (error) {
        console.error('Status update WhatsApp failed:', error);
        result.whatsapp = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return result;
  }

  /**
   * Send flight reminders (24 hours before departure)
   */
  static async sendFlightReminder(
    bookingId: string,
    flightId: string,
    hoursBeforeFlight: number = 24,
    options: NotificationOptions = {}
  ): Promise<NotificationResult> {
    const {
      includeEmail = true,
      includeWhatsApp = true,
      email: emailOptions = {},
      whatsapp: whatsappOptions = {}
    } = options;

    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const flight = booking.flights.find(f => f.id === flightId);
    if (!flight) {
      throw new Error('Flight not found');
    }

    const result: NotificationResult = {};

    // Check if it's time for the reminder
    const departureTime = new Date(flight.departureDate).getTime();
    const reminderTime = departureTime - (hoursBeforeFlight * 60 * 60 * 1000);
    const now = Date.now();

    if (now < reminderTime) {
      // Schedule for later
      await this.scheduleNotification({
        type: 'flight_reminder',
        recipient: {
          email: booking.user.email,
          phone: undefined, // Phone field not available in user model
          name: `${booking.user.firstName} ${booking.user.lastName}`
        },
        data: { bookingId, flightId, hoursBeforeFlight },
        options,
        scheduledAt: new Date(reminderTime)
      });
      return { email: { success: true }, whatsapp: { success: true } };
    }

    // Send immediately if it's time
    if (includeWhatsApp && false) { // Phone field not available in user model
      try {
        await WhatsAppService.sendFlightReminder(
          bookingId,
          flightId,
          "+1234567890", // Placeholder phone - phone field not available in user model
          hoursBeforeFlight,
          whatsappOptions
        );
        result.whatsapp = { success: true };
      } catch (error) {
        console.error('Flight reminder WhatsApp failed:', error);
        result.whatsapp = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // For email, we could implement a similar flight reminder email
    if (includeEmail) {
      result.email = { success: true }; // Placeholder
    }

    return result;
  }

  /**
   * Send excursion upselling messages
   */
  static async sendExcursionUpselling(
    bookingId: string,
    availableExcursions: Array<{
      id: string;
      title: string;
      description: string;
      price: number;
      location: string;
    }>,
    options: NotificationOptions = {}
  ): Promise<NotificationResult> {
    const {
      includeEmail = false, // Usually done via WhatsApp for upselling
      includeWhatsApp = true,
      email: emailOptions = {},
      whatsapp: whatsappOptions = {}
    } = options;

    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const result: NotificationResult = {};

    if (includeWhatsApp && false) { // Phone field not available in user model
      try {
        await WhatsAppService.sendExcursionUpselling(
          bookingId,
          "+1234567890", // Placeholder phone - phone field not available in user model
          availableExcursions,
          whatsappOptions
        );
        result.whatsapp = { success: true };
      } catch (error) {
        console.error('Excursion upselling WhatsApp failed:', error);
        result.whatsapp = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    if (includeEmail) {
      result.email = { success: true }; // Placeholder for email upselling
    }

    return result;
  }

  /**
   * Send welcome message to new users
   */
  static async sendWelcomeMessage(
    userEmail: string,
    userName: string,
    userPhone?: string,
    options: NotificationOptions = {}
  ): Promise<NotificationResult> {
    const {
      includeEmail = true,
      includeWhatsApp = false, // Optional for welcome
      email: emailOptions = {},
      whatsapp: whatsappOptions = {}
    } = options;

    const result: NotificationResult = {};

    if (includeEmail) {
      try {
        await EmailService.sendWelcomeEmail(userEmail, userName, emailOptions);
        result.email = { success: true };
      } catch (error) {
        console.error('Welcome email failed:', error);
        result.email = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    if (includeWhatsApp && userPhone) {
      try {
        await WhatsAppService.sendWelcomeMessage(userPhone, userName, whatsappOptions);
        result.whatsapp = { success: true };
      } catch (error) {
        console.error('Welcome WhatsApp failed:', error);
        result.whatsapp = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return result;
  }

  /**
   * Schedule a notification for later delivery
   */
  static async scheduleNotification(notification: {
    type: NotificationType;
    recipient: {
      email?: string;
      phone?: string;
      name?: string;
    };
    data: Record<string, any>;
    options: NotificationOptions;
    scheduledAt?: Date;
  }): Promise<string> {
    const queueItem: NotificationQueue = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: notification.type,
      recipient: notification.recipient,
      data: notification.data,
      options: notification.options,
      scheduledAt: notification.scheduledAt || new Date(),
      attempts: 0,
      maxAttempts: 3,
      status: 'pending',
      createdAt: new Date()
    };

    this.queue.push(queueItem);
    console.log(`Notification scheduled: ${queueItem.id} for ${queueItem.scheduledAt}`);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return queueItem.id;
  }

  /**
   * Process the notification queue
   */
  static async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    console.log('Starting notification queue processing...');

    while (this.queue.length > 0) {
      const notification = this.queue.find(n => 
        n.status === 'pending' && 
        (!n.scheduledAt || n.scheduledAt <= new Date())
      );

      if (!notification) {
        // No pending notifications ready to process
        break;
      }

      notification.status = 'processing';
      notification.lastAttemptAt = new Date();
      notification.attempts++;

      try {
        await this.processNotification(notification);
        notification.status = 'completed';
        console.log(`Notification ${notification.id} completed successfully`);
      } catch (error) {
        console.error(`Notification ${notification.id} failed:`, error);
        notification.error = error.message;

        if (notification.attempts >= notification.maxAttempts) {
          notification.status = 'failed';
          console.error(`Notification ${notification.id} failed permanently after ${notification.attempts} attempts`);
        } else {
          notification.status = 'pending';
          // Retry after 5 minutes
          notification.scheduledAt = new Date(Date.now() + 5 * 60 * 1000);
          console.log(`Notification ${notification.id} will retry in 5 minutes`);
        }
      }
    }

    // Clean up completed and failed notifications older than 24 hours
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.queue = this.queue.filter(n => 
      n.status === 'pending' || 
      (n.status === 'processing') ||
      (n.createdAt > dayAgo)
    );

    this.isProcessing = false;
    console.log('Notification queue processing completed');
  }

  /**
   * Process a single notification
   */
  private static async processNotification(notification: NotificationQueue): Promise<void> {
    switch (notification.type) {
      case 'booking_confirmation':
        await this.sendBookingConfirmation(notification.data.bookingId, notification.options);
        break;

      case 'soft_booking_reminder':
        await this.sendSoftBookingReminder(notification.data.bookingId, notification.options);
        break;

      case 'payment_instructions':
        await this.sendPaymentInstructions(notification.data.bookingId, notification.options);
        break;

      case 'status_update':
        await this.sendStatusUpdate(
          notification.data.bookingId,
          notification.data.oldStatus,
          notification.data.newStatus,
          notification.options
        );
        break;

      case 'flight_reminder':
        await this.sendFlightReminder(
          notification.data.bookingId,
          notification.data.flightId,
          notification.data.hoursBeforeFlight,
          notification.options
        );
        break;

      case 'excursion_upselling':
        await this.sendExcursionUpselling(
          notification.data.bookingId,
          notification.data.availableExcursions,
          notification.options
        );
        break;

      case 'welcome':
        await this.sendWelcomeMessage(
          notification.recipient.email!,
          notification.recipient.name!,
          notification.recipient.phone,
          notification.options
        );
        break;

      default:
        throw new Error(`Unknown notification type: ${notification.type}`);
    }
  }

  /**
   * Get notification queue status
   */
  static getQueueStatus(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    return {
      total: this.queue.length,
      pending: this.queue.filter(n => n.status === 'pending').length,
      processing: this.queue.filter(n => n.status === 'processing').length,
      completed: this.queue.filter(n => n.status === 'completed').length,
      failed: this.queue.filter(n => n.status === 'failed').length
    };
  }

  /**
   * Setup automatic soft booking reminders
   */
  static async setupSoftBookingReminders(): Promise<void> {
    // This would typically run as a cron job or scheduled task
    // For now, we'll check for expiring soft bookings
    const { bookings } = await BookingService.getBookings({
      status: 'SOFT' as any,
      limit: 100
    });

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    for (const booking of bookings) {
      if (!booking.expiresAt) continue;

      const expiresAt = new Date(booking.expiresAt);

      // Send reminder 2 hours before expiration
      if (expiresAt > oneHourFromNow && expiresAt <= twoHoursFromNow) {
        await this.scheduleNotification({
          type: 'soft_booking_reminder',
          recipient: {
            email: booking.user.email,
            phone: undefined, // Phone field not available in user model
            name: `${booking.user.firstName} ${booking.user.lastName}`
          },
          data: { bookingId: booking.id },
          options: {
            includeEmail: true,
            includeWhatsApp: true,
            email: { language: 'en' },
            whatsapp: { language: 'en' }
          },
          scheduledAt: new Date(expiresAt.getTime() - 2 * 60 * 60 * 1000)
        });
      }

      // Send urgent reminder 30 minutes before expiration
      const thirtyMinutesBeforeExpiry = new Date(expiresAt.getTime() - 30 * 60 * 1000);
      if (thirtyMinutesBeforeExpiry > now && thirtyMinutesBeforeExpiry <= oneHourFromNow) {
        await this.scheduleNotification({
          type: 'soft_booking_reminder',
          recipient: {
            email: booking.user.email,
            phone: undefined, // Phone field not available in user model
            name: `${booking.user.firstName} ${booking.user.lastName}`
          },
          data: { bookingId: booking.id },
          options: {
            includeEmail: false, // Only WhatsApp for urgent reminder
            includeWhatsApp: true,
            whatsapp: { language: 'en' }
          },
          scheduledAt: thirtyMinutesBeforeExpiry
        });
      }
    }
  }

  // Helper method for status update messages
  private static getStatusUpdateMessage(
    reservationCode: string,
    oldStatus: string,
    newStatus: string,
    language: string
  ): string {
    const statusMessages = {
      en: {
        CONFIRMED: `✅ Great news! Your booking ${reservationCode} has been confirmed. Payment instructions will be sent shortly.`,
        PAID: `💚 Payment received for booking ${reservationCode}! Your travel documents are being prepared.`,
        CANCELLED: `❌ Your booking ${reservationCode} has been cancelled. If you have any questions, please contact us.`
      },
      al: {
        CONFIRMED: `✅ Lajme të mira! Rezervimi juaj ${reservationCode} është konfirmuar. Udhëzimet e pagesës do të dërgohen së shpejti.`,
        PAID: `💚 Pagesa u mor për rezervimin ${reservationCode}! Dokumentet e udhëtimit po përgatiten.`,
        CANCELLED: `❌ Rezervimi juaj ${reservationCode} është anulluar. Nëse keni pyetje, na kontaktoni.`
      },
      mk: {
        CONFIRMED: `✅ Одлични вести! Вашата резервација ${reservationCode} е потврдена. Инструкциите за плаќање ќе бидат испратени наскоро.`,
        PAID: `💚 Плаќањето е примено за резервацијата ${reservationCode}! Документите за патување се подготвуваат.`,
        CANCELLED: `❌ Вашата резервација ${reservationCode} е откажана. Ако имате прашања, контактирајте не.`
      }
    };

    return statusMessages[language as keyof typeof statusMessages]?.[newStatus as keyof typeof statusMessages['en']] || 
           `Booking ${reservationCode} status updated from ${oldStatus} to ${newStatus}`;
  }
}