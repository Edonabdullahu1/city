'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  Users,
  Calendar,
  TrendingUp,
  Plane,
  Hotel,
  Car,
  Map,
  LogOut,
  Menu,
  X,
  Settings,
  Mail
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  updatedAt: string;
}

export default function EmailTemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

    fetchTemplates();
  }, [session, status, router]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/email-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
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

  const templateTypes = [
    {
      name: 'welcome',
      title: 'New User Welcome Email',
      description: 'Sent when a new user registers',
    },
    {
      name: 'new-booking',
      title: 'New Booking',
      description: 'Sent when a new booking is created',
    },
    {
      name: 'payment-sent',
      title: 'Payment Sent Confirmation',
      description: 'Sent to customer confirming payment was sent',
    },
    {
      name: 'payment-received',
      title: 'Payment Received Confirmation',
      description: 'Sent when payment is confirmed received',
    },
    {
      name: 'booking-confirmation',
      title: 'Booking Confirmation',
      description: 'Sent with attached PDF flight ticket and hotel voucher',
    },
    {
      name: 'booking-cancelled',
      title: 'Booking Cancelled',
      description: 'Sent when a booking is cancelled',
    },
    {
      name: 'booking-edited',
      title: 'Booking Edited',
      description: 'Sent when booking details are modified',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
        <div className="flex items-center justify-between h-16 px-6 bg-gray-800">
          <h2 className="text-xl font-semibold text-white">Admin Panel</h2>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white lg:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-6">
          <Link href="/admin/dashboard" className="flex items-center px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-800">
            <TrendingUp className="h-5 w-5 mr-3" />
            Dashboard
          </Link>
          <Link href="/admin/bookings" className="flex items-center px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-800">
            <Calendar className="h-5 w-5 mr-3" />
            Bookings
          </Link>
          <Link href="/admin/flights" className="flex items-center px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-800">
            <Plane className="h-5 w-5 mr-3" />
            Flights
          </Link>
          <Link href="/admin/hotels" className="flex items-center px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-800">
            <Hotel className="h-5 w-5 mr-3" />
            Hotels
          </Link>
          <Link href="/admin/transfers" className="flex items-center px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-800">
            <Car className="h-5 w-5 mr-3" />
            Transfers
          </Link>
          <Link href="/admin/excursions" className="flex items-center px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-800">
            <Map className="h-5 w-5 mr-3" />
            Excursions
          </Link>
          <Link href="/admin/users" className="flex items-center px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-800">
            <Users className="h-5 w-5 mr-3" />
            Users
          </Link>
          <Link href="/admin/email-templates" className="flex items-center px-6 py-3 text-white bg-gray-800 border-l-4 border-blue-500">
            <Mail className="h-5 w-5 mr-3" />
            Email Templates
          </Link>
          <Link href="/admin/settings" className="flex items-center px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-800">
            <Settings className="h-5 w-5 mr-3" />
            Settings
          </Link>
        </nav>

        <div className="absolute bottom-0 w-64 p-6">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center text-gray-400 hover:text-white"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${sidebarOpen ? 'ml-64' : 'ml-0'} transition-margin duration-300 ease-in-out`}>
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="ml-4 text-2xl font-semibold text-gray-800">Email Templates</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">{session?.user?.name}</span>
              <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </header>

        <div className="p-6">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              Manage email templates sent to customers. Click on a template to edit its content.
            </p>

            <div className="grid gap-4">
              {templateTypes.map((template) => {
                const existingTemplate = templates.find(t => t.name === template.name);

                return (
                  <Link
                    key={template.name}
                    href={`/admin/email-templates/${template.name}`}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {template.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        {existingTemplate && (
                          <p className="text-xs text-gray-500">
                            Last updated: {new Date(existingTemplate.updatedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          existingTemplate
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {existingTemplate ? 'Configured' : 'Using Default'}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Available Variables Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Available Variables</h3>
          <p className="text-sm text-blue-800 mb-3">
            You can use these variables in your email templates. They will be automatically replaced with actual values:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <code className="bg-white px-2 py-1 rounded">{`{{customerName}}`}</code>
            <code className="bg-white px-2 py-1 rounded">{`{{bookingCode}}`}</code>
            <code className="bg-white px-2 py-1 rounded">{`{{destination}}`}</code>
            <code className="bg-white px-2 py-1 rounded">{`{{checkInDate}}`}</code>
            <code className="bg-white px-2 py-1 rounded">{`{{checkOutDate}}`}</code>
            <code className="bg-white px-2 py-1 rounded">{`{{totalAmount}}`}</code>
            <code className="bg-white px-2 py-1 rounded">{`{{agentName}}`}</code>
            <code className="bg-white px-2 py-1 rounded">{`{{modificationReason}}`}</code>
            <code className="bg-white px-2 py-1 rounded">{`{{cancellationReason}}`}</code>
            <code className="bg-white px-2 py-1 rounded">{`{{dueDate}}`}</code>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
