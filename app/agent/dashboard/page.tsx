'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  TrendingUp,
  Edit3,
  FileText,
  Search,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface AgentStats {
  totalBookings: number;
  totalCommission: number;
  monthlyBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  recentBookings: any[];
}

export default function AgentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<AgentStats>({
    totalBookings: 0,
    totalCommission: 0,
    monthlyBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    recentBookings: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || (session.user.role !== 'AGENT' && session.user.role !== 'ADMIN')) {
      router.push('/dashboard');
      return;
    }

    fetchAgentStats();
  }, [session, status, router]);

  const fetchAgentStats = async () => {
    try {
      // Mock data for now
      setStats({
        totalBookings: 45,
        totalCommission: 3250.50,
        monthlyBookings: 12,
        pendingBookings: 3,
        confirmedBookings: 38,
        recentBookings: [
          { reservationCode: 'MXi-0045', customerName: 'John Smith', status: 'CONFIRMED', totalAmount: 1250 },
          { reservationCode: 'MXi-0044', customerName: 'Jane Doe', status: 'SOFT', totalAmount: 980 },
          { reservationCode: 'MXi-0043', customerName: 'Bob Wilson', status: 'PAID', totalAmount: 2100 },
        ]
      });
    } catch (error) {
      console.error('Failed to fetch agent stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SOFT':
        return 'text-yellow-600 bg-yellow-50';
      case 'CONFIRMED':
        return 'text-blue-600 bg-blue-50';
      case 'PAID':
        return 'text-green-600 bg-green-50';
      case 'CANCELLED':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
              <p className="mt-2 text-gray-600">Welcome back, {session?.user?.name || session?.user?.email}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/agent/bookings/modify"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Edit3 className="h-5 w-5 mr-2" />
                Modify Booking
              </Link>
              <Link
                href="/booking"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <Calendar className="h-5 w-5 mr-2" />
                New Booking
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              href="/agent/bookings/modify"
              className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow flex items-center"
            >
              <Edit3 className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Modify Booking</p>
                <p className="text-sm text-gray-500">Edit customer bookings</p>
              </div>
            </Link>
            <Link
              href="/booking"
              className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow flex items-center"
            >
              <Calendar className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">New Booking</p>
                <p className="text-sm text-gray-500">Create a reservation</p>
              </div>
            </Link>
            <Link
              href="/bookings/search"
              className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow flex items-center"
            >
              <Search className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Search Bookings</p>
                <p className="text-sm text-gray-500">Find reservations</p>
              </div>
            </Link>
            <Link
              href="/agent/reports"
              className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow flex items-center"
            >
              <FileText className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Reports</p>
                <p className="text-sm text-gray-500">View performance</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalBookings}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Commission</p>
                <p className="text-3xl font-bold text-gray-900">€{stats.totalCommission.toFixed(2)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-3xl font-bold text-gray-900">{stats.monthlyBookings}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pendingBookings}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmed</p>
                <p className="text-3xl font-bold text-gray-900">{stats.confirmedBookings}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reservation Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentBookings.map((booking) => (
                  <tr key={booking.reservationCode}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{booking.reservationCode}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-700">{booking.customerName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-700">€{booking.totalAmount.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/bookings/${booking.reservationCode}`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </Link>
                      <Link
                        href={`/agent/bookings/modify?code=${booking.reservationCode}`}
                        className="text-green-600 hover:text-green-900"
                      >
                        Modify
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t">
            <Link
              href="/agent/bookings"
              className="text-blue-600 hover:text-blue-900 font-medium"
            >
              View All Bookings →
            </Link>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex">
            <AlertCircle className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">Agent Tips</h3>
              <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                <li>Always verify customer information before modifying bookings</li>
                <li>Document reasons for all booking modifications</li>
                <li>Check availability before making date changes</li>
                <li>Inform customers immediately of any booking changes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}