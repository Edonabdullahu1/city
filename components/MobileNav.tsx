'use client';

import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiMenu, FiX, FiHome, FiSearch, FiCalendar, FiUser, FiLogOut, FiSettings, FiGrid, FiUsers } from 'react-icons/fi';

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();

  const userLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: <FiHome /> },
    { href: '/search', label: 'Search', icon: <FiSearch /> },
    { href: '/bookings', label: 'My Bookings', icon: <FiCalendar /> },
    { href: '/profile', label: 'Profile', icon: <FiUser /> },
  ];

  const agentLinks = [
    { href: '/agent/dashboard', label: 'Agent Dashboard', icon: <FiGrid /> },
    { href: '/agent/bookings', label: 'Manage Bookings', icon: <FiCalendar /> },
    { href: '/agent/customers', label: 'Customers', icon: <FiUsers /> },
  ];

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Admin Dashboard', icon: <FiGrid /> },
    { href: '/admin/hotels', label: 'Hotels', icon: <FiHome /> },
    { href: '/admin/flights', label: 'Flights', icon: <FiSearch /> },
    { href: '/admin/users', label: 'Users', icon: <FiUsers /> },
    { href: '/admin/settings', label: 'Settings', icon: <FiSettings /> },
  ];

  const getLinks = () => {
    if (!session) return [];
    
    const role = session.user?.role;
    if (role === 'ADMIN') return [...adminLinks, ...agentLinks, ...userLinks];
    if (role === 'AGENT') return [...agentLinks, ...userLinks];
    return userLinks;
  };

  const links = getLinks();

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={`md:hidden fixed top-0 right-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 z-40 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          {/* User Info */}
          {session?.user && (
            <div className="mb-6 pb-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {session.user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{session.user.name}</p>
                  <p className="text-sm text-gray-600">{session.user.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(link.href)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Logout Button */}
          {session && (
            <button
              onClick={() => {
                signOut({ callbackUrl: '/' });
                setIsOpen(false);
              }}
              className="w-full mt-6 flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FiLogOut />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar for Mobile */}
      {session && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-30">
          <div className="flex justify-around items-center py-2">
            <Link
              href="/dashboard"
              className={`flex flex-col items-center p-2 ${
                isActive('/dashboard') ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <FiHome size={20} />
              <span className="text-xs mt-1">Home</span>
            </Link>
            <Link
              href="/search"
              className={`flex flex-col items-center p-2 ${
                isActive('/search') ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <FiSearch size={20} />
              <span className="text-xs mt-1">Search</span>
            </Link>
            <Link
              href="/bookings"
              className={`flex flex-col items-center p-2 ${
                isActive('/bookings') ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <FiCalendar size={20} />
              <span className="text-xs mt-1">Bookings</span>
            </Link>
            <Link
              href="/profile"
              className={`flex flex-col items-center p-2 ${
                isActive('/profile') ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <FiUser size={20} />
              <span className="text-xs mt-1">Profile</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}