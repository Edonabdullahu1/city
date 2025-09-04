'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { CalculatorIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

interface Hotel {
  id: string;
  name: string;
  city: string;
  rooms: Room[];
  prices: HotelPrice[];
}

interface Room {
  id: string;
  type: string;
  capacity: number;
  basePrice: number;
}

interface HotelPrice {
  roomType: string;
  board: string;
  single: number;
  double: number;
  extraBed: number;
  paymentKids: number;
}

interface FlightBlock {
  blockGroupId: string;
  outboundFlight: {
    pricePerSeat: number;
    originCity: string;
    destinationCity: string;
  };
  returnFlight: {
    pricePerSeat: number;
  } | null;
}

interface Transfer {
  id: string;
  vehicleType: string;
  price: number;
  capacity: number;
}

interface PriceCalculation {
  occupancyConfig: string;
  adults: number;
  children: number;
  childAges: number[];
  hotelName: string;
  roomType: string;
  board: string;
  flightCost: number;
  hotelCost: number;
  transferCost: number;
  totalCost: number;
}

const OCCUPANCY_CONFIGS = [
  { label: '1 Adult', adults: 1, children: 0, childAges: [] },
  { label: '1 Adult, 1 Child (5)', adults: 1, children: 1, childAges: [5] },
  { label: '2 Adults', adults: 2, children: 0, childAges: [] },
  { label: '2 Adults, 1 Child (5)', adults: 2, children: 1, childAges: [5] },
  { label: '2 Adults, 2 Children (5,10)', adults: 2, children: 2, childAges: [5, 10] },
  { label: '3 Adults', adults: 3, children: 0, childAges: [] },
  { label: '3 Adults, 1 Child (5)', adults: 3, children: 1, childAges: [5] },
  { label: '4 Adults', adults: 4, children: 0, childAges: [] }
];

export default function PriceCalculatorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [flightBlocks, setFlightBlocks] = useState<FlightBlock[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [calculations, setCalculations] = useState<PriceCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [nights, setNights] = useState(3); // Default 3 nights
  const [includeTransfer, setIncludeTransfer] = useState(false);
  const [selectedFlightBlock, setSelectedFlightBlock] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/');
    } else if (session) {
      fetchData();
    }
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      // Fetch hotels
      const hotelRes = await fetch('/api/admin/hotels');
      const hotelData = await hotelRes.json();
      
      // Fetch flight blocks
      const flightRes = await fetch('/api/admin/flight-blocks');
      const flightData = await flightRes.json();
      
      // Fetch transfers
      const transferRes = await fetch('/api/admin/transfers');
      const transferData = await transferRes.json();
      
      setHotels(hotelData.hotels || []);
      setFlightBlocks(flightData.flightBlocks || []);
      setTransfers(transferData.transfers || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePrices = () => {
    const newCalculations: PriceCalculation[] = [];
    
    // Find selected flight block
    const flightBlock = flightBlocks.find(fb => fb.blockGroupId === selectedFlightBlock);
    if (!flightBlock) {
      alert('Please select a flight block');
      return;
    }

    // Use a Set to track unique calculations and avoid duplicates
    const uniqueCalculations = new Map<string, PriceCalculation>();

    hotels.forEach(hotel => {
      OCCUPANCY_CONFIGS.forEach(config => {
        const totalPeople = config.adults + config.children;
        
        // Calculate flight cost (return trip) - €120 per person return as specified
        const flightCostPerPerson = 120; // €120 per person return
        const flightCost = totalPeople * flightCostPerPerson;
        
        // Calculate hotel cost based on occupancy
        let hotelCost = 0;
        let roomType = '';
        let board = 'BB'; // Bed & Breakfast default
        
        // Determine room type based on occupancy
        if (config.adults === 1 && config.children === 0) {
          roomType = 'Single';
          hotelCost = 100 * nights; // Base single room price
        } else if (config.adults === 1 && config.children === 1) {
          roomType = 'Single + Child';
          hotelCost = 100 * nights; // Single room can accommodate a child
        } else if (config.adults === 2 && config.children === 0) {
          roomType = 'Double';
          hotelCost = 160 * nights;
        } else if (config.adults === 2 && config.children === 1) {
          roomType = 'Double + Extra Bed';
          hotelCost = 160 * nights; // Double room with extra bed for child
        } else if (config.adults === 2 && config.children === 2) {
          roomType = 'Family Room';
          hotelCost = 220 * nights;
        } else if (config.adults === 3) {
          roomType = 'Triple';
          hotelCost = 260 * nights;
        } else if (config.adults === 4) {
          roomType = 'Quad/2 Doubles';
          hotelCost = 320 * nights;
        }
        
        // Use actual hotel prices if available
        if (hotel.prices && hotel.prices.length > 0) {
          const price = hotel.prices.find(p => p.board === board);
          if (price) {
            if (config.adults === 1) {
              hotelCost = Number(price.single) * nights;
            } else if (config.adults === 2) {
              hotelCost = Number(price.double) * nights;
            } else if (config.adults >= 3) {
              // For 3+ adults, use double + extra bed pricing
              hotelCost = (Number(price.double) + Number(price.extraBed) * (config.adults - 2)) * nights;
            }
            
            // Add child costs
            if (config.children > 0 && price.paymentKids) {
              hotelCost += Number(price.paymentKids) * config.children * nights;
            }
          }
        }
        
        // Calculate transfer cost
        let transferCost = 0;
        if (includeTransfer) {
          // Basic transfer pricing based on number of people
          if (totalPeople <= 3) {
            transferCost = 50 * 2; // Private car, round trip
          } else if (totalPeople <= 7) {
            transferCost = 75 * 2; // Minivan, round trip
          } else {
            transferCost = 100 * 2; // Minibus, round trip
          }
        }
        
        const totalCost = flightCost + hotelCost + transferCost;
        
        // Create unique key to avoid duplicates
        const key = `${hotel.name}-${config.label}`;
        
        uniqueCalculations.set(key, {
          occupancyConfig: config.label,
          adults: config.adults,
          children: config.children,
          childAges: config.childAges,
          hotelName: hotel.name,
          roomType,
          board,
          flightCost,
          hotelCost,
          transferCost,
          totalCost
        });
      });
    });
    
    // Convert Map values to array
    setCalculations(Array.from(uniqueCalculations.values()));
  };

  const exportToCSV = () => {
    if (calculations.length === 0) {
      alert('No calculations to export');
      return;
    }

    const headers = [
      'Hotel Name',
      'Occupancy',
      'Adults',
      'Children',
      'Child Ages',
      'Room Type',
      'Board',
      'Flight Cost (€)',
      'Hotel Cost (€)',
      'Transfer Cost (€)',
      'Total Cost (€)'
    ];

    const rows = calculations.map(calc => [
      calc.hotelName,
      calc.occupancyConfig,
      calc.adults,
      calc.children,
      calc.childAges.join(','),
      calc.roomType,
      calc.board,
      calc.flightCost.toFixed(2),
      calc.hotelCost.toFixed(2),
      calc.transferCost.toFixed(2),
      calc.totalCost.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-calculations-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
            <h1 className="text-3xl font-bold text-gray-900">Package Price Calculator</h1>
            <p className="text-gray-600 mt-2">Calculate package prices for all occupancy configurations</p>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Flight Block
              </label>
              <select
                value={selectedFlightBlock}
                onChange={(e) => setSelectedFlightBlock(e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a flight block...</option>
                {flightBlocks.map((block) => (
                  <option key={block.blockGroupId} value={block.blockGroupId}>
                    {block.outboundFlight.originCity} → {block.outboundFlight.destinationCity} 
                    (€{block.outboundFlight.pricePerSeat / 100}/seat)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Nights
              </label>
              <input
                type="number"
                value={nights}
                onChange={(e) => setNights(parseInt(e.target.value) || 1)}
                min="1"
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeTransfer}
                  onChange={(e) => setIncludeTransfer(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Include Transfer</span>
              </label>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={calculatePrices}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <CalculatorIcon className="h-5 w-5 mr-2" />
              Calculate Prices
            </button>
            
            {calculations.length > 0 && (
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Export to CSV
              </button>
            )}
          </div>
        </div>

        {/* Results Section - Group by Hotel */}
        {calculations.length > 0 && (
          <div className="space-y-6">
            {/* Group calculations by hotel */}
            {hotels.map(hotel => {
              const hotelCalculations = calculations.filter(calc => calc.hotelName === hotel.name);
              if (hotelCalculations.length === 0) return null;
              
              return (
                <div key={hotel.id} className="bg-white shadow-lg rounded-lg overflow-hidden">
                  {/* Hotel Header */}
                  <div className="bg-blue-600 text-white px-6 py-3">
                    <h3 className="text-lg font-semibold">{hotel.name}</h3>
                  </div>
                  
                  {/* Hotel Price Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Occupancy
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Room Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Flight (€)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Hotel (€)
                          </th>
                          {includeTransfer && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Transfer (€)
                            </th>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total (€)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {hotelCalculations.map((calc, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {calc.occupancyConfig}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {calc.roomType} ({calc.board})
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              €{calc.flightCost.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              €{calc.hotelCost.toFixed(2)}
                            </td>
                            {includeTransfer && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                €{calc.transferCost.toFixed(2)}
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              €{calc.totalCost.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}