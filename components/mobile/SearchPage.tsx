'use client';

import Link from 'next/link';
import { useSearchPage } from '@/lib/hooks/useSearchPage';

export default function MobileSearchPage() {
  const {
    packages,
    loading,
    adults,
    children,
    getPackagePrice
  } = useSearchPage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header - Sticky */}
      <header className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold">Search Results</h1>
        </div>
      </header>

      {/* Search Summary */}
      <div className="bg-white border-b p-4">
        <p className="text-sm text-gray-600">
          {packages.length} package{packages.length !== 1 ? 's' : ''} found
        </p>
        <p className="text-xs text-gray-500">
          {adults} adult{adults !== 1 ? 's' : ''}
          {children > 0 && `, ${children} child${children !== 1 ? 'ren' : ''}`}
        </p>
      </div>

      {/* Results */}
      <div className="p-4">
        {packages.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 mb-4">
              No packages found
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg active:bg-blue-700 text-sm font-semibold"
            >
              Try Another Search
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {packages.map(pkg => (
              <Link
                key={pkg.id}
                href={`/packages/${pkg.slug || pkg.id}`}
                className="block bg-white rounded-lg shadow active:shadow-md transition-shadow overflow-hidden"
              >
                {/* Package Image */}
                <div className="h-40 bg-gradient-to-br from-blue-400 to-blue-600 relative">
                  {pkg.featured && (
                    <span className="absolute top-3 right-3 bg-yellow-400 text-gray-900 px-2 py-1 rounded-full text-xs font-semibold">
                      Featured
                    </span>
                  )}
                </div>

                {/* Package Details */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {pkg.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {pkg.city.name}, {pkg.city.country.name}
                      </p>
                    </div>
                  </div>

                  {/* Hotel Info */}
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-sm text-gray-600">{pkg.hotel.name}</p>
                    <span className="text-xs">•</span>
                    <span className="text-yellow-400 text-sm">
                      {'★'.repeat(pkg.hotel.rating || 0)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mb-3">
                    {pkg.nights} night{pkg.nights !== 1 ? 's' : ''}
                  </p>

                  {/* Price and Action */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <p className="text-xs text-gray-500">From</p>
                      <p className="text-xl font-bold text-blue-600">
                        €{getPackagePrice(pkg).toFixed(2)}
                      </p>
                    </div>
                    <div className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
                      View
                    </div>
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
