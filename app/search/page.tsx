'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import MobileSearchPage from '@/components/mobile/SearchPage';
import { useSearchPage } from '@/lib/hooks/useSearchPage';
import { useIsMobile } from '@/lib/hooks/useDeviceType';

function SearchResults() {
  const isMobile = useIsMobile();
  const {
    packages,
    loading,
    adults,
    children,
    getPackagePrice
  } = useSearchPage();

  // Render mobile version
  if (isMobile) {
    return <MobileSearchPage />;
  }

  // Desktop version below

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                MXi Travel
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/destinations" className="text-gray-700 hover:text-blue-600">
                  Destinations
                </Link>
                <Link href="/hotels" className="text-gray-700 hover:text-blue-600">
                  Hotels
                </Link>
                <Link href="/tours" className="text-gray-700 hover:text-blue-600">
                  Tours
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Search Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Search Results
          </h1>
          <p className="text-gray-600">
            Found {packages.length} package{packages.length !== 1 ? 's' : ''} for {adults} adult{adults !== 1 ? 's' : ''}
            {children > 0 && ` and ${children} child${children !== 1 ? 'ren' : ''}`}
          </p>
        </div>

        {packages.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-xl text-gray-600 mb-4">
              No packages found for your search criteria.
            </p>
            <Link 
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Another Search
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map(pkg => (
              <Link
                key={pkg.id}
                href={`/packages/${pkg.slug || pkg.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                {/* Package Image */}
                <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-600 relative">
                  {pkg.featured && (
                    <span className="absolute top-4 right-4 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-sm font-semibold">
                      Featured
                    </span>
                  )}
                </div>
                
                {/* Package Details */}
                <div className="p-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {pkg.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {pkg.city.name}, {pkg.city.country.name}
                  </p>
                  <p className="text-gray-600 text-sm mb-3">
                    {pkg.nights} nights • {pkg.hotel.name}
                  </p>
                  
                  {/* Hotel Rating */}
                  <div className="flex items-center mb-3">
                    <span className="text-yellow-400">
                      {'★'.repeat(pkg.hotel.rating || 0)}
                    </span>
                    <span className="text-gray-300">
                      {'★'.repeat(5 - (pkg.hotel.rating || 0))}
                    </span>
                  </div>
                  
                  {/* Price */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-gray-500">From</p>
                      <p className="text-2xl font-bold text-blue-600">
                        €{getPackagePrice(pkg).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">per package</p>
                    </div>
                    <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                      View Details
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}