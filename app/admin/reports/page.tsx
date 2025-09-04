'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CalendarIcon, ChartBarIcon, DocumentArrowDownIcon, CurrencyEuroIcon, UsersIcon, TicketIcon } from '@heroicons/react/24/outline';
import AdminLayout from '@/components/AdminLayout';

interface ReportStats {
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  topDestinations: { destination: string; count: number; revenue: number }[];
  bookingsByMonth: { month: string; count: number; revenue: number }[];
  bookingsByStatus: { status: string; count: number; percentage: number }[];
  agentPerformance: { name: string; bookings: number; revenue: number; commission: number }[];
}

export default function AdminReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState<'overview' | 'sales' | 'agents' | 'customers'>('overview');

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/');
    } else if (session) {
      fetchReportData();
    }
  }, [status, session, router, dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        type: reportType
      });

      const response = await fetch(`/api/admin/reports?${params}`);
      if (!response.ok) throw new Error('Failed to fetch report data');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format: 'csv' | 'pdf') => {
    if (!stats) return;

    if (format === 'csv') {
      let csv = '';
      
      switch (reportType) {
        case 'overview':
          csv = [
            ['Booking Reports', `${dateRange.startDate} to ${dateRange.endDate}`].join(','),
            [''],
            ['Total Bookings', stats.totalBookings].join(','),
            ['Total Revenue', `€${stats.totalRevenue.toFixed(2)}`].join(','),
            ['Average Booking Value', `€${stats.averageBookingValue.toFixed(2)}`].join(','),
            [''],
            ['Top Destinations'].join(','),
            ['Destination', 'Bookings', 'Revenue'].join(','),
            ...stats.topDestinations.map(d => [d.destination, d.count, `€${d.revenue.toFixed(2)}`].join(','))
          ].join('\n');
          break;
        
        case 'sales':
          csv = [
            ['Sales Report', `${dateRange.startDate} to ${dateRange.endDate}`].join(','),
            [''],
            ['Month', 'Bookings', 'Revenue'].join(','),
            ...stats.bookingsByMonth.map(m => [m.month, m.count, `€${m.revenue.toFixed(2)}`].join(','))
          ].join('\n');
          break;
        
        case 'agents':
          csv = [
            ['Agent Performance Report', `${dateRange.startDate} to ${dateRange.endDate}`].join(','),
            [''],
            ['Agent', 'Bookings', 'Revenue', 'Commission'].join(','),
            ...stats.agentPerformance.map(a => [a.name, a.bookings, `€${a.revenue.toFixed(2)}`, `€${a.commission.toFixed(2)}`].join(','))
          ].join('\n');
          break;
      }

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report-${dateRange.startDate}-${dateRange.endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      // PDF export would require a library like jsPDF or server-side generation
      alert('PDF export will be implemented with a PDF library');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-2">Comprehensive booking and revenue reports</p>
          </div>

          {/* Report Type Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {['overview', 'sales', 'agents', 'customers'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setReportType(type as any)}
                    className={`py-4 px-6 text-sm font-medium capitalize border-b-2 ${
                      reportType === type
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {type} Report
                  </button>
                ))}
              </nav>
            </div>

            {/* Date Range Filters */}
            <div className="p-6 flex items-center justify-between border-b">
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={fetchReportData}
                  className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Generate Report
                </button>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => exportReport('csv')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Export CSV
                </button>
                <button
                  onClick={() => exportReport('pdf')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Export PDF
                </button>
              </div>
            </div>
          </div>

          {stats && (
            <>
              {/* Overview Report */}
              {reportType === 'overview' && (
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Bookings</p>
                          <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
                        </div>
                        <TicketIcon className="h-10 w-10 text-blue-500" />
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Revenue</p>
                          <p className="text-2xl font-bold text-gray-900">€{stats.totalRevenue.toFixed(2)}</p>
                        </div>
                        <CurrencyEuroIcon className="h-10 w-10 text-green-500" />
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Avg. Booking Value</p>
                          <p className="text-2xl font-bold text-gray-900">€{stats.averageBookingValue.toFixed(2)}</p>
                        </div>
                        <ChartBarIcon className="h-10 w-10 text-purple-500" />
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Conversion Rate</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {stats.bookingsByStatus.find(s => s.status === 'CONFIRMED')?.percentage || 0}%
                          </p>
                        </div>
                        <UsersIcon className="h-10 w-10 text-orange-500" />
                      </div>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Destinations */}
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-lg font-semibold mb-4">Top Destinations</h3>
                      <div className="space-y-3">
                        {stats.topDestinations.map((dest, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-2xl font-bold text-gray-400 mr-3">#{index + 1}</span>
                              <div>
                                <p className="font-medium">{dest.destination}</p>
                                <p className="text-sm text-gray-600">{dest.count} bookings</p>
                              </div>
                            </div>
                            <p className="text-lg font-semibold">€{dest.revenue.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Booking Status Distribution */}
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-lg font-semibold mb-4">Booking Status</h3>
                      <div className="space-y-3">
                        {stats.bookingsByStatus.map((status) => (
                          <div key={status.status}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">{status.status}</span>
                              <span className="text-sm text-gray-600">{status.count} ({status.percentage}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  status.status === 'CONFIRMED' ? 'bg-green-500' :
                                  status.status === 'PAID' ? 'bg-blue-500' :
                                  status.status === 'SOFT' ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${status.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Monthly Trend */}
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Monthly Performance</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Month</th>
                            <th className="text-right py-2">Bookings</th>
                            <th className="text-right py-2">Revenue</th>
                            <th className="text-right py-2">Growth</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.bookingsByMonth.map((month, index) => {
                            const prevMonth = stats.bookingsByMonth[index - 1];
                            const growth = prevMonth ? ((month.revenue - prevMonth.revenue) / prevMonth.revenue * 100) : 0;
                            return (
                              <tr key={month.month} className="border-b">
                                <td className="py-3">{month.month}</td>
                                <td className="text-right">{month.count}</td>
                                <td className="text-right">€{month.revenue.toFixed(2)}</td>
                                <td className="text-right">
                                  <span className={`font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Agent Performance Report */}
              {reportType === 'agents' && (
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Agent Performance</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3">Agent Name</th>
                            <th className="text-right py-3">Total Bookings</th>
                            <th className="text-right py-3">Revenue Generated</th>
                            <th className="text-right py-3">Commission (10%)</th>
                            <th className="text-right py-3">Avg. Booking Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.agentPerformance.map((agent) => (
                            <tr key={agent.name} className="border-b hover:bg-gray-50">
                              <td className="py-4 font-medium">{agent.name}</td>
                              <td className="text-right">{agent.bookings}</td>
                              <td className="text-right">€{agent.revenue.toFixed(2)}</td>
                              <td className="text-right text-green-600">€{agent.commission.toFixed(2)}</td>
                              <td className="text-right">€{(agent.revenue / agent.bookings).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
    </AdminLayout>
  );
}