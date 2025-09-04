'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface Flight {
  id: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  availableSeats: number;
  pricePerSeat: number;
  isReturn: boolean;
  originCity: {
    name: string;
  };
  destinationCity: {
    name: string;
  };
}

export default function EditFlightBlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: blockGroupId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [outboundFlight, setOutboundFlight] = useState<Flight | null>(null);
  const [returnFlight, setReturnFlight] = useState<Flight | null>(null);
  
  const [formData, setFormData] = useState({
    outboundDate: '',
    outboundTime: '',
    returnDate: '',
    returnTime: '',
    availableSeats: 0,
    pricePerSeat: 0
  });

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/');
    } else if (session && blockGroupId) {
      fetchFlightBlock();
    }
  }, [status, session, router, blockGroupId]);

  const fetchFlightBlock = async () => {
    try {
      // Fetch flights with this block group ID
      const response = await fetch(`/api/admin/flight-blocks?blockGroupId=${blockGroupId}`);
      if (!response.ok) throw new Error('Failed to fetch flight block');
      
      const data = await response.json();
      if (data.flightBlocks && data.flightBlocks.length > 0) {
        const block = data.flightBlocks[0];
        
        if (block.outboundFlight) {
          setOutboundFlight(block.outboundFlight);
          const outDate = new Date(block.outboundFlight.departureTime);
          setFormData(prev => ({
            ...prev,
            outboundDate: outDate.toISOString().split('T')[0],
            outboundTime: outDate.toTimeString().slice(0, 5),
            availableSeats: block.outboundFlight.availableSeats,
            pricePerSeat: block.outboundFlight.pricePerSeat / 100
          }));
        }
        
        if (block.returnFlight) {
          setReturnFlight(block.returnFlight);
          const retDate = new Date(block.returnFlight.departureTime);
          setFormData(prev => ({
            ...prev,
            returnDate: retDate.toISOString().split('T')[0],
            returnTime: retDate.toTimeString().slice(0, 5)
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching flight block:', error);
      alert('Failed to load flight block data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!outboundFlight || !returnFlight) {
      alert('Flight block data not loaded');
      return;
    }

    setSaving(true);
    try {
      // Update outbound flight
      const outboundDateTime = new Date(`${formData.outboundDate}T${formData.outboundTime}`);
      const outboundArrival = new Date(outboundDateTime.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      
      await fetch(`/api/admin/flights/${outboundFlight.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          departureTime: outboundDateTime.toISOString(),
          arrivalTime: outboundArrival.toISOString(),
          availableSeats: formData.availableSeats,
          pricePerSeat: Math.round(formData.pricePerSeat * 100)
        }),
      });

      // Update return flight
      const returnDateTime = new Date(`${formData.returnDate}T${formData.returnTime}`);
      const returnArrival = new Date(returnDateTime.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      
      await fetch(`/api/admin/flights/${returnFlight.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          departureTime: returnDateTime.toISOString(),
          arrivalTime: returnArrival.toISOString(),
          availableSeats: formData.availableSeats,
          pricePerSeat: Math.round(formData.pricePerSeat * 100)
        }),
      });

      alert('Flight block updated successfully!');
      router.push('/admin/flights');
    } catch (error) {
      console.error('Error updating flight block:', error);
      alert('Failed to update flight block');
    } finally {
      setSaving(false);
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

  if (!outboundFlight || !returnFlight) {
    return (
      <AdminLayout>
        <div className="p-8">
          <h1 className="text-2xl font-bold text-red-600">Flight block not found</h1>
          <button
            onClick={() => router.push('/admin/flights')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Back to Flights
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <button
          onClick={() => router.push('/admin/flights')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Flights
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Flight Block</h1>
          <p className="text-gray-600 mt-2">
            {outboundFlight.flightNumber} / {returnFlight.flightNumber} - 
            {outboundFlight.originCity.name} ⇄ {outboundFlight.destinationCity.name}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Outbound Flight */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold mb-4">Outbound Flight - {outboundFlight.flightNumber}</h2>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departure Date
              </label>
              <input
                type="date"
                value={formData.outboundDate}
                onChange={(e) => setFormData({ ...formData, outboundDate: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departure Time
              </label>
              <input
                type="time"
                value={formData.outboundTime}
                onChange={(e) => setFormData({ ...formData, outboundTime: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Return Flight */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold mb-4 mt-6">Return Flight - {returnFlight.flightNumber}</h2>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Return Date
              </label>
              <input
                type="date"
                value={formData.returnDate}
                onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                min={formData.outboundDate}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Return Time
              </label>
              <input
                type="time"
                value={formData.returnTime}
                onChange={(e) => setFormData({ ...formData, returnTime: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Shared Settings */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold mb-4 mt-6">Block Settings</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Available Seats
              </label>
              <input
                type="number"
                value={formData.availableSeats}
                onChange={(e) => setFormData({ ...formData, availableSeats: parseInt(e.target.value) })}
                min="0"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price per Seat (€) - One Way
              </label>
              <input
                type="number"
                value={formData.pricePerSeat}
                onChange={(e) => setFormData({ ...formData, pricePerSeat: parseFloat(e.target.value) })}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Round trip price will be €{(formData.pricePerSeat * 2).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Flight Block Summary</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Route: {outboundFlight.originCity.name} → {outboundFlight.destinationCity.name} → {outboundFlight.originCity.name}</p>
              <p>Duration: {Math.ceil((new Date(formData.returnDate).getTime() - new Date(formData.outboundDate).getTime()) / (1000 * 60 * 60 * 24))} nights</p>
              <p>Total seats available: {formData.availableSeats}</p>
              <p>Round trip price per person: €{(formData.pricePerSeat * 2).toFixed(2)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
            <button
              onClick={() => router.push('/admin/flights')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-2 rounded-lg text-white flex items-center ${
                saving 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}