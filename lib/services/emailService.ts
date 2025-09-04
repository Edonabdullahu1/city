interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export class EmailService {
  private static apiKey = process.env.MAILGUN_API_KEY;
  private static domain = process.env.MAILGUN_DOMAIN;
  private static fromEmail = 'noreply@travelagency.com';
  private static fromName = 'Travel Agency';

  /**
   * Send an email using Mailgun API
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.apiKey || !this.domain) {
      console.error('Mailgun credentials not configured');
      return false;
    }

    try {
      // In production, use the actual Mailgun API
      // For development, we'll log the email details
      console.log('📧 Email would be sent:', {
        to: options.to,
        subject: options.subject,
        attachments: options.attachments?.length || 0
      });

      // Uncomment for production with Mailgun:
      /*
      const formData = new FormData();
      formData.append('from', `${this.fromName} <${this.fromEmail}>`);
      formData.append('to', Array.isArray(options.to) ? options.to.join(',') : options.to);
      formData.append('subject', options.subject);
      formData.append('html', options.html);
      if (options.text) {
        formData.append('text', options.text);
      }
      
      // Add attachments
      if (options.attachments) {
        options.attachments.forEach((attachment) => {
          formData.append('attachment', new Blob([attachment.content]), attachment.filename);
        });
      }

      const response = await fetch(
        `https://api.mailgun.net/v3/${this.domain}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error(`Mailgun error: ${response.statusText}`);
      }
      */

      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }

  /**
   * Send booking confirmation email
   */
  static async sendBookingConfirmation(booking: any, pdfBuffer?: Buffer): Promise<boolean> {
    const template = this.getBookingConfirmationTemplate(booking);
    
    const attachments = pdfBuffer ? [{
      filename: `booking-${booking.reservationCode}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }] : undefined;

    return this.sendEmail({
      to: booking.customerEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      attachments
    });
  }

  /**
   * Send booking cancellation email
   */
  static async sendBookingCancellation(booking: any): Promise<boolean> {
    const template = this.getBookingCancellationTemplate(booking);
    
    return this.sendEmail({
      to: booking.customerEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send booking reminder email
   */
  static async sendBookingReminder(booking: any): Promise<boolean> {
    const template = this.getBookingReminderTemplate(booking);
    
    return this.sendEmail({
      to: booking.customerEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  /**
   * Get booking confirmation email template
   */
  private static getBookingConfirmationTemplate(booking: any): EmailTemplate {
    const checkInDate = new Date(booking.checkIn).toLocaleDateString();
    const checkOutDate = new Date(booking.checkOut).toLocaleDateString();

    return {
      subject: `Booking Confirmation - ${booking.reservationCode}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
              .reservation-code { background: #f0f0f0; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; color: #667eea; border-radius: 5px; margin: 20px 0; }
              .details { background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Booking Confirmed!</h1>
                <p>Thank you for choosing Travel Agency</p>
              </div>
              
              <div class="content">
                <p>Dear ${booking.customerName},</p>
                
                <p>We're delighted to confirm your booking. Your reservation has been successfully processed.</p>
                
                <div class="reservation-code">
                  Reservation Code: ${booking.reservationCode}
                </div>
                
                <div class="details">
                  <h3>Booking Details:</h3>
                  <p><strong>Check-in:</strong> ${checkInDate}</p>
                  <p><strong>Check-out:</strong> ${checkOutDate}</p>
                  <p><strong>Travelers:</strong> ${booking.adults} Adults${booking.children ? `, ${booking.children} Children` : ''}</p>
                  <p><strong>Total Amount:</strong> €${(booking.totalAmount / 100).toFixed(2)}</p>
                </div>
                
                <p>Your booking confirmation and travel documents are attached to this email. Please print them and bring them with you on your trip.</p>
                
                <center>
                  <a href="http://localhost:3005/bookings/${booking.reservationCode}" class="button">
                    View Booking Details
                  </a>
                </center>
                
                <h3>Important Information:</h3>
                <ul>
                  <li>Please arrive at the airport at least 2 hours before departure</li>
                  <li>Hotel check-in is typically at 14:00</li>
                  <li>Ensure all travel documents are valid</li>
                  <li>Keep this confirmation email for your records</li>
                </ul>
                
                <p>If you have any questions, please don't hesitate to contact us.</p>
                
                <p>Best regards,<br>The Travel Agency Team</p>
              </div>
              
              <div class="footer">
                <p>© 2024 Travel Agency. All rights reserved.</p>
                <p>This is an automated email. Please do not reply directly to this message.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        Booking Confirmation - ${booking.reservationCode}
        
        Dear ${booking.customerName},
        
        Your booking has been confirmed!
        
        Reservation Code: ${booking.reservationCode}
        Check-in: ${checkInDate}
        Check-out: ${checkOutDate}
        Travelers: ${booking.adults} Adults${booking.children ? `, ${booking.children} Children` : ''}
        Total Amount: €${(booking.totalAmount / 100).toFixed(2)}
        
        Please keep this confirmation for your records.
        
        Best regards,
        The Travel Agency Team
      `
    };
  }

  /**
   * Get booking cancellation email template
   */
  private static getBookingCancellationTemplate(booking: any): EmailTemplate {
    return {
      subject: `Booking Cancelled - ${booking.reservationCode}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Booking Cancelled</h1>
              </div>
              
              <div class="content">
                <p>Dear ${booking.customerName},</p>
                
                <p>Your booking with reservation code <strong>${booking.reservationCode}</strong> has been cancelled.</p>
                
                <p>If you did not request this cancellation, please contact us immediately.</p>
                
                <p>We hope to serve you in the future.</p>
                
                <p>Best regards,<br>The Travel Agency Team</p>
              </div>
              
              <div class="footer">
                <p>© 2024 Travel Agency. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        Booking Cancelled - ${booking.reservationCode}
        
        Dear ${booking.customerName},
        
        Your booking has been cancelled.
        
        Reservation Code: ${booking.reservationCode}
        
        If you did not request this cancellation, please contact us immediately.
        
        Best regards,
        The Travel Agency Team
      `
    };
  }

  /**
   * Get booking reminder email template
   */
  private static getBookingReminderTemplate(booking: any): EmailTemplate {
    const checkInDate = new Date(booking.checkIn).toLocaleDateString();
    const daysUntil = Math.ceil((new Date(booking.checkIn).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return {
      subject: `Travel Reminder - Your trip in ${daysUntil} days!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
              .highlight { background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Your Trip is Coming Up!</h1>
                <p>${daysUntil} days to go</p>
              </div>
              
              <div class="content">
                <p>Dear ${booking.customerName},</p>
                
                <p>This is a friendly reminder that your trip is approaching!</p>
                
                <div class="highlight">
                  <p><strong>Reservation Code:</strong> ${booking.reservationCode}</p>
                  <p><strong>Check-in Date:</strong> ${checkInDate}</p>
                </div>
                
                <h3>Pre-Travel Checklist:</h3>
                <ul>
                  <li>✓ Check passport validity</li>
                  <li>✓ Print travel documents</li>
                  <li>✓ Check-in online (if available)</li>
                  <li>✓ Pack according to weather forecast</li>
                  <li>✓ Arrange transportation to airport</li>
                </ul>
                
                <p>We wish you a wonderful trip!</p>
                
                <p>Best regards,<br>The Travel Agency Team</p>
              </div>
              
              <div class="footer">
                <p>© 2024 Travel Agency. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        Travel Reminder - Your trip in ${daysUntil} days!
        
        Dear ${booking.customerName},
        
        Your trip is coming up in ${daysUntil} days!
        
        Reservation Code: ${booking.reservationCode}
        Check-in Date: ${checkInDate}
        
        Don't forget to:
        - Check passport validity
        - Print travel documents
        - Check-in online
        - Pack appropriately
        
        Have a wonderful trip!
        
        Best regards,
        The Travel Agency Team
      `
    };
  }
}