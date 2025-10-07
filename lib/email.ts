import nodemailer from 'nodemailer';
import prisma from '@/lib/prisma';

// Email configuration with production readiness checks
const emailConfig = {
  enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_EMAIL === 'true',
  from: process.env.EMAIL_FROM || '"MXi Travel Agency" <bookings@mxitravel.com>',
  host: process.env.MAILGUN_HOST || 'smtp.mailgun.org',
  port: parseInt(process.env.MAILGUN_PORT || '587'),
  secure: process.env.MAILGUN_SECURE === 'true',
  user: process.env.MAILGUN_SMTP_USER || '',
  pass: process.env.MAILGUN_SMTP_PASSWORD || '',
};

// Create transporter with Mailgun SMTP (only if properly configured)
let transporter: nodemailer.Transporter | null = null;

if (emailConfig.enabled && emailConfig.user && emailConfig.pass) {
  try {
    transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass
      },
      // Add connection timeout and retry options
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 15000,
    });

    // Verify connection configuration (async, won't block startup)
    transporter.verify((error) => {
      if (error) {
        console.error('❌ Email configuration error:', error.message);
        transporter = null;
      } else {
        console.log('✅ Email server connection verified successfully');
      }
    });
  } catch (error) {
    console.error('❌ Failed to initialize email transporter:', error);
    transporter = null;
  }
} else {
  console.warn('⚠️  Email service disabled - missing configuration or not in production mode');
  console.warn('   Set NODE_ENV=production or ENABLE_EMAIL=true to enable emails');
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Helper function to replace variables in template
function replaceVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  }
  return result;
}

// Get template from database with fallback
async function getEmailTemplate(templateName: string, variables: Record<string, any>) {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { name: templateName },
    });

    if (template) {
      return {
        subject: replaceVariables(template.subject, variables),
        html: replaceVariables(template.htmlContent, variables),
      };
    }
  } catch (error) {
    console.error(`Failed to fetch template "${templateName}":`, error);
  }

  // Return null if template not found (caller will use fallback)
  return null;
}

// Send email function
async function sendEmail(options: EmailOptions) {
  if (!transporter) {
    console.warn('⚠️  Email not sent - transporter not configured');
    return null;
  }

  try {
    const info = await transporter.sendMail({
      from: emailConfig.from,
      ...options
    });
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

// Booking confirmation email (with PDF attachments)
export async function sendBookingConfirmationEmail(booking: {
  to: string;
  bookingCode: string;
  customerName: string;
  checkInDate: string;
  checkOutDate: string;
  destination: string;
  totalAmount: number;
  bookingId?: string;
}) {
  const variables = {
    customerName: booking.customerName,
    bookingCode: booking.bookingCode,
    destination: booking.destination,
    checkInDate: new Date(booking.checkInDate).toLocaleDateString(),
    checkOutDate: new Date(booking.checkOutDate).toLocaleDateString(),
    totalAmount: `€${(booking.totalAmount / 100).toFixed(2)}`,
  };

  // Generate PDF attachments if bookingId is provided
  let attachments: any[] = [];

  if (booking.bookingId) {
    try {
      const { DocumentService } = await import('./services/documentService');
      const { BookingService } = await import('./services/bookingService');

      // Get booking details to determine what documents to generate
      const bookingDetails = await BookingService.getBookingById(booking.bookingId);

      if (bookingDetails) {
        // Generate flight tickets for each flight
        for (const flight of bookingDetails.flights || []) {
          try {
            const flightPdf = await DocumentService.generateFlightTicket(
              booking.bookingId,
              flight.id,
              { language: 'en', includeQR: true }
            );

            attachments.push({
              filename: `flight-ticket-${booking.bookingCode}-${flight.id.substring(0, 8)}.pdf`,
              content: flightPdf,
              contentType: 'application/pdf'
            });
          } catch (error) {
            console.error(`[EMAIL] Failed to generate flight ticket for ${flight.id}:`, error);
          }
        }

        // Generate hotel vouchers for each hotel
        for (const hotel of bookingDetails.hotels || []) {
          try {
            const hotelPdf = await DocumentService.generateHotelVoucher(
              booking.bookingId,
              hotel.id,
              { language: 'en', includeQR: true }
            );

            attachments.push({
              filename: `hotel-voucher-${booking.bookingCode}-${hotel.id.substring(0, 8)}.pdf`,
              content: hotelPdf,
              contentType: 'application/pdf'
            });
          } catch (error) {
            console.error(`[EMAIL] Failed to generate hotel voucher for ${hotel.id}:`, error);
          }
        }

        if (attachments.length > 0) {
          console.log(`[EMAIL] Generated ${attachments.length} PDF attachments for booking ${booking.bookingCode}`);
        }
      }
    } catch (error) {
      console.error('[EMAIL] Failed to generate PDF attachments:', error);
      // Continue without attachments - don't fail the email
    }
  }

  // Try to get template from database
  const template = await getEmailTemplate('booking-confirmation', variables);

  if (template) {
    if (!transporter) {
      console.warn('⚠️  Email not sent - transporter not configured');
      return null;
    }

    return await transporter.sendMail({
      from: emailConfig.from,
      to: booking.to,
      subject: template.subject,
      html: template.html,
      attachments: attachments.length > 0 ? attachments : undefined
    });
  }

  // Fallback to hardcoded template
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .attachments { background-color: #dbeafe; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #1e40af; }
        .button { display: inline-block; padding: 10px 20px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmation</h1>
        </div>
        <div class="content">
          <p>Dear ${booking.customerName},</p>
          <p>Your booking has been successfully confirmed!</p>
          <div class="booking-details">
            <h3>Booking Details:</h3>
            <p><strong>Booking Code:</strong> ${booking.bookingCode}</p>
            <p><strong>Destination:</strong> ${booking.destination}</p>
            <p><strong>Check-in:</strong> ${new Date(booking.checkInDate).toLocaleDateString()}</p>
            <p><strong>Check-out:</strong> ${new Date(booking.checkOutDate).toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> €${(booking.totalAmount / 100).toFixed(2)}</p>
          </div>
          ${attachments.length > 0 ? `
          <div class="attachments">
            <h3>📎 Attached Documents:</h3>
            <ul>
              ${attachments.map(att => `<li>${att.filename}</li>`).join('\n              ')}
            </ul>
            <p><strong>Please save these documents and present them when required during your trip.</strong></p>
          </div>
          ` : `<p>Your travel documents will be sent to you shortly.</p>`}
          <p>Thank you for choosing MXi Travel Agency!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.warn('⚠️  Email not sent - transporter not configured');
    return null;
  }

  return await transporter.sendMail({
    from: emailConfig.from,
    to: booking.to,
    subject: `Booking Confirmation - ${booking.bookingCode}`,
    html,
    attachments: attachments.length > 0 ? attachments : undefined
  });
}

// Booking modification email
export async function sendModificationEmail(data: {
  to: string;
  bookingCode: string;
  customerName: string;
  checkInDate: string;
  checkOutDate: string;
  modificationReason: string;
  agentName: string;
}) {
  const variables = {
    customerName: data.customerName,
    bookingCode: data.bookingCode,
    checkInDate: new Date(data.checkInDate).toLocaleDateString(),
    checkOutDate: new Date(data.checkOutDate).toLocaleDateString(),
    modificationReason: data.modificationReason,
    agentName: data.agentName,
  };

  // Try to get template from database
  const template = await getEmailTemplate('booking-edited', variables);

  if (template) {
    return sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.html
    });
  }

  // Fallback to hardcoded template
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .modification-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .alert { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Modified</h1>
        </div>
        <div class="content">
          <p>Dear ${data.customerName},</p>
          <div class="alert">
            <strong>Important:</strong> Your booking has been modified by ${data.agentName}.
          </div>
          <div class="modification-details">
            <h3>Updated Booking Details:</h3>
            <p><strong>Booking Code:</strong> ${data.bookingCode}</p>
            <p><strong>New Check-in:</strong> ${new Date(data.checkInDate).toLocaleDateString()}</p>
            <p><strong>New Check-out:</strong> ${new Date(data.checkOutDate).toLocaleDateString()}</p>
            <p><strong>Modification Reason:</strong> ${data.modificationReason}</p>
          </div>
          <p>Updated travel documents will be sent to you shortly.</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.to,
    subject: `Booking Modified - ${data.bookingCode}`,
    html
  });
}

// New booking notification (for agent confirmation)
export async function sendConfirmationEmail(data: {
  to: string;
  bookingCode: string;
  customerName: string;
  checkInDate: string;
  checkOutDate: string;
  destination: string;
  totalAmount: number;
}) {
  const variables = {
    customerName: data.customerName,
    bookingCode: data.bookingCode,
    destination: data.destination,
    checkInDate: new Date(data.checkInDate).toLocaleDateString(),
    checkOutDate: new Date(data.checkOutDate).toLocaleDateString(),
    totalAmount: `€${(data.totalAmount / 100).toFixed(2)}`,
  };

  // Try to get template from database
  const template = await getEmailTemplate('new-booking', variables);

  if (template) {
    return sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.html
    });
  }

  // Fallback to hardcoded template
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .success { background-color: #d1fae5; border-left: 4px solid #10b981; padding: 10px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed!</h1>
        </div>
        <div class="content">
          <p>Dear ${data.customerName},</p>
          <div class="success">
            <strong>Great news!</strong> Your booking has been confirmed by our agent.
          </div>
          <div class="booking-details">
            <h3>Confirmed Booking Details:</h3>
            <p><strong>Booking Code:</strong> ${data.bookingCode}</p>
            <p><strong>Destination:</strong> ${data.destination}</p>
            <p><strong>Check-in:</strong> ${new Date(data.checkInDate).toLocaleDateString()}</p>
            <p><strong>Check-out:</strong> ${new Date(data.checkOutDate).toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> €${(data.totalAmount / 100).toFixed(2)}</p>
          </div>
          <p>Your travel documents are being prepared and will be sent shortly.</p>
          <p>Payment instructions will follow in a separate email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.to,
    subject: `✅ Booking Confirmed - ${data.bookingCode}`,
    html
  });
}

// Booking cancellation email
export async function sendCancellationEmail(data: {
  to: string;
  bookingCode: string;
  customerName: string;
  reason: string;
}) {
  const variables = {
    customerName: data.customerName,
    bookingCode: data.bookingCode,
    cancellationReason: data.reason,
  };

  // Try to get template from database
  const template = await getEmailTemplate('booking-cancelled', variables);

  if (template) {
    return sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.html
    });
  }

  // Fallback to hardcoded template
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .cancellation-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .alert { background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 10px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Cancelled</h1>
        </div>
        <div class="content">
          <p>Dear ${data.customerName},</p>
          <div class="alert">
            <strong>Important:</strong> Your booking has been cancelled.
          </div>
          <div class="cancellation-details">
            <h3>Cancellation Details:</h3>
            <p><strong>Booking Code:</strong> ${data.bookingCode}</p>
            <p><strong>Cancellation Reason:</strong> ${data.reason}</p>
          </div>
          <p>If you believe this is an error or would like to make a new booking, please contact our support team.</p>
          <p>We apologize for any inconvenience caused.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.to,
    subject: `Booking Cancelled - ${data.bookingCode}`,
    html
  });
}

// Payment received confirmation email
export async function sendPaymentReceivedEmail(data: {
  to: string;
  bookingCode: string;
  customerName: string;
  totalAmount: number;
}) {
  const variables = {
    customerName: data.customerName,
    bookingCode: data.bookingCode,
    totalAmount: `€${(data.totalAmount / 100).toFixed(2)}`,
  };

  // Try to get template from database
  const template = await getEmailTemplate('payment-received', variables);

  if (template) {
    return sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.html
    });
  }

  // Fallback to hardcoded template
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .payment-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .success { background-color: #d1fae5; border-left: 4px solid #10b981; padding: 10px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Received</h1>
        </div>
        <div class="content">
          <p>Dear ${data.customerName},</p>
          <div class="success">
            <strong>Great news!</strong> We have received your payment.
          </div>
          <div class="payment-details">
            <h3>Payment Details:</h3>
            <p><strong>Booking Code:</strong> ${data.bookingCode}</p>
            <p><strong>Amount Received:</strong> €${(data.totalAmount / 100).toFixed(2)}</p>
          </div>
          <p>Your booking is now fully confirmed and your travel documents will be sent shortly.</p>
          <p>Thank you for your payment!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.to,
    subject: `Payment Received - ${data.bookingCode}`,
    html
  });
}

// Payment sent confirmation email
export async function sendPaymentSentEmail(data: {
  to: string;
  bookingCode: string;
  customerName: string;
  totalAmount: number;
}) {
  const variables = {
    customerName: data.customerName,
    bookingCode: data.bookingCode,
    totalAmount: `€${(data.totalAmount / 100).toFixed(2)}`,
  };

  // Try to get template from database
  const template = await getEmailTemplate('payment-sent', variables);

  if (template) {
    return sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.html
    });
  }

  // Fallback to hardcoded template
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .payment-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .info { background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 10px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Confirmation</h1>
        </div>
        <div class="content">
          <p>Dear ${data.customerName},</p>
          <div class="info">
            <strong>Thank you!</strong> We have received your payment notification.
          </div>
          <div class="payment-details">
            <h3>Payment Details:</h3>
            <p><strong>Booking Code:</strong> ${data.bookingCode}</p>
            <p><strong>Amount:</strong> €${(data.totalAmount / 100).toFixed(2)}</p>
          </div>
          <p>We will verify your payment and confirm your booking shortly.</p>
          <p>You will receive a confirmation email once payment is verified.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.to,
    subject: `Payment Sent - ${data.bookingCode}`,
    html
  });
}

// Welcome email for new users
export async function sendWelcomeEmail(data: {
  to: string;
  customerName: string;
  customerEmail: string;
}) {
  const variables = {
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    websiteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://vav.al',
  };

  // Try to get template from database
  const template = await getEmailTemplate('welcome', variables);

  if (template) {
    return sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.html
    });
  }

  // Fallback to hardcoded template
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .welcome-box { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .button { display: inline-block; padding: 10px 20px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Max Travel!</h1>
        </div>
        <div class="content">
          <p>Dear ${data.customerName},</p>
          <div class="welcome-box">
            <p>Thank you for registering with Max Travel. We're excited to help you plan your next adventure!</p>
            <p>Your account has been successfully created with email: <strong>${data.customerEmail}</strong></p>
          </div>
          <p>You can now browse our packages, create bookings, and manage your reservations.</p>
          <p>If you have any questions, feel free to contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.to,
    subject: 'Welcome to Max Travel!',
    html
  });
}