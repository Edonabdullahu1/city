'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useHomePage } from '@/lib/hooks/useHomePage';

export default function MobileHomePage() {
  const {
    cities,
    availableDates,
    searchData,
    updateSearchData,
    handleSearch
  } = useHomePage();

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Header - Compact */}
      <header className="bg-blue-600 text-white p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">City Breaks</h1>
      </header>

      {/* Hero Section - Mobile Optimized */}
      <section className="px-4 py-6 bg-gradient-to-b from-blue-50 to-white">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Your Perfect City Break
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Discover amazing destinations with all-inclusive packages.
        </p>

        {/* Mobile Search Form - Stacked Layout */}
        <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-lg p-4 space-y-4">
          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination
            </label>
            <select
              value={searchData.destinationId}
              onChange={(e) => updateSearchData({ destinationId: e.target.value })}
              className="w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
              required
            >
              <option value="">Select destination...</option>
              {cities.map(city => (
                <option key={city.id} value={city.id}>
                  {city.name}, {city.country.name}
                </option>
              ))}
            </select>
          </div>

          {/* Departure Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Departure Date
            </label>
            <select
              value={searchData.departureDate}
              onChange={(e) => updateSearchData({ departureDate: e.target.value })}
              className="w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
              disabled={!searchData.destinationId}
              required
            >
              <option value="">Select date...</option>
              {availableDates.map(date => (
                <option key={date.date} value={date.date}>
                  {new Date(date.date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })} ({date.availableSeats} seats)
                </option>
              ))}
            </select>
          </div>

          {/* Adults and Children - Side by Side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Adults */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adults
              </label>
              <select
                value={searchData.adults}
                onChange={(e) => updateSearchData({ adults: parseInt(e.target.value) })}
                className="w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>

            {/* Children */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Children
              </label>
              <select
                value={searchData.children}
                onChange={(e) => updateSearchData({ children: parseInt(e.target.value) })}
                className="w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
          </div>

          {/* Search Button - Full Width */}
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg active:bg-blue-700 transition-colors text-base"
          >
            Search Packages
          </button>
        </form>
      </section>

      {/* Popular Destinations - Mobile Cards */}
      <section className="px-4 py-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Popular Destinations
        </h2>
        <div className="space-y-4">
          {cities.slice(0, 6).map(city => (
            <Link
              key={city.id}
              href={`/destinations/${city.slug || city.id}`}
              className="block bg-white rounded-lg shadow active:shadow-md transition-shadow overflow-hidden"
            >
              <div className="flex">
                {/* Image - Square */}
                <div className="w-24 h-24 relative flex-shrink-0">
                  {city.profileImage ? (
                    <Image
                      src={city.profileImage}
                      alt={city.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 p-3 flex flex-col justify-center">
                  <h3 className="text-lg font-semibold text-gray-900">{city.name}</h3>
                  <p className="text-sm text-gray-600">{city.country.name}</p>
                </div>
                {/* Arrow */}
                <div className="flex items-center pr-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Mobile Footer - Simple */}
      <footer className="bg-gray-900 text-white p-6 mt-8">
        <p className="text-center text-sm text-gray-400">
          © 2024 City Breaks. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
