'use client';

import Link from 'next/link';

export default function AboutPage() {
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
                <Link href="/about" className="text-blue-600 font-medium">
                  About
                </Link>
                <Link href="/contact" className="text-gray-700 hover:text-blue-600">
                  Contact
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/auth/signin" className="text-gray-700 hover:text-blue-600">
                Sign In
              </Link>
              <Link 
                href="/auth/signup" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">About MXi Travel</h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto">
            Your trusted partner for unforgettable city breaks across Europe and beyond
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="prose prose-lg text-gray-700">
                <p className="mb-4">
                  Founded in 2020, MXi Travel has quickly become a leading provider of city break 
                  packages in the Balkans and throughout Europe. Our mission is to make travel 
                  accessible, enjoyable, and memorable for everyone.
                </p>
                <p className="mb-4">
                  We specialize in creating comprehensive travel packages that include everything 
                  you need for the perfect city break: flights, accommodation, transfers, and 
                  carefully selected excursions. Our team works tirelessly to negotiate the best 
                  rates with airlines and hotels, passing the savings on to you.
                </p>
                <p>
                  With offices in Tirana, Albania, we have local expertise in Balkan destinations 
                  while maintaining strong partnerships with suppliers across Europe and the Middle East.
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg h-96"></div>
          </div>

          {/* Values */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-lg p-6 shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Quality First</h3>
                <p className="text-gray-700">
                  We carefully select our partner hotels and airlines to ensure you receive 
                  the best possible experience on your city break.
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Best Value</h3>
                <p className="text-gray-700">
                  Through our partnerships and bulk purchasing, we offer competitive prices 
                  without compromising on quality or service.
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">🤝</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Customer Care</h3>
                <p className="text-gray-700">
                  Our dedicated support team is available to assist you before, during, 
                  and after your trip to ensure everything goes smoothly.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-lg shadow-lg p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">MXi Travel in Numbers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">20+</div>
                <div className="text-gray-600">Destinations</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">50+</div>
                <div className="text-gray-600">Partner Hotels</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">10k+</div>
                <div className="text-gray-600">Happy Travelers</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">4.8</div>
                <div className="text-gray-600">Average Rating</div>
              </div>
            </div>
          </div>

          {/* Team */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Meet Our Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-32 h-32 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-900">John Smith</h3>
                <p className="text-gray-600">CEO & Founder</p>
              </div>
              <div className="text-center">
                <div className="w-32 h-32 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-900">Maria Garcia</h3>
                <p className="text-gray-600">Operations Director</p>
              </div>
              <div className="text-center">
                <div className="w-32 h-32 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-900">Ahmed Hassan</h3>
                <p className="text-gray-600">Customer Experience Manager</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
          <p className="text-xl mb-8 opacity-90">
            Browse our destinations and find your perfect city break package today
          </p>
          <Link 
            href="/destinations"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Explore Destinations
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">MXi Travel</h3>
              <p className="text-gray-400">
                Your trusted partner for unforgettable city breaks.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/destinations" className="hover:text-white">Destinations</Link></li>
                <li><Link href="/hotels" className="hover:text-white">Hotels</Link></li>
                <li><Link href="/tours" className="hover:text-white">Tours</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact Info</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Email: info@mxitravel.com</li>
                <li>Phone: +355 69 123 4567</li>
                <li>Address: Tirana, Albania</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2024 MXi Travel. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}