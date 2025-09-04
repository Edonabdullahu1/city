import nodemailer from 'nodemailer';

// Create transporter with Mailgun SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.mailgun.org',
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAILGUN_SMTP_USER || '',
    pass: process.env.MAILGUN_SMTP_PASSWORD || ''
  }
});

interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Send email function
async function sendEmail(template: EmailTemplate) {
  try {
    const info = await transporter.sendMail({
      from: '"MXi Travel Agency" <bookings@mxitravel.com>',
      ...template
    });
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

// Booking confirmation email
export async function sendBookingConfirmationEmail(booking: {
  to: string;
  bookingCode: string;
  customerName: string;
  checkInDate: string;
  checkOutDate: string;
  destination: string;
  totalAmount: number;
}) {
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
          <p>Your travel documents will be sent to you shortly.</p>
          <p>Thank you for choosing MXi Travel Agency!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: booking.to,
    subject: `Booking Confirmation - ${booking.bookingCode}`,
    html
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

// Booking confirmation email (for agent confirmation)
export async function sendConfirmationEmail(data: {
  to: string;
  bookingCode: string;
  customerName: string;
  checkInDate: string;
  checkOutDate: string;
  destination: string;
  totalAmount: number;
}) {
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

// Payment reminder email
export async function sendPaymentReminderEmail(data: {
  to: string;
  bookingCode: string;
  customerName: string;
  totalAmount: number;
  dueDate: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #6366f1; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .payment-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .button { display: inline-block; padding: 10px 20px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Reminder</h1>
        </div>
        <div class="content">
          <p>Dear ${data.customerName},</p>
          <p>This is a friendly reminder that payment for your booking is due soon.</p>
          <div class="payment-details">
            <h3>Payment Details:</h3>
            <p><strong>Booking Code:</strong> ${data.bookingCode}</p>
            <p><strong>Amount Due:</strong> €${(data.totalAmount / 100).toFixed(2)}</p>
            <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>
          </div>
          <p>Please ensure payment is made by the due date to secure your booking.</p>
          <p>If you have already made the payment, please disregard this reminder.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.to,
    subject: `Payment Reminder - ${data.bookingCode}`,
    html
  });
}