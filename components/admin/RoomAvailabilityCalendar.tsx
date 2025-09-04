'use client';

import React, { useState, useEffect } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';

interface AvailabilityDay {
  date: Date;
  availableRooms: number;
  bookedRooms: number;
  totalRooms: number;
  price: number;
  isBlocked: boolean;
}

interface RoomAvailabilityCalendarProps {
  roomId: string;
  roomType: string;
  totalRooms: number;
  basePrice: number;
}

export default function RoomAvailabilityCalendar({
  roomId,
  roomType,
  totalRooms,
  basePrice
}: RoomAvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [priceOverride, setPriceOverride] = useState<string>('');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

  useEffect(() => {
    fetchAvailability();
  }, [currentMonth, roomId]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const response = await fetch(
        `/api/admin/hotels/availability?roomId=${roomId}&startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setAvailability(data.calendar.map((day: any) => ({
          ...day,
          date: new Date(day.date)
        })));
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDates(prev => {
      const index = prev.findIndex(d => d.toISOString() === date.toISOString());
      if (index > -1) {
        return prev.filter((_, i) => i !== index);
      }
      return [...prev, date];
    });
  };

  const handleUpdatePricing = async () => {
    if (selectedDates.length === 0 || !priceOverride) return;

    try {
      const sortedDates = selectedDates.sort((a, b) => a.getTime() - b.getTime());
      const response = await fetch('/api/admin/hotels/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updatePricing',
          roomId,
          startDate: sortedDates[0].toISOString(),
          endDate: addDays(sortedDates[sortedDates.length - 1], 1).toISOString(),
          priceOverride: Math.round(parseFloat(priceOverride) * 100)
        })
      });

      if (response.ok) {
        setShowPriceModal(false);
        setPriceOverride('');
        setSelectedDates([]);
        fetchAvailability();
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
    }
  };

  const handleBlockDates = async (block: boolean) => {
    if (selectedDates.length === 0) return;

    try {
      const sortedDates = selectedDates.sort((a, b) => a.getTime() - b.getTime());
      const response = await fetch('/api/admin/hotels/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setBlocked',
          roomId,
          startDate: sortedDates[0].toISOString(),
          endDate: addDays(sortedDates[sortedDates.length - 1], 1).toISOString(),
          isBlocked: block
        })
      });

      if (response.ok) {
        setShowBlockModal(false);
        setSelectedDates([]);
        fetchAvailability();
      }
    } catch (error) {
      console.error('Error updating block status:', error);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getDayAvailability = (date: Date) => {
    return availability.find(a => 
      a.date.toISOString().split('T')[0] === date.toISOString().split('T')[0]
    );
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(d => d.toISOString() === date.toISOString());
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{roomType} Availability</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
              className="px-3 py-1 border rounded-lg hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1 border rounded-lg hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
              className="px-3 py-1 border rounded-lg hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-4 text-sm">
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 rounded"></div>
            Available
          </span>
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 rounded"></div>
            Partially Booked
          </span>
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 rounded"></div>
            Fully Booked
          </span>
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            Blocked
          </span>
        </div>

        <div className="text-center mb-4">
          <h4 className="text-xl font-semibold">{format(currentMonth, 'MMMM yyyy')}</h4>
          <p className="text-sm text-gray-600">Total Rooms: {totalRooms} | Base Price: €{basePrice / 100}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-600 p-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map(date => {
              const dayAvail = getDayAvailability(date);
              const isSelected = isDateSelected(date);
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isTodayDate = isToday(date);

              if (!isCurrentMonth) {
                return <div key={date.toISOString()} className="p-2"></div>;
              }

              const availableRooms = dayAvail?.availableRooms ?? totalRooms;
              const bookedRooms = dayAvail?.bookedRooms ?? 0;
              const price = dayAvail?.price ?? basePrice;
              const isBlocked = dayAvail?.isBlocked ?? false;

              let bgColor = 'bg-green-100 hover:bg-green-200';
              if (isBlocked) {
                bgColor = 'bg-gray-300';
              } else if (availableRooms === 0) {
                bgColor = 'bg-red-100 hover:bg-red-200';
              } else if (bookedRooms > 0) {
                bgColor = 'bg-yellow-100 hover:bg-yellow-200';
              }

              if (isSelected) {
                bgColor = 'bg-blue-500 text-white';
              }

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDateClick(date)}
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${bgColor} ${
                    isTodayDate ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="text-sm font-medium">
                    {format(date, 'd')}
                  </div>
                  <div className="text-xs mt-1">
                    {availableRooms}/{totalRooms}
                  </div>
                  {price !== basePrice && (
                    <div className="text-xs font-medium">
                      €{price / 100}
                    </div>
                  )}
                  {isBlocked && (
                    <div className="text-xs text-red-600 font-medium">
                      Blocked
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedDates.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm mb-3">
                {selectedDates.length} date(s) selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPriceModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Pricing
                </button>
                <button
                  onClick={() => setShowBlockModal(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Block/Unblock Dates
                </button>
                <button
                  onClick={() => setSelectedDates([])}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Price Override Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Update Pricing</h3>
            <p className="text-sm text-gray-600 mb-4">
              Set a new price for the selected dates. Leave empty to use base price.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Price per Night (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={priceOverride}
                onChange={(e) => setPriceOverride(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder={`Base: €${basePrice / 100}`}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpdatePricing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update
              </button>
              <button
                onClick={() => {
                  setShowPriceModal(false);
                  setPriceOverride('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block/Unblock Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Block/Unblock Dates</h3>
            <p className="text-sm text-gray-600 mb-4">
              Blocked dates will not be available for booking.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleBlockDates(true)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Block Dates
              </button>
              <button
                onClick={() => handleBlockDates(false)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Unblock Dates
              </button>
              <button
                onClick={() => setShowBlockModal(false)}
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