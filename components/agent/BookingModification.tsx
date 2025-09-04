'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FiCalendar, FiUser, FiPlus, FiMinus, FiX, FiEdit3, FiClock, FiAlertCircle } from 'react-icons/fi';

interface Booking {
  id: string;
  reservationCode: string;
  customerName: string;
  customerEmail: string;
  status: string;
  checkInDate?: string;
  checkOutDate?: string;
  totalAmount: number;
  flights: any[];
  hotels: any[];
  transfers: any[];
  excursions: any[];
}

interface ModificationHistory {
  id: string;
  action: string;
  changes: any;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    role: string;
  };
  notes?: string;
}

export default function BookingModification({ bookingId }: { bookingId: string }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [history, setHistory] = useState<ModificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modificationType, setModificationType] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [modificationData, setModificationData] = useState<any>({});
  const [modificationFee, setModificationFee] = useState(0);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
      fetchModificationHistory();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (response.ok) {
        const data = await response.json();
        setBooking(data);
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModificationHistory = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const calculateFee = (type: string) => {
    if (!booking) return 0;
    
    const baseFee = 25;
    const daysUntilTravel = booking.checkInDate 
      ? Math.ceil((new Date(booking.checkInDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    let fee = baseFee;

    if (daysUntilTravel < 7) fee += 50;
    else if (daysUntilTravel < 14) fee += 25;

    switch (type) {
      case 'DATE_CHANGE': fee += 25; break;
      case 'PASSENGER_CHANGE': fee += 50; break;
      case 'SERVICE_ADD': fee += 15; break;
      case 'SERVICE_REMOVE': fee += 10; break;
      case 'CANCELLATION': fee = booking.totalAmount * 0.15 / 100; break;
    }

    return fee;
  };

  const handleModificationSubmit = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modificationType,
          ...modificationData,
          fee: modificationFee
        })
      });

      if (response.ok) {
        await fetchBookingDetails();
        await fetchModificationHistory();
        setShowModal(false);
        resetModification();
        alert('Modification successful!');
      }
    } catch (error) {
      console.error('Error modifying booking:', error);
      alert('Failed to modify booking');
    }
  };

  const resetModification = () => {
    setModificationType('');
    setModificationData({});
    setModificationFee(0);
  };

  const openModificationModal = (type: string) => {
    setModificationType(type);
    setModificationFee(calculateFee(type));
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12 text-gray-500">
        Booking not found
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Booking Overview */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Booking {booking.reservationCode}
            </h2>
            <p className="text-gray-600 mt-1">{booking.customerName}</p>
            <p className="text-gray-600">{booking.customerEmail}</p>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              booking.status === 'PAID' ? 'bg-green-100 text-green-800' :
              booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
              booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {booking.status}
            </span>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              €{(booking.totalAmount / 100).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => openModificationModal('DATE_CHANGE')}
            disabled={booking.status === 'CANCELLED'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiCalendar /> Change Dates
          </button>
          <button
            onClick={() => openModificationModal('PASSENGER_CHANGE')}
            disabled={booking.status === 'CANCELLED'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiUser /> Change Passengers
          </button>
          <button
            onClick={() => openModificationModal('SERVICE_ADD')}
            disabled={booking.status === 'CANCELLED'}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiPlus /> Add Service
          </button>
          <button
            onClick={() => openModificationModal('SERVICE_REMOVE')}
            disabled={booking.status === 'CANCELLED' || (booking.transfers.length === 0 && booking.excursions.length === 0)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiMinus /> Remove Service
          </button>
          <button
            onClick={() => openModificationModal('CANCELLATION')}
            disabled={booking.status === 'CANCELLED'}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiX /> Cancel Booking
          </button>
        </div>
      </div>

      {/* Current Services */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Current Services</h3>
        
        <div className="space-y-4">
          {booking.flights.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Flights</h4>
              {booking.flights.map((flight: any, index: number) => (
                <div key={index} className="pl-4 text-sm text-gray-600">
                  {flight.flightNumber} - {flight.origin} to {flight.destination}
                  {flight.departureDate && ` on ${format(new Date(flight.departureDate), 'MMM dd, yyyy')}`}
                </div>
              ))}
            </div>
          )}

          {booking.hotels.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Hotels</h4>
              {booking.hotels.map((hotel: any, index: number) => (
                <div key={index} className="pl-4 text-sm text-gray-600">
                  {hotel.hotelName} - {hotel.roomType}
                  {hotel.checkIn && hotel.checkOut && 
                    ` from ${format(new Date(hotel.checkIn), 'MMM dd')} to ${format(new Date(hotel.checkOut), 'MMM dd, yyyy')}`
                  }
                </div>
              ))}
            </div>
          )}

          {booking.transfers.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Transfers</h4>
              {booking.transfers.map((transfer: any, index: number) => (
                <div key={index} className="pl-4 text-sm text-gray-600">
                  {transfer.fromLocation} to {transfer.toLocation} - {transfer.vehicleType}
                </div>
              ))}
            </div>
          )}

          {booking.excursions.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Excursions</h4>
              {booking.excursions.map((excursion: any, index: number) => (
                <div key={index} className="pl-4 text-sm text-gray-600">
                  {excursion.title} at {excursion.location}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modification History */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Modification History</h3>
        
        {history.length > 0 ? (
          <div className="space-y-3">
            {history.map((entry) => (
              <div key={entry.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">
                      {entry.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      by {entry.user.firstName} {entry.user.lastName} ({entry.user.role})
                    </p>
                    {entry.notes && (
                      <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    <FiClock className="inline mr-1" />
                    {format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No modifications yet</p>
        )}
      </div>

      {/* Modification Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">
              {modificationType.replace(/_/g, ' ')}
            </h3>

            {modificationFee > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800 flex items-center gap-2">
                  <FiAlertCircle />
                  Modification fee: €{modificationFee.toFixed(2)}
                </p>
              </div>
            )}

            {/* Dynamic form based on modification type */}
            {modificationType === 'DATE_CHANGE' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">New Check-in Date</label>
                  <input
                    type="date"
                    onChange={(e) => setModificationData({
                      ...modificationData,
                      checkIn: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">New Check-out Date</label>
                  <input
                    type="date"
                    onChange={(e) => setModificationData({
                      ...modificationData,
                      checkOut: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            )}

            {modificationType === 'CANCELLATION' && (
              <div>
                <label className="block text-sm font-medium mb-2">Cancellation Reason</label>
                <textarea
                  onChange={(e) => setModificationData({
                    ...modificationData,
                    reason: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  required
                />
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleModificationSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirm Modification
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetModification();
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}