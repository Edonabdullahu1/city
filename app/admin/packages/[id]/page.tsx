'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function PackageDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [packageData, setPackageData] = useState<any>(null);
  const [prices, setPrices] = useState<any[]>([]);
  const [flightBlocks, setFlightBlocks] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/');
    } else if (session && params.id) {
      fetchPackageDetails();
      fetchPackagePrices();
    }
  }, [status, session, params.id, router]);

  const fetchPackageDetails = async () => {
    try {
      const response = await fetch(`/api/admin/packages/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch package');
      const data = await response.json();
      setPackageData(data);
      
      // Fetch all flight blocks if stored
      if (data.flightBlockIds && Array.isArray(data.flightBlockIds)) {
        await fetchFlightBlocks(data.flightBlockIds);
      }
      
      // Fetch all hotels if stored
      if (data.hotelIds && Array.isArray(data.hotelIds)) {
        await fetchHotels(data.hotelIds);
      }
    } catch (error) {
      console.error('Error fetching package:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlightBlocks = async (blockGroupIds: string[]) => {
    try {
      const blocks = [];
      for (const blockGroupId of blockGroupIds) {
        const response = await fetch(`/api/admin/flight-blocks?blockGroupId=${blockGroupId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.flightBlocks && data.flightBlocks.length > 0) {
            blocks.push(data.flightBlocks[0]);
          }
        }
      }
      setFlightBlocks(blocks);
    } catch (error) {
      console.error('Error fetching flight blocks:', error);
    }
  };

  const fetchHotels = async (hotelIds: string[]) => {
    try {
      const hotelData = [];
      for (const hotelId of hotelIds) {
        const response = await fetch(`/api/admin/hotels/${hotelId}`);
        if (response.ok) {
          const data = await response.json();
          hotelData.push(data);
        }
      }
      setHotels(hotelData);
    } catch (error) {
      console.error('Error fetching hotels:', error);
    }
  };

  const fetchPackagePrices = async () => {
    try {
      // Always recalculate to get fresh prices with correct flight pricing
      const calcResponse = await fetch(`/api/admin/packages/${params.id}/calculate-prices`, {
        method: 'POST'
      });
      
      if (calcResponse.ok) {
        // Now fetch the calculated prices
        const response = await fetch(`/api/admin/packages/${params.id}/calculate-prices`);
        if (response.ok) {
          const data = await response.json();
          setPrices(data);
        }
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (!packageData) {
    return (
      <AdminLayout>
        <div className="p-8">
          <h1 className="text-2xl font-bold text-red-600">Package not found</h1>
          <button
            onClick={() => router.push('/admin/packages')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Back to Packages
          </button>
        </div>
      </AdminLayout>
    );
  }

  // Group prices by hotel name
  const pricesByHotel: Record<string, any[]> = {};
  prices.forEach(price => {
    const hotelName = price.hotelName || 'Default Hotel';
    if (!pricesByHotel[hotelName]) {
      pricesByHotel[hotelName] = [];
    }
    pricesByHotel[hotelName].push(price);
  });

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/packages')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Packages
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{packageData.name}</h1>
              <p className="text-gray-600 mt-2">{packageData.description}</p>
            </div>
            <button
              onClick={() => router.push(`/admin/packages/${params.id}/edit`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <PencilIcon className="h-5 w-5 mr-2" />
              Edit Package
            </button>
          </div>
        </div>

        {/* Package Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Package Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm text-gray-500">Location:</span>
              <p className="font-medium">{packageData.city?.name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Nights:</span>
              <p className="font-medium">{packageData.nights}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Max Adults:</span>
              <p className="font-medium">{packageData.maxOccupancy}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Service Charge:</span>
              <p className="font-medium">€{Number(packageData.serviceCharge || 0).toFixed(2)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Profit Margin:</span>
              <p className="font-medium">{packageData.profitMargin !== null && packageData.profitMargin !== undefined 
                ? Number(packageData.profitMargin).toFixed(0) : '20'}%</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Transfer Included:</span>
              <p className="font-medium">{packageData.includesTransfer ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Status:</span>
              <p className="font-medium">
                {packageData.active ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-red-600">Inactive</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Featured:</span>
              <p className="font-medium">{packageData.featured ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>

        {/* Flight Blocks Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Flight Blocks</h2>
          {flightBlocks.length > 0 ? (
            <div className="space-y-4">
              {flightBlocks.map((block, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Flight Block {index + 1}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Outbound Flight</h4>
                      {block.outboundFlight && (
                        <div className="text-sm text-gray-600">
                          <p>Flight: {block.outboundFlight.flightNumber}</p>
                          <p>Departure: {formatDate(block.outboundFlight.departureTime)}</p>
                          <p>Arrival: {formatDate(block.outboundFlight.arrivalTime)}</p>
                          <p>Available Seats: {block.outboundFlight.availableSeats}</p>
                          <p>Price per Seat: €{(block.outboundFlight.pricePerSeat / 100).toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Return Flight</h4>
                      {block.returnFlight && (
                        <div className="text-sm text-gray-600">
                          <p>Flight: {block.returnFlight.flightNumber}</p>
                          <p>Departure: {formatDate(block.returnFlight.departureTime)}</p>
                          <p>Arrival: {formatDate(block.returnFlight.arrivalTime)}</p>
                          <p>Available Seats: {block.returnFlight.availableSeats}</p>
                          <p>Price per Seat: €{(block.returnFlight.pricePerSeat / 100).toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Fallback to showing single flight if no blocks
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Outbound Flight</h3>
                {packageData.departureFlight && (
                  <div className="text-sm text-gray-600">
                    <p>Flight: {packageData.departureFlight.flightNumber}</p>
                    <p>Departure: {formatDate(packageData.departureFlight.departureTime)}</p>
                    <p>Arrival: {formatDate(packageData.departureFlight.arrivalTime)}</p>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-medium mb-2">Return Flight</h3>
                {packageData.returnFlight && (
                  <div className="text-sm text-gray-600">
                    <p>Flight: {packageData.returnFlight.flightNumber}</p>
                    <p>Departure: {formatDate(packageData.returnFlight.departureTime)}</p>
                    <p>Arrival: {formatDate(packageData.returnFlight.arrivalTime)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Hotels Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Hotels</h2>
          {hotels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hotels.map((hotel, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <p className="font-medium">{hotel.name}</p>
                  <p className="text-sm text-gray-600">{hotel.address}</p>
                  <div className="mt-2">
                    <span className="text-yellow-400">{'★'.repeat(hotel.rating || 0)}</span>
                    <span className="text-gray-300">{'★'.repeat(5 - (hotel.rating || 0))}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Fallback to showing single hotel
            packageData.hotel && (
              <div>
                <p className="font-medium">{packageData.hotel.name}</p>
                <p className="text-sm text-gray-600">{packageData.hotel.address}</p>
                <div className="mt-2">
                  <span className="text-yellow-400">{'★'.repeat(packageData.hotel.rating || 0)}</span>
                  <span className="text-gray-300">{'★'.repeat(5 - (packageData.hotel.rating || 0))}</span>
                </div>
              </div>
            )
          )}
        </div>

        {/* Pre-calculated Prices */}
        {Object.keys(pricesByHotel).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Pre-calculated Prices</h2>
              <div className="text-sm text-gray-600">
                Flight: €120 per person return | Service Charge: €{Number(packageData.serviceCharge || 0).toFixed(2)} | Margin: {packageData.profitMargin !== null && packageData.profitMargin !== undefined 
                  ? Number(packageData.profitMargin).toFixed(0) : '20'}%
              </div>
            </div>
            {Object.entries(pricesByHotel).map(([hotelName, hotelPrices]) => (
              <div key={hotelName} className="mb-8 last:mb-0">
                <h3 className="text-lg font-medium mb-3 text-blue-600 border-b pb-2">{hotelName}</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Occupancy
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Flight
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hotel
                        </th>
                        {packageData.includesTransfer && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Transfer
                          </th>
                        )}
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subtotal
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Margin
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Room Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {hotelPrices.map((price, index) => {
                        const serviceCharge = Number(packageData.serviceCharge) || 0;
                        const profitMargin = packageData.profitMargin !== null && packageData.profitMargin !== undefined 
                          ? Number(packageData.profitMargin) : 20;
                        const subtotal = Number(price.flightPrice) + Number(price.hotelPrice) + Number(price.transferPrice) + serviceCharge;
                        const marginAmount = subtotal * (profitMargin / 100);
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {price.adults} Adult{price.adults > 1 ? 's' : ''}
                              {price.children > 0 && `, ${price.children} Child${price.children > 1 ? 'ren' : ''}`}
                              {price.childAges && price.children > 0 && ` (ages: ${price.childAges})`}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              €{Number(price.flightPrice).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              €{Number(price.hotelPrice).toFixed(2)}
                            </td>
                            {packageData.includesTransfer && (
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                €{Number(price.transferPrice).toFixed(2)}
                              </td>
                            )}
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              €{serviceCharge.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              €{subtotal.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              €{marginAmount.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-green-600">
                              €{Number(price.totalPrice).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                              {price.roomType}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => router.push(`/admin/packages/${params.id}/edit`)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit Package
          </button>
          <button
            onClick={async () => {
              setLoading(true);
              await fetch(`/api/admin/packages/${params.id}/calculate-prices`, { method: 'POST' });
              await fetchPackagePrices();
              setLoading(false);
            }}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Recalculate Prices
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}