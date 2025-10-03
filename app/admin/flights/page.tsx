'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PlusIcon, PencilIcon, TrashIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import AdminLayout from '@/components/AdminLayout';

type TabType = 'blocks' | 'allotment' | 'pnl';

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

  const [activeTab, setActiveTab] = useState<TabType>('blocks');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [flightBlocks, setFlightBlocks] = useState<FlightBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<FlightBlock | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Allotment Monitor states
  const [allotmentFromDate, setAllotmentFromDate] = useState('');
  const [allotmentToDate, setAllotmentToDate] = useState('');
  const [allotmentDestination, setAllotmentDestination] = useState('all');
  const [allotmentData, setAllotmentData] = useState<any[]>([]);
  const [allotmentLoading, setAllotmentLoading] = useState(false);

  // PNL Report states
  const [pnlDate, setPnlDate] = useState('');
  const [pnlFlightId, setPnlFlightId] = useState('');
  const [availableFlightsForDate, setAvailableFlightsForDate] = useState<any[]>([]);
  const [pnlData, setPnlData] = useState<any[]>([]);
  const [pnlLoading, setPnlLoading] = useState(false);
  
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

  const fetchAllotmentData = async () => {
    if (!allotmentFromDate || !allotmentToDate) {
      alert('Please select both from and to dates');
      return;
    }

    setAllotmentLoading(true);
    try {
      const params = new URLSearchParams({
        fromDate: allotmentFromDate,
        toDate: allotmentToDate,
        destination: allotmentDestination
      });

      const response = await fetch(`/api/admin/flights/allotment?${params}`);
      if (!response.ok) throw new Error('Failed to fetch allotment data');

      const data = await response.json();
      setAllotmentData(data.allotmentData || []);
    } catch (error) {
      console.error('Error fetching allotment data:', error);
      alert('Failed to fetch allotment data');
    } finally {
      setAllotmentLoading(false);
    }
  };

  const generateCalendarDays = () => {
    if (!allotmentFromDate || !allotmentToDate) return [];

    const days = [];
    const currentDate = new Date(allotmentFromDate);
    const endDate = new Date(allotmentToDate);

    while (currentDate <= endDate) {
      days.push({
        date: new Date(currentDate),
        day: currentDate.getDate(),
        month: currentDate.getMonth() + 1
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const fetchFlightsByDate = async (date: string) => {
    if (!date) return;

    try {
      const response = await fetch(`/api/admin/flights/by-date?date=${date}`);
      if (!response.ok) throw new Error('Failed to fetch flights');

      const data = await response.json();
      setAvailableFlightsForDate(data.flights || []);
      setPnlFlightId(''); // Reset flight selection
      setPnlData([]); // Clear PNL data
    } catch (error) {
      console.error('Error fetching flights by date:', error);
      setAvailableFlightsForDate([]);
    }
  };

  const fetchPNLData = async () => {
    if (!pnlFlightId) {
      alert('Please select a flight');
      return;
    }

    setPnlLoading(true);
    try {
      const response = await fetch(`/api/admin/flights/pnl?flightId=${pnlFlightId}`);
      if (!response.ok) throw new Error('Failed to fetch PNL data');

      const data = await response.json();
      setPnlData(data.passengers || []);
    } catch (error) {
      console.error('Error fetching PNL data:', error);
      alert('Failed to fetch PNL data');
    } finally {
      setPnlLoading(false);
    }
  };

  const exportToExcel = () => {
    if (pnlData.length === 0) {
      alert('No data to export');
      return;
    }

    // Create CSV content
    const headers = ['Nr', 'Title', 'First Name', 'Last Name', 'Date of Birth', 'Booking Number', 'Hotel'];
    const csvContent = [
      headers.join(','),
      ...pnlData.map((passenger: any, index: number) =>
        [
          index + 1,
          passenger.title,
          passenger.firstName,
          passenger.lastName,
          passenger.dateOfBirth || 'N/A',
          passenger.bookingNumber,
          passenger.hotel || 'N/A'
        ].join(',')
      )
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PNL_${pnlFlightId}_${pnlDate}.csv`;
    link.click();
  };

  const exportToTXT = () => {
    if (pnlData.length === 0) {
      alert('No data to export');
      return;
    }

    // Create TXT content
    const txtContent = pnlData.map((passenger: any, index: number) =>
      `${index + 1}. ${passenger.title} ${passenger.firstName} ${passenger.lastName} - DOB: ${passenger.dateOfBirth || 'N/A'} - Booking: ${passenger.bookingNumber} - Hotel: ${passenger.hotel || 'N/A'}`
    ).join('\n');

    // Download TXT
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PNL_${pnlFlightId}_${pnlDate}.txt`;
    link.click();
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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Flight Management</h1>
              <p className="text-gray-600 mt-2">Manage guaranteed block seats and flight inventory</p>
            </div>
            {activeTab === 'blocks' && (
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
            )}
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('blocks')}
                className={`${
                  activeTab === 'blocks'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Flight Blocks
              </button>
              <button
                onClick={() => setActiveTab('allotment')}
                className={`${
                  activeTab === 'allotment'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Allotment Monitor
              </button>
              <button
                onClick={() => setActiveTab('pnl')}
                className={`${
                  activeTab === 'pnl'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                PNL Report
              </button>
            </nav>
          </div>

          {/* Flight Blocks Tab Content */}
          {activeTab === 'blocks' && (
            <>
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
      </>
          )}

          {/* Allotment Monitor Tab Content */}
          {activeTab === 'allotment' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Flight Allotment Monitor</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={allotmentFromDate}
                      onChange={(e) => setAllotmentFromDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={allotmentToDate}
                      onChange={(e) => setAllotmentToDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination
                    </label>
                    <select
                      value={allotmentDestination}
                      onChange={(e) => setAllotmentDestination(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Destinations</option>
                      {Array.from(new Set(flightBlocks.map(b => b.outboundFlight.destinationCity))).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={fetchAllotmentData}
                      disabled={allotmentLoading}
                      className={`w-full px-4 py-2 rounded-lg text-white ${
                        allotmentLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {allotmentLoading ? 'Loading...' : 'Filter'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Allotment Grid */}
              {allotmentData.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 bg-gray-50 text-left text-sm font-semibold">
                          Flight
                        </th>
                        {calendarDays.map((day, index) => (
                          <th key={index} className="border border-gray-300 px-2 py-2 bg-gray-50 text-center text-xs">
                            <div>{day.day}</div>
                            <div className="text-gray-500">{day.month}</div>
                          </th>
                        ))}
                        <th className="border border-gray-300 px-4 py-2 bg-gray-50 text-center text-sm font-semibold">
                          Total
                        </th>
                        <th className="border border-gray-300 px-4 py-2 bg-gray-50 text-center text-sm font-semibold">
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allotmentData.map((flight, flightIndex) => (
                        <>
                          <tr key={`${flightIndex}-allot`} className="bg-white">
                            <td className="border border-gray-300 px-4 py-2 text-sm font-medium" rowSpan={3}>
                              {flight.flightNumber} ({flight.route})
                            </td>
                            <td colSpan={calendarDays.length + 2} className="border border-gray-300 px-2 py-1 text-xs text-gray-600 bg-blue-50">
                              Allotment
                            </td>
                          </tr>
                          <tr key={`${flightIndex}-allot-data`}>
                            {flight.dailyData.map((data: any, dayIndex: number) => (
                              <td key={dayIndex} className="border border-gray-300 px-2 py-2 text-center text-sm">
                                {data.allotment}
                              </td>
                            ))}
                            <td className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">
                              {flight.totalAllotment}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center text-sm" rowSpan={3}>
                              {flight.percentage}%
                            </td>
                          </tr>
                          <tr key={`${flightIndex}-used`} className="bg-gray-50">
                            <td colSpan={calendarDays.length + 2} className="border border-gray-300 px-2 py-1 text-xs text-gray-600">
                              Used
                            </td>
                          </tr>
                          <tr key={`${flightIndex}-used-data`}>
                            <td className="border-0"></td>
                            {flight.dailyData.map((data: any, dayIndex: number) => (
                              <td key={dayIndex} className="border border-gray-300 px-2 py-2 text-center text-sm bg-red-50">
                                {data.used}
                              </td>
                            ))}
                            <td className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold bg-red-50">
                              {flight.totalUsed}
                            </td>
                          </tr>
                          <tr key={`${flightIndex}-available`} className="bg-white">
                            <td className="border-0"></td>
                            <td colSpan={calendarDays.length + 2} className="border border-gray-300 px-2 py-1 text-xs text-gray-600 bg-green-50">
                              Available
                            </td>
                          </tr>
                          <tr key={`${flightIndex}-available-data`}>
                            <td className="border-0"></td>
                            {flight.dailyData.map((data: any, dayIndex: number) => (
                              <td key={dayIndex} className="border border-gray-300 px-2 py-2 text-center text-sm">
                                {data.available}
                              </td>
                            ))}
                            <td className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">
                              {flight.totalAvailable}
                            </td>
                          </tr>
                          <tr key={`${flightIndex}-over`} className="bg-gray-50">
                            <td className="border-0"></td>
                            <td colSpan={calendarDays.length + 2} className="border border-gray-300 px-2 py-1 text-xs text-gray-600">
                              Over
                            </td>
                          </tr>
                          <tr key={`${flightIndex}-spacer`}>
                            <td colSpan={calendarDays.length + 3} className="h-4"></td>
                          </tr>
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {allotmentData.length === 0 && !allotmentLoading && allotmentFromDate && allotmentToDate && (
                <div className="bg-white p-12 rounded-lg shadow text-center">
                  <p className="text-gray-600">No allotment data found for the selected period</p>
                </div>
              )}
            </div>
          )}

          {/* PNL Report Tab Content */}
          {activeTab === 'pnl' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">PNL (Passenger Name List) Report</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={pnlDate}
                      onChange={(e) => {
                        setPnlDate(e.target.value);
                        fetchFlightsByDate(e.target.value);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Flight Block
                    </label>
                    <select
                      value={pnlFlightId}
                      onChange={(e) => setPnlFlightId(e.target.value)}
                      disabled={availableFlightsForDate.length === 0}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Select a flight</option>
                      {availableFlightsForDate.map((flight) => (
                        <option key={flight.id} value={flight.id}>
                          {flight.flightNumber} - {flight.route} ({new Date(flight.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={fetchPNLData}
                      disabled={pnlLoading || !pnlFlightId}
                      className={`w-full px-4 py-2 rounded-lg text-white ${
                        pnlLoading || !pnlFlightId ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {pnlLoading ? 'Loading...' : 'Generate Report'}
                    </button>
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={exportToExcel}
                      disabled={pnlData.length === 0}
                      className={`flex-1 px-4 py-2 rounded-lg text-white ${
                        pnlData.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                      }`}
                      title="Export to Excel (CSV)"
                    >
                      Excel
                    </button>
                    <button
                      onClick={exportToTXT}
                      disabled={pnlData.length === 0}
                      className={`flex-1 px-4 py-2 rounded-lg text-white ${
                        pnlData.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                      title="Export to TXT"
                    >
                      TXT
                    </button>
                  </div>
                </div>
              </div>

              {/* PNL Data Table */}
              {pnlData.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
                  <h3 className="text-lg font-semibold mb-4">Passenger List</h3>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nr
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          First Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date of Birth
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Booking Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hotel
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pnlData.map((passenger: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {passenger.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {passenger.firstName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {passenger.lastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {passenger.dateOfBirth || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {passenger.bookingNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {passenger.hotel || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 text-sm text-gray-600">
                    Total Passengers: {pnlData.length}
                  </div>
                </div>
              )}

              {pnlData.length === 0 && !pnlLoading && pnlFlightId && (
                <div className="bg-white p-12 rounded-lg shadow text-center">
                  <p className="text-gray-600">No passengers found for the selected flight</p>
                </div>
              )}
            </div>
          )}
        </div>
    </AdminLayout>
  );
}