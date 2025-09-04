'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '@/hooks/useTranslation';
import { useState } from 'react';
import { 
  HomeIcon, 
  UserIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and primary nav */}
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-blue-600">TravelAgency</span>
            </Link>
            
            {/* Desktop navigation */}
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium flex items-center"
              >
                {t('navigation.home')}
              </Link>
              <Link
                href="/packages"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium flex items-center"
              >
                {t('navigation.packages')}
              </Link>
              <Link
                href="/flights"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium flex items-center"
              >
                {t('navigation.flights')}
              </Link>
              <Link
                href="/hotels"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium flex items-center"
              >
                {t('navigation.hotels')}
              </Link>
              
              {/* Admin/Agent links */}
              {session?.user?.role === 'ADMIN' && (
                <Link
                  href="/admin/dashboard"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium flex items-center"
                >
                  {t('navigation.admin')}
                </Link>
              )}
              {session?.user?.role === 'AGENT' && (
                <Link
                  href="/agent/dashboard"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium flex items-center"
                >
                  {t('navigation.agent')}
                </Link>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* User menu */}
            {status === 'loading' ? (
              <div className="animate-pulse h-8 w-20 bg-gray-200 rounded"></div>
            ) : session ? (
              <div className="flex items-center space-x-3">
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium hidden md:block"
                >
                  {t('dashboard')}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium flex items-center"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" />
                  <span className="hidden md:inline">{t('signOut')}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/auth/signin"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
                >
                  {t('signIn')}
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  {t('signUp')}
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600"
            >
              {t('navigation.home')}
            </Link>
            <Link
              href="/packages"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600"
            >
              {t('navigation.packages')}
            </Link>
            <Link
              href="/flights"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600"
            >
              {t('navigation.flights')}
            </Link>
            <Link
              href="/hotels"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600"
            >
              {t('navigation.hotels')}
            </Link>
            
            {session?.user?.role === 'ADMIN' && (
              <Link
                href="/admin/dashboard"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600"
              >
                {t('navigation.admin')}
              </Link>
            )}
            {session?.user?.role === 'AGENT' && (
              <Link
                href="/agent/dashboard"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600"
              >
                {t('navigation.agent')}
              </Link>
            )}
            
            {session && (
              <>
                <Link
                  href="/dashboard"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600"
                >
                  {t('dashboard')}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600"
                >
                  {t('signOut')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}