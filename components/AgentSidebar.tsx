'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CalendarIcon,
  BellIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';

export default function AgentSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { href: '/agent/dashboard', label: 'Dashboard', icon: HomeIcon },
    { href: '/agent/bookings', label: 'Bookings', icon: ClipboardDocumentListIcon },
    { href: '/agent/customers', label: 'Customers', icon: UserGroupIcon },
    { href: '/agent/calendar', label: 'Calendar', icon: CalendarIcon },
    { href: '/agent/documents', label: 'Documents', icon: DocumentTextIcon },
    { href: '/agent/reports', label: 'Reports', icon: ChartBarIcon },
    { href: '/agent/notifications', label: 'Notifications', icon: BellIcon },
  ];

  return (
    <aside className="w-64 bg-indigo-900 text-white min-h-screen">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-8">MXi Agent</h2>
        
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'hover:bg-indigo-800 text-indigo-300 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-8 border-t border-indigo-800">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg hover:bg-indigo-800 text-indigo-300 hover:text-white transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}