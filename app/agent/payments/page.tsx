'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  CurrencyEuroIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import AgentSidebar from '@/components/AgentSidebar';

interface PaymentPending {
  id: string;
  reservationCode: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  status: string;
  checkInDate: string;
  destination: string;
  createdAt: string;
  confirmedAt: string;
}

export default function PaymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pendingPayments, setPendingPayments] = useState<PaymentPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<PaymentPending | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    transactionId: '',
    bankName: '',
    paymentDate: '',
    amount: '',
    notes: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'AGENT')) {
      router.push('/');
    } else if (session) {
      fetchPendingPayments();
    }
  }, [status, session, router]);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agent/payments/pending');
      if (!response.ok) throw new Error('Failed to fetch pending payments');
      const data = await response.json();
      setPendingPayments(data.bookings || []);
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      setPendingPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    try {
      const response = await fetch(`/api/agent/payments/${selectedBooking.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentData,
          amount: parseFloat(paymentData.amount) * 100 // Convert to cents
        })
      });

      if (!response.ok) throw new Error('Failed to confirm payment');
      
      await fetchPendingPayments();
      setShowPaymentModal(false);
      setSelectedBooking(null);
      alert('Payment confirmed successfully!');
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Failed to confirm payment');
    }
  };

  const handleSendReminder = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/agent/payments/${bookingId}/reminder`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to send reminder');
      
      alert('Payment reminder sent successfully!');
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Failed to send payment reminder');
    }
  };

  const bankDetails = {
    accountName: 'MXi Travel Agency Ltd.',
    accountNumber: 'ES91 2100 0418 4502 0005 1332',
    bankName: 'Banco Santander',
    swiftCode: 'BSCHESMM',
    reference: 'Booking reference code'
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-screen">
        <AgentSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AgentSidebar />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
            <p className="text-gray-600 mt-2">Confirm payments and manage pending transactions</p>
          </div>

          {/* Bank Details Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <BanknotesIcon className="h-6 w-6 text-blue-600 mt-1 mr-3" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Wire Transfer Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700 font-medium">Account Name:</p>
                    <p className="text-blue-900">{bankDetails.accountName}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium">IBAN:</p>
                    <p className="text-blue-900 font-mono">{bankDetails.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium">Bank:</p>
                    <p className="text-blue-900">{bankDetails.bankName}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium">SWIFT Code:</p>
                    <p className="text-blue-900 font-mono">{bankDetails.swiftCode}</p>
                  </div>
                </div>
                <p className="text-blue-700 mt-3 text-sm">
                  <span className="font-medium">Reference:</span> Use the booking reservation code as payment reference
                </p>
              </div>
            </div>
          </div>

          {/* Pending Payments Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">Pending Payments</h2>
            </div>
            
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount Due
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Pending
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingPayments.map((payment) => {
                  const daysPending = Math.floor(
                    (new Date().getTime() - new Date(payment.confirmedAt).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.reservationCode}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.destination} - {new Date(payment.checkInDate).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.customerName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.customerEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-medium text-gray-900">
                          <CurrencyEuroIcon className="h-4 w-4 mr-1 text-gray-400" />
                          €{(payment.totalAmount / 100).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1 text-yellow-500" />
                          <span className={`text-sm font-medium ${
                            daysPending > 7 ? 'text-red-600' : 
                            daysPending > 3 ? 'text-yellow-600' : 
                            'text-gray-600'
                          }`}>
                            {daysPending} days
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedBooking(payment);
                            setPaymentData({
                              ...paymentData,
                              amount: (payment.totalAmount / 100).toString()
                            });
                            setShowPaymentModal(true);
                          }}
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Confirm Payment"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleSendReminder(payment.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Send Reminder"
                        >
                          <DocumentTextIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => router.push(`/bookings/${payment.reservationCode}`)}
                          className="text-gray-600 hover:text-gray-900"
                          title="View Booking"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {pendingPayments.length === 0 && (
              <div className="text-center py-12">
                <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">No pending payments</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">
              Confirm Payment
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Booking Code</p>
              <p className="font-semibold">{selectedBooking.reservationCode}</p>
              <p className="text-sm text-gray-600 mt-2 mb-1">Customer</p>
              <p className="font-semibold">{selectedBooking.customerName}</p>
            </div>
            
            <form onSubmit={handleConfirmPayment}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentData.transactionId}
                    onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Bank transaction reference"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentData.bankName}
                    onChange={(e) => setPaymentData({ ...paymentData, bankName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedBooking(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}