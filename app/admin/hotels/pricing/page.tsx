'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { CalculatorIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface City {
  id: string;
  name: string;
  countryName?: string;
  country?: {
    name: string;
  };
}

interface Kid {
  id: string;
  age: number;
}

interface PriceCalculation {
  hotelId: string;
  hotelName: string;
  starRating: number;
  board: string;
  roomType: string;
  nights: number;
  basePrice: number;
  adultPrice: number;
  childrenPrice: number;
  totalPrice: number;
  priceBreakdown: {
    pricePerNight: number;
    singlePrice?: number;
    doublePrice?: number;
    extraBedPrice?: number;
    childPrices: Array<{
      age: number;
      price: number;
      reason: string;
    }>;
  };
  availability: boolean;
  message?: string;
}

export default function HotelPricingCalculatorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PriceCalculation[]>([]);
  
  const [searchParams, setSearchParams] = useState({
    cityId: '',
    checkIn: '',
    checkOut: '',
    adults: 2,
    kids: [] as Kid[]
  });

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/');
    } else if (session) {
      fetchCities();
    }
  }, [status, session, router]);

  const fetchCities = async () => {
    try {
      const response = await fetch('/api/admin/cities');
      if (!response.ok) throw new Error('Failed to fetch cities');
      const data = await response.json();
      setCities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const addKid = () => {
    const newKid: Kid = {
      id: `kid-${Date.now()}`,
      age: 0
    };
    setSearchParams(prev => ({
      ...prev,
      kids: [...prev.kids, newKid]
    }));
  };

  const removeKid = (kidId: string) => {
    setSearchParams(prev => ({
      ...prev,
      kids: prev.kids.filter(k => k.id !== kidId)
    }));
  };

  const updateKidAge = (kidId: string, age: number) => {
    setSearchParams(prev => ({
      ...prev,
      kids: prev.kids.map(k => k.id === kidId ? { ...k, age } : k)
    }));
  };

  const calculatePrices = async () => {
    if (!searchParams.cityId || !searchParams.checkIn || !searchParams.checkOut) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        cityId: searchParams.cityId,
        checkIn: searchParams.checkIn,
        checkOut: searchParams.checkOut,
        adults: searchParams.adults.toString(),
        childAges: searchParams.kids.map(k => k.age).join(',')
      });

      const response = await fetch(`/api/admin/hotels/calculate-prices?${params}`);
      if (!response.ok) throw new Error('Failed to calculate prices');
      
      const data = await response.json();
      setResults(data.calculations || []);
    } catch (error) {
      console.error('Error calculating prices:', error);
      alert('Failed to calculate prices');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getBoardTypeLabel = (board: string) => {
    const types: Record<string, string> = {
      'RO': 'Room Only',
      'BB': 'Bed & Breakfast',
      'HB': 'Half Board',
      'FB': 'Full Board',
      'AI': 'All Inclusive'
    };
    return types[board] || board;
  };

  if (status === 'loading') {
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <CalculatorIcon className="h-8 w-8 mr-3" />
            Hotel Pricing Calculator
          </h1>
          <p className="text-gray-600 mt-2">
            Calculate hotel prices based on occupancy, dates, and age policies
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <select
                value={searchParams.cityId}
                onChange={(e) => setSearchParams({ ...searchParams, cityId: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a city...</option>
                {cities.map(city => (
                  <option key={city.id} value={city.id}>
                    {city.name}{city.countryName ? `, ${city.countryName}` : (city.country ? `, ${city.country.name}` : '')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-in Date *
              </label>
              <input
                type="date"
                value={searchParams.checkIn}
                onChange={(e) => setSearchParams({ ...searchParams, checkIn: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-out Date *
              </label>
              <input
                type="date"
                value={searchParams.checkOut}
                min={searchParams.checkIn}
                onChange={(e) => setSearchParams({ ...searchParams, checkOut: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Adults
              </label>
              <select
                value={searchParams.adults}
                onChange={(e) => setSearchParams({ ...searchParams, adults: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 Adult</option>
                <option value={2}>2 Adults</option>
                <option value={3}>3 Adults</option>
              </select>
            </div>
          </div>

          {/* Kids Section */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-gray-700">
                Children
              </label>
              <button
                type="button"
                onClick={addKid}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Child
              </button>
            </div>

            {searchParams.kids.length > 0 && (
              <div className="space-y-2">
                {searchParams.kids.map((kid, index) => (
                  <div key={kid.id} className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Child {index + 1}:</span>
                    <select
                      value={kid.age}
                      onChange={(e) => updateKidAge(kid.id, parseInt(e.target.value))}
                      className="px-3 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                      {[...Array(18)].map((_, age) => (
                        <option key={age} value={age}>
                          {age} {age === 1 ? 'year' : 'years'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeKid(kid.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={calculatePrices}
              disabled={loading}
              className={`px-6 py-2 rounded-lg text-white flex items-center ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Calculating...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                  Calculate Prices
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h2 className="text-lg font-semibold">
                Price Calculations ({results.length} hotels found)
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hotel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Board / Room
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nights
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Adults
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Children
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {result.hotelName}
                          </div>
                          <div className="text-sm text-gray-500">
                            <span className="text-yellow-400">
                              {'★'.repeat(result.starRating)}
                            </span>
                            <span className="text-gray-300">
                              {'★'.repeat(5 - result.starRating)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{getBoardTypeLabel(result.board)}</div>
                        <div className="text-xs text-gray-500">{result.roomType}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {result.nights}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{formatCurrency(result.adultPrice)}</div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(result.priceBreakdown.pricePerNight)}/night
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {result.childrenPrice > 0 ? (
                          <div>
                            <div>{formatCurrency(result.childrenPrice)}</div>
                            <div className="text-xs text-gray-500">
                              {result.priceBreakdown.childPrices.map((cp, i) => (
                                <div key={i}>
                                  {cp.age}y: {cp.reason}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-green-600">Free</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-semibold text-green-600">
                          {formatCurrency(result.totalPrice)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {result.availability ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Available
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                            {result.message || 'Not Available'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {results.length === 0 && !loading && (
          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
            Enter search criteria above to calculate hotel prices
          </div>
        )}
      </div>
    </AdminLayout>
  );
}