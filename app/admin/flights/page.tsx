'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PlusIcon, PencilIcon, TrashIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import AdminLayout from '@/components/AdminLayout';

interface Flight {
  id: string;
  flightNumber: string;
  airline: {
    id: string;
    name: string;
    iataCode: string;
  };
  departureAirport: {
    id: string;
    name: string;
    iataCode: string;
    city: {
      id: string;
      name: string;
    };
  };
  arrivalAirport: {
    id: string;
    name: string;
    iataCode: string;
    city: {
      id: string;
      name: string;
    };
  };
}

interface FlightData {
  id: string;
  flightNumber: string;
  airline: string; // Just the airline name as a string
  originCity: string; // Flat city name
  destinationCity: string; // Flat city name
  departureAirport: string; // Formatted as "CODE - Name"
  arrivalAirport: string; // Formatted as "CODE - Name"
  departureTime: string;
  arrivalTime: string;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number;
}

interface FlightBlock {
  blockGroupId: string;
  outboundFlight: FlightData;
  returnFlight: FlightData | null;
}

export default function AdminFlightsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [flights, setFlights] = useState<Flight[]>([]);
  const [flightBlocks, setFlightBlocks] = useState<FlightBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<FlightBlock | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    flightId: '',
    departureDate: '',
    departureTime: '',
    arrivalDate: '',
    arrivalTime: '',
    returnFlightId: '',
    returnDepartureDate: '',
    returnDepartureTime: '',
    returnArrivalDate: '',
    returnArrivalTime: '',
    totalSeats: '',
    pricePerSeat: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/');
    } else if (session) {
      fetchFlights();
      fetchFlightBlocks();
    }
  }, [status, session, router]);

  const fetchFlights = async () => {
    try {
      const response = await fetch('/api/admin/flights');
      if (!response.ok) throw new Error('Failed to fetch flights');
      const data = await response.json();
      // Only show flight templates (routes) in the dropdown
      // Templates have totalSeats = 0 and isBlockSeat = false
      setFlights(data.flights || []);
    } catch (error) {
      console.error('Error fetching flights:', error);
      setFlights([]);
    }
  };

  const fetchFlightBlocks = async () => {
    try {
      const response = await fetch('/api/admin/flight-blocks');
      if (!response.ok) throw new Error('Failed to fetch flight blocks');
      const data = await response.json();
      setFlightBlocks(data.flightBlocks || []);
    } catch (error) {
      console.error('Error fetching flight blocks:', error);
      setFlightBlocks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent double submissions
    setIsSubmitting(true);
    
    try {
      if (editingBlock) {
        // Update existing flight block
        const updateData = {
          isGroup: true,
          outboundData: {
            id: editingBlock.outboundFlight.id,
            departureTime: new Date(`${formData.departureDate}T${formData.departureTime}`).toISOString(),
            arrivalTime: new Date(`${formData.arrivalDate}T${formData.arrivalTime}`).toISOString(),
            totalSeats: parseInt(formData.totalSeats),
            pricePerSeat: parseFloat(formData.pricePerSeat)
          },
          returnData: editingBlock.returnFlight ? {
            id: editingBlock.returnFlight.id,
            departureTime: new Date(`${formData.returnDepartureDate}T${formData.returnDepartureTime}`).toISOString(),
            arrivalTime: new Date(`${formData.returnArrivalDate}T${formData.returnArrivalTime}`).toISOString(),
            totalSeats: parseInt(formData.totalSeats),
            pricePerSeat: parseFloat(formData.pricePerSeat)
          } : null
        };

        const response = await fetch(`/api/admin/flight-blocks/${editingBlock.blockGroupId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          const error = await response.json();
          alert(error.error || 'Failed to update flight block');
          return;
        }
        
        // Ensure we refresh the data after successful update
        await fetchFlightBlocks();
      } else {
        // Create flight block with both outbound and return flights in a single request
        const requestData: any = {
          outboundFlight: {
            flightId: formData.flightId,
            departureTime: new Date(`${formData.departureDate}T${formData.departureTime}`).toISOString(),
            arrivalTime: new Date(`${formData.arrivalDate}T${formData.arrivalTime}`).toISOString(),
            totalSeats: parseInt(formData.totalSeats),
            availableSeats: parseInt(formData.totalSeats),
            pricePerSeat: parseFloat(formData.pricePerSeat) * 100 // Convert to cents
          }
        };

        // Add return flight if specified
        if (formData.returnFlightId) {
          requestData.returnFlight = {
            flightId: formData.returnFlightId,
            departureTime: new Date(`${formData.returnDepartureDate}T${formData.returnDepartureTime}`).toISOString(),
            arrivalTime: new Date(`${formData.returnArrivalDate}T${formData.returnArrivalTime}`).toISOString(),
            totalSeats: parseInt(formData.totalSeats),
            availableSeats: parseInt(formData.totalSeats),
            pricePerSeat: parseFloat(formData.pricePerSeat) * 100 // Convert to cents
          };
        } else {
          // Both flights are required for a flight block
          alert('Both outbound and return flights are required for a flight block. Please select a return flight.');
          setIsSubmitting(false);
          return;
        }

        const response = await fetch('/api/admin/flight-blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          const error = await response.json();
          alert(error.error || 'Failed to create flight block');
          return;
        }
      }

      setShowModal(false);
      resetForm();
      await fetchFlightBlocks();
    } catch (error) {
      console.error('Failed to save flight block:', error);
      alert('Failed to save flight block');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (blockId: string) => {
    if (!confirm('Are you sure you want to delete this flight block?')) return;
    
    try {
      const response = await fetch(`/api/admin/flight-blocks/${blockId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete flight block');
        return;
      }
      
      await fetchFlightBlocks();
    } catch (error) {
      console.error('Error deleting flight block:', error);
      alert('Failed to delete flight block');
    }
  };

  const handleEdit = (block: FlightBlock) => {
    setEditingBlock(block);
    
    // Parse dates and times from the flights
    const outboundDepartureDate = new Date(block.outboundFlight.departureTime);
    const outboundArrivalDate = new Date(block.outboundFlight.arrivalTime);
    
    // Format time properly for input fields
    const formatTimeForInput = (date: Date) => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };
    
    setFormData({
      flightId: '', // We don't need to change the flight route
      departureDate: outboundDepartureDate.toISOString().split('T')[0],
      departureTime: formatTimeForInput(outboundDepartureDate),
      arrivalDate: outboundArrivalDate.toISOString().split('T')[0],
      arrivalTime: formatTimeForInput(outboundArrivalDate),
      returnFlightId: '',
      returnDepartureDate: '',
      returnDepartureTime: '',
      returnArrivalDate: '',
      returnArrivalTime: '',
      totalSeats: block.outboundFlight.totalSeats.toString(),
      pricePerSeat: (block.outboundFlight.pricePerSeat / 100).toString()
    });
    
    if (block.returnFlight) {
      const returnDepartureDate = new Date(block.returnFlight.departureTime);
      const returnArrivalDate = new Date(block.returnFlight.arrivalTime);
      
      setFormData(prev => ({
        ...prev,
        returnDepartureDate: returnDepartureDate.toISOString().split('T')[0],
        returnDepartureTime: formatTimeForInput(returnDepartureDate),
        returnArrivalDate: returnArrivalDate.toISOString().split('T')[0],
        returnArrivalTime: formatTimeForInput(returnArrivalDate)
      }));
    }
    
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingBlock(null);
    setFormData({
      flightId: '',
      departureDate: '',
      departureTime: '',
      arrivalDate: '',
      arrivalTime: '',
      returnFlightId: '',
      returnDepartureDate: '',
      returnDepartureTime: '',
      returnArrivalDate: '',
      returnArrivalTime: '',
      totalSeats: '',
      pricePerSeat: ''
    });
  };

  const formatDateTime = (datetime: string) => {
    return new Date(datetime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  const filteredBlocks = flightBlocks.filter(block => {
    const matchesSearch = 
      block.outboundFlight.flightNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.outboundFlight.airline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.outboundFlight.originCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.outboundFlight.destinationCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (block.returnFlight && (
        block.returnFlight.flightNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        block.returnFlight.originCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        block.returnFlight.destinationCity.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    
    if (filterStatus === 'available') {
      return matchesSearch && block.outboundFlight.availableSeats > 0;
    } else if (filterStatus === 'full') {
      return matchesSearch && block.outboundFlight.availableSeats === 0;
    }
    
    return matchesSearch;
  });

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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Flight Management</h1>
              <p className="text-gray-600 mt-2">Manage guaranteed block seats and flight inventory</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Flight Block
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4">
            <input
              type="text"
              placeholder="Search flights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="full">Full</option>
            </select>
          </div>

          {/* Flight Blocks Table */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Flight Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schedule
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price/Seat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBlocks.map((block) => (
                    <tr key={block.blockGroupId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          block.returnFlight 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {block.returnFlight ? 'Round Trip' : 'One Way'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">
                            {block.outboundFlight.flightNumber}
                          </div>
                          <div className="text-xs text-gray-500">
                            {block.outboundFlight.airline}
                          </div>
                          {block.returnFlight && (
                            <div className="mt-2 pt-2 border-t">
                              <div className="font-medium">
                                {block.returnFlight.flightNumber}
                              </div>
                              <div className="text-xs text-gray-500">
                                {block.returnFlight.airline}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div>
                          <div className="flex items-center">
                            <span>{block.outboundFlight.originCity}</span>
                            <span className="mx-2">→</span>
                            <span>{block.outboundFlight.destinationCity}</span>
                          </div>
                          {block.returnFlight && (
                            <div className="flex items-center mt-1 text-gray-400">
                              <span>{block.returnFlight.originCity}</span>
                              <span className="mx-2">→</span>
                              <span>{block.returnFlight.destinationCity}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div>
                          <div>
                            <div className="font-medium">Outbound</div>
                            <div className="text-xs">
                              Dep: {formatDateTime(block.outboundFlight.departureTime)}
                            </div>
                            <div className="text-xs">
                              Arr: {formatDateTime(block.outboundFlight.arrivalTime)}
                            </div>
                          </div>
                          {block.returnFlight && (
                            <div className="mt-2 pt-2 border-t">
                              <div className="font-medium">Return</div>
                              <div className="text-xs">
                                Dep: {formatDateTime(block.returnFlight.departureTime)}
                              </div>
                              <div className="text-xs">
                                Arr: {formatDateTime(block.returnFlight.arrivalTime)}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>
                          <span className={`${
                            block.outboundFlight.availableSeats === 0 
                              ? 'text-red-600 font-semibold' 
                              : block.outboundFlight.availableSeats < 10 
                                ? 'text-orange-600' 
                                : 'text-green-600'
                          }`}>
                            {block.outboundFlight.availableSeats}/{block.outboundFlight.totalSeats}
                          </span>
                          {block.returnFlight && (
                            <div className="text-gray-400 text-xs mt-1">
                              Return: {block.returnFlight.availableSeats}/{block.returnFlight.totalSeats}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPrice(block.outboundFlight.pricePerSeat)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button 
                          onClick={() => handleEdit(block)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <PencilIcon className="h-4 w-4 inline" />
                        </button>
                        <button 
                          onClick={() => handleDelete(block.blockGroupId)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredBlocks.length === 0 && (
                <div className="text-center py-12">
                  <PaperAirplaneIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No flight blocks found</p>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {editingBlock ? 'Edit Flight Block' : 'Create Flight Block'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Outbound Flight Section */}
                <div className="border-b pb-4">
                  <h3 className="text-lg font-medium mb-4">Outbound Flight</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {editingBlock && (
                    <div className="md:col-span-2 mb-2">
                    <p className="text-sm text-gray-600">
                    <span className="font-medium">Flight:</span> {editingBlock.outboundFlight.flightNumber} - 
                    {editingBlock.outboundFlight.originCity} → {editingBlock.outboundFlight.destinationCity}
                    </p>
                    </div>
                    )}
                    {!editingBlock && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Flight Route *
                        </label>
                        <select
                          value={formData.flightId}
                          onChange={(e) => setFormData({...formData, flightId: e.target.value})}
                          className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select a flight route...</option>
                          {flights.map((flight) => (
                            <option key={flight.id} value={flight.id}>
                              {flight.airline.iataCode} {flight.flightNumber}: {flight.departureAirport.city.name} ({flight.departureAirport.iataCode}) → {flight.arrivalAirport.city.name} ({flight.arrivalAirport.iataCode})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Departure Date *
                      </label>
                      <input
                        type="date"
                        value={formData.departureDate}
                        onChange={(e) => setFormData({...formData, departureDate: e.target.value})}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Departure Time *
                      </label>
                      <input
                        type="time"
                        value={formData.departureTime}
                        onChange={(e) => setFormData({...formData, departureTime: e.target.value})}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Arrival Date *
                      </label>
                      <input
                        type="date"
                        value={formData.arrivalDate}
                        onChange={(e) => setFormData({...formData, arrivalDate: e.target.value})}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Arrival Time *
                      </label>
                      <input
                        type="time"
                        value={formData.arrivalTime}
                        onChange={(e) => setFormData({...formData, arrivalTime: e.target.value})}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Return Flight Section - Show during edit if it's a round trip */}
                {(editingBlock && editingBlock.returnFlight) && (
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-medium mb-4">Return Flight</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {editingBlock && (
                        <div className="md:col-span-2 mb-2">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Flight:</span> {editingBlock.returnFlight?.flightNumber} - 
                            {editingBlock.returnFlight?.originCity} → {editingBlock.returnFlight?.destinationCity}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Return Departure Date *
                        </label>
                        <input
                          type="date"
                          value={formData.returnDepartureDate}
                          onChange={(e) => setFormData({...formData, returnDepartureDate: e.target.value})}
                          className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Return Departure Time *
                        </label>
                        <input
                          type="time"
                          value={formData.returnDepartureTime}
                          onChange={(e) => setFormData({...formData, returnDepartureTime: e.target.value})}
                          className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Return Arrival Date *
                        </label>
                        <input
                          type="date"
                          value={formData.returnArrivalDate}
                          onChange={(e) => setFormData({...formData, returnArrivalDate: e.target.value})}
                          className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Return Arrival Time *
                        </label>
                        <input
                          type="time"
                          value={formData.returnArrivalTime}
                          onChange={(e) => setFormData({...formData, returnArrivalTime: e.target.value})}
                          className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Return Flight Section for Create Mode */}
                {!editingBlock && (
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-medium mb-4">Return Flight <span className="text-red-500">*</span></h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Return Flight Route <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.returnFlightId}
                          onChange={(e) => setFormData({...formData, returnFlightId: e.target.value})}
                          className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select a return flight...</option>
                          {flights.map((flight) => (
                            <option key={flight.id} value={flight.id}>
                              {flight.airline.iataCode} {flight.flightNumber}: {flight.departureAirport.city.name} ({flight.departureAirport.iataCode}) → {flight.arrivalAirport.city.name} ({flight.arrivalAirport.iataCode})
                            </option>
                          ))}
                        </select>
                      </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Return Departure Date
                            </label>
                            <input
                              type="date"
                              value={formData.returnDepartureDate}
                              onChange={(e) => setFormData({...formData, returnDepartureDate: e.target.value})}
                              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Return Departure Time
                            </label>
                            <input
                              type="time"
                              value={formData.returnDepartureTime}
                              onChange={(e) => setFormData({...formData, returnDepartureTime: e.target.value})}
                              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Return Arrival Date
                            </label>
                            <input
                              type="date"
                              value={formData.returnArrivalDate}
                              onChange={(e) => setFormData({...formData, returnArrivalDate: e.target.value})}
                              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Return Arrival Time
                            </label>
                            <input
                              type="time"
                              value={formData.returnArrivalTime}
                              onChange={(e) => setFormData({...formData, returnArrivalTime: e.target.value})}
                              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                    </div>
                  </div>
                )}

                {/* Seats and Pricing Section */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Seats and Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Seats *
                      </label>
                      <input
                        type="number"
                        value={formData.totalSeats}
                        onChange={(e) => setFormData({...formData, totalSeats: e.target.value})}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price per Seat (€) *
                      </label>
                      <input
                        type="number"
                        value={formData.pricePerSeat}
                        onChange={(e) => setFormData({...formData, pricePerSeat: e.target.value})}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-4 py-2 rounded-md text-white ${
                      isSubmitting 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isSubmitting 
                      ? 'Saving...' 
                      : editingBlock ? 'Update Flight Block' : 'Create Flight Block'
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}