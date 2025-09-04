'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Edit3, 
  Calendar, 
  Users, 
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  Save,
  X,
  FileText,
  RefreshCw
} from 'lucide-react';

interface Booking {
  id: string;
  reservationCode: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  modificationHistory?: ModificationHistory[];
}

interface ModificationHistory {
  id: string;
  modifiedBy: string;
  modifiedAt: string;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
}

export default function AgentBookingModifyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchCode, setSearchCode] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [modificationReason, setModificationReason] = useState('');
  const [editedBooking, setEditedBooking] = useState<Partial<Booking>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || (session.user.role !== 'AGENT' && session.user.role !== 'ADMIN')) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  const searchBooking = async () => {
    if (!searchCode.trim()) {
      setError('Please enter a reservation code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setBooking(null);
    
    try {
      const response = await fetch(`/api/agent/bookings/search?code=${searchCode}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Booking not found');
      }
      
      setBooking(data);
      setEditedBooking(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setEditedBooking(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveModifications = async () => {
    if (!modificationReason.trim()) {
      setError('Please provide a reason for the modification');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Collect changes
      const changes: any[] = [];
      
      if (booking) {
        Object.keys(editedBooking).forEach(key => {
          if (editedBooking[key as keyof Booking] !== booking[key as keyof Booking]) {
            changes.push({
              field: key,
              oldValue: booking[key as keyof Booking],
              newValue: editedBooking[key as keyof Booking]
            });
          }
        });
      }

      if (changes.length === 0) {
        setError('No changes detected');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/agent/bookings/${booking?.reservationCode}/modify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changes: editedBooking,
          modifications: changes,
          reason: modificationReason,
          modifiedBy: session?.user?.email
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save modifications');
      }

      setSuccess('Booking modified successfully');
      setBooking(data);
      setEditedBooking(data);
      setEditing(false);
      setModificationReason('');
      
      // Trigger document regeneration
      await regenerateDocuments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const regenerateDocuments = async () => {
    try {
      await fetch(`/api/agent/bookings/${booking?.reservationCode}/regenerate-documents`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Failed to regenerate documents:', err);
    }
  };

  const cancelModifications = () => {
    setEditedBooking(booking || {});
    setEditing(false);
    setModificationReason('');
    setError('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SOFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Booking Modifications</h1>
          <p className="mt-2 text-gray-600">Search and modify customer bookings</p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Enter reservation code (e.g., MXi-0001)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && searchBooking()}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={searchBooking}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800">{success}</span>
            </div>
          )}
        </div>

        {/* Booking Details */}
        {booking && (
          <div className="bg-white rounded-lg shadow-sm">
            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Reservation: {booking.reservationCode}
                </h2>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
              <div className="flex gap-2">
                {!editing ? (
                  <>
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      History
                    </button>
                    <button
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Modify
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={cancelModifications}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                    <button
                      onClick={saveModifications}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Customer Information */}
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={editing ? editedBooking.customerName || '' : booking.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    disabled={!editing}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      editing ? 'border-blue-300 focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 cursor-not-allowed'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editing ? editedBooking.customerEmail || '' : booking.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    disabled={!editing}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      editing ? 'border-blue-300 focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 cursor-not-allowed'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editing ? editedBooking.customerPhone || '' : booking.customerPhone}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    disabled={!editing}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      editing ? 'border-blue-300 focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Travel Details */}
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Travel Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    value={editing ? editedBooking.checkIn || '' : booking.checkIn}
                    onChange={(e) => handleInputChange('checkIn', e.target.value)}
                    disabled={!editing}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      editing ? 'border-blue-300 focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 cursor-not-allowed'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    value={editing ? editedBooking.checkOut || '' : booking.checkOut}
                    onChange={(e) => handleInputChange('checkOut', e.target.value)}
                    disabled={!editing}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      editing ? 'border-blue-300 focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 cursor-not-allowed'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adults
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editing ? editedBooking.adults || 0 : booking.adults}
                    onChange={(e) => handleInputChange('adults', parseInt(e.target.value))}
                    disabled={!editing}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      editing ? 'border-blue-300 focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 cursor-not-allowed'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Children
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editing ? editedBooking.children || 0 : booking.children}
                    onChange={(e) => handleInputChange('children', parseInt(e.target.value))}
                    disabled={!editing}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      editing ? 'border-blue-300 focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Modification Reason (when editing) */}
            {editing && (
              <div className="px-6 py-4 border-b bg-blue-50">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <AlertCircle className="inline h-4 w-4 mr-1" />
                  Reason for Modification (Required)
                </label>
                <textarea
                  value={modificationReason}
                  onChange={(e) => setModificationReason(e.target.value)}
                  placeholder="Please provide a detailed reason for this modification..."
                  rows={3}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}

            {/* Modification History */}
            {showHistory && booking.modificationHistory && booking.modificationHistory.length > 0 && (
              <div className="px-6 py-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Modification History</h3>
                <div className="space-y-3">
                  {booking.modificationHistory.map((mod, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium text-gray-900">{mod.field}</span>
                          <p className="text-sm text-gray-600 mt-1">
                            Changed from: <span className="font-mono bg-white px-1">{mod.oldValue}</span>
                            {' → '}
                            to: <span className="font-mono bg-white px-1">{mod.newValue}</span>
                          </p>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <p>{new Date(mod.modifiedAt).toLocaleDateString()}</p>
                          <p>{mod.modifiedBy}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 italic">Reason: {mod.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
              <div className="flex gap-2">
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  View Documents
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Documents
                </button>
              </div>
              <div className="text-sm text-gray-600">
                Created: {new Date(booking.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}