'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import RichTextEditor from '@/components/RichTextEditor';

// Default templates with pre-populated content
const defaultTemplates: Record<string, { subject: string; html: string; variables: string[] }> = {
  'welcome': {
    subject: 'Welcome to Max Travel!',
    html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Max Travel!</h1>
    </div>
    <div class="content">
      <p>Dear {{customerName}},</p>
      <p>Thank you for registering with Max Travel! We're excited to have you join our community of travelers.</p>
      <p>With your account, you can:</p>
      <ul>
        <li>Browse exclusive city break packages</li>
        <li>Make bookings with ease</li>
        <li>Track your reservations</li>
        <li>Receive special offers and deals</li>
      </ul>
      <p>Start exploring amazing destinations today!</p>
      <a href="{{websiteUrl}}" class="button">Explore Packages</a>
      <p style="margin-top: 30px;">If you have any questions, feel free to reach out to our support team.</p>
      <p>Happy travels!<br>The Max Travel Team</p>
    </div>
  </div>
</body>
</html>`,
    variables: ['customerName', 'customerEmail', 'websiteUrl'],
  },
  'new-booking': {
    subject: 'Booking Received - {{bookingCode}}',
    html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #1e40af; }
    .alert { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Received</h1>
    </div>
    <div class="content">
      <p>Dear {{customerName}},</p>
      <p>Thank you for your booking! We have received your reservation and it is currently being processed.</p>

      <div class="booking-details">
        <h3>Booking Details:</h3>
        <p><strong>Booking Code:</strong> {{bookingCode}}</p>
        <p><strong>Destination:</strong> {{destination}}</p>
        <p><strong>Check-in:</strong> {{checkInDate}}</p>
        <p><strong>Check-out:</strong> {{checkOutDate}}</p>
        <p><strong>Passengers:</strong> {{adults}} Adult(s), {{children}} Child(ren)</p>
        <p><strong>Total Amount:</strong> €{{totalAmount}}</p>
      </div>

      <div class="alert">
        <strong>Important:</strong> This booking will be held for 3 hours. Our team will review and confirm your booking shortly.
      </div>

      <p>You will receive a confirmation email once your booking is approved by our team.</p>
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <p>Best regards,<br>Max Travel Team<br>Phone: +383 49 754 754 | +389 76 754 754</p>
    </div>
  </div>
</body>
</html>`,
    variables: ['customerName', 'bookingCode', 'destination', 'checkInDate', 'checkOutDate', 'adults', 'children', 'totalAmount'],
  },
  'payment-sent': {
    subject: 'Payment Confirmation - {{bookingCode}}',
    html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .payment-box { background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Sent Confirmation</h1>
    </div>
    <div class="content">
      <p>Dear {{customerName}},</p>
      <p>This confirms that we have received notice of your payment for booking {{bookingCode}}.</p>

      <div class="payment-box">
        <h3>Payment Details:</h3>
        <p><strong>Booking Code:</strong> {{bookingCode}}</p>
        <p><strong>Amount:</strong> €{{totalAmount}}</p>
        <p><strong>Payment Method:</strong> Wire Transfer</p>
      </div>

      <p>Your payment is currently being verified. Once confirmed, you will receive your final booking confirmation with travel documents.</p>
      <p>This typically takes 1-2 business days.</p>

      <p>Thank you for choosing Max Travel!</p>
      <p>Best regards,<br>Max Travel Team</p>
    </div>
  </div>
</body>
</html>`,
    variables: ['customerName', 'bookingCode', 'totalAmount', 'paymentDate'],
  },
  'payment-received': {
    subject: 'Payment Received - {{bookingCode}}',
    html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .success { background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Payment Received!</h1>
    </div>
    <div class="content">
      <p>Dear {{customerName}},</p>

      <div class="success">
        <h3>Great news!</h3>
        <p>Your payment of <strong>€{{totalAmount}}</strong> has been successfully received and confirmed.</p>
      </div>

      <p><strong>Booking Code:</strong> {{bookingCode}}</p>
      <p>Your booking is now fully confirmed! Your travel documents are attached to this email.</p>

      <p><strong>What's Next:</strong></p>
      <ul>
        <li>Review your attached flight tickets and hotel voucher</li>
        <li>Arrive at the airport at least 2 hours before departure</li>
        <li>Bring your passport and booking confirmation</li>
        <li>Contact us if you have any questions</li>
      </ul>

      <p>We wish you a wonderful trip!</p>
      <p>Best regards,<br>Max Travel Team<br>Phone: +383 49 754 754 | +389 76 754 754</p>
    </div>
  </div>
</body>
</html>`,
    variables: ['customerName', 'bookingCode', 'totalAmount', 'destination', 'checkInDate'],
  },
  'booking-confirmation': {
    subject: 'Booking Confirmed - {{bookingCode}} - Travel Documents Attached',
    html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .success { background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
    .attachments { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Booking Confirmed!</h1>
    </div>
    <div class="content">
      <p>Dear {{customerName}},</p>

      <div class="success">
        <h3>Your booking is confirmed!</h3>
        <p><strong>Booking Code:</strong> {{bookingCode}}</p>
        <p><strong>Destination:</strong> {{destination}}</p>
        <p><strong>Travel Dates:</strong> {{checkInDate}} to {{checkOutDate}}</p>
      </div>

      <div class="attachments">
        <h3>📎 Attached Documents:</h3>
        <ul>
          <li><strong>Flight Tickets</strong> - Present at check-in</li>
          <li><strong>Hotel Voucher</strong> - Present at hotel reception</li>
        </ul>
        <p style="color: #dc2626; font-weight: bold;">⚠️ Please print or save these documents on your mobile device</p>
      </div>

      <p><strong>Important Reminders:</strong></p>
      <ul>
        <li>Arrive at airport 2 hours before departure</li>
        <li>Passport must be valid for at least 6 months</li>
        <li>Check-in time: After 3:00 PM</li>
        <li>Check-out time: Before 12:00 PM</li>
      </ul>

      <p>Have a wonderful trip!</p>
      <p>Best regards,<br>Max Travel Team<br>24/7 Support: +383 49 754 754 | +389 76 754 754</p>
    </div>
  </div>
</body>
</html>`,
    variables: ['customerName', 'bookingCode', 'destination', 'checkInDate', 'checkOutDate', 'hotelName'],
  },
  'booking-cancelled': {
    subject: 'Booking Cancelled - {{bookingCode}}',
    html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .alert { background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Cancelled</h1>
    </div>
    <div class="content">
      <p>Dear {{customerName}},</p>

      <div class="alert">
        <h3>Your booking has been cancelled</h3>
        <p><strong>Booking Code:</strong> {{bookingCode}}</p>
        <p><strong>Reason:</strong> {{cancellationReason}}</p>
      </div>

      <p>We're sorry to see this booking cancelled. If this was a mistake or you'd like to make a new booking, please don't hesitate to contact us.</p>

      <p>If you have any questions about this cancellation, our team is here to help.</p>

      <p>We hope to serve you again in the future!</p>
      <p>Best regards,<br>Max Travel Team<br>Phone: +383 49 754 754 | +389 76 754 754</p>
    </div>
  </div>
</body>
</html>`,
    variables: ['customerName', 'bookingCode', 'cancellationReason'],
  },
  'booking-edited': {
    subject: 'Booking Modified - {{bookingCode}}',
    html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .alert { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
    .changes { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Modified</h1>
    </div>
    <div class="content">
      <p>Dear {{customerName}},</p>

      <div class="alert">
        <strong>Important:</strong> Your booking has been modified by {{agentName}}.
      </div>

      <div class="changes">
        <h3>Updated Booking Details:</h3>
        <p><strong>Booking Code:</strong> {{bookingCode}}</p>
        <p><strong>Destination:</strong> {{destination}}</p>
        <p><strong>Check-in:</strong> {{checkInDate}}</p>
        <p><strong>Check-out:</strong> {{checkOutDate}}</p>
        <p><strong>Total Amount:</strong> €{{totalAmount}}</p>
        <p><strong>Modification Reason:</strong> {{modificationReason}}</p>
      </div>

      <p>Updated travel documents will be sent to you shortly.</p>
      <p>If you have any questions about these changes, please contact our support team.</p>

      <p>Best regards,<br>Max Travel Team<br>Phone: +383 49 754 754 | +389 76 754 754</p>
    </div>
  </div>
</body>
</html>`,
    variables: ['customerName', 'bookingCode', 'destination', 'checkInDate', 'checkOutDate', 'totalAmount', 'agentName', 'modificationReason'],
  },
};

export default function EmailTemplateEditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const templateName = params?.templateName as string;

  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    loadTemplate();
  }, [session, status, router, templateName]);

  const loadTemplate = async () => {
    try {
      const response = await fetch(`/api/admin/email-templates/${templateName}`);

      if (response.ok) {
        const data = await response.json();
        setSubject(data.subject);
        setHtmlContent(data.htmlContent);
        setDescription(data.description || '');
      } else {
        // Load default template
        const defaultTemplate = defaultTemplates[templateName];
        if (defaultTemplate) {
          setSubject(defaultTemplate.subject);
          setHtmlContent(defaultTemplate.html);
          setDescription('');
        }
      }
    } catch (error) {
      console.error('Error loading template:', error);
      // Load default template on error
      const defaultTemplate = defaultTemplates[templateName];
      if (defaultTemplate) {
        setSubject(defaultTemplate.subject);
        setHtmlContent(defaultTemplate.html);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/email-templates/${templateName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          htmlContent,
          description,
          variables: defaultTemplates[templateName]?.variables || [],
        }),
      });

      if (response.ok) {
        alert('Template saved successfully!');
      } else {
        alert('Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }

  const templateTitle = Object.keys(defaultTemplates).includes(templateName)
    ? templateName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Email Template';

  const availableVariables = defaultTemplates[templateName]?.variables || [];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <Link
              href="/admin/email-templates"
              className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
            >
              ← Back to Templates
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Edit: {templateTitle}</h1>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/email-templates"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subject */}
            <div className="bg-white shadow rounded-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Subject line..."
              />
            </div>

            {/* Description */}
            <div className="bg-white shadow rounded-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Template description..."
              />
            </div>

            {/* HTML Content */}
            <div className="bg-white shadow rounded-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Content (HTML)
              </label>
              <RichTextEditor
                content={htmlContent}
                onChange={setHtmlContent}
                placeholder="Email content..."
              />
            </div>
          </div>

          {/* Sidebar - Variables */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Variables</h3>
              <p className="text-sm text-gray-600 mb-4">
                Click to copy to clipboard:
              </p>
              <div className="space-y-2">
                {availableVariables.map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`{{${variable}}}`);
                      alert(`Copied {{${variable}}} to clipboard!`);
                    }}
                    className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 text-sm font-mono"
                  >
                    {`{{${variable}}}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use variables for dynamic content</li>
                <li>• Keep subject lines under 50 characters</li>
                <li>• Test on mobile devices</li>
                <li>• Use clear call-to-action buttons</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
