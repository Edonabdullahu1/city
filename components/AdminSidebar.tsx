'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';
import { adminMenuItems } from '@/lib/admin-menu';

export default function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold">MXi Admin</h2>
          <p className="text-sm text-gray-400 mt-1">Travel Management System</p>
        </div>
        
        {/* Navigation */}
        <nav className="space-y-1 flex-1">
          {adminMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
                           (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'hover:bg-gray-800 text-gray-300 hover:text-white'
                }`}
                title={item.description}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`} />
                <div className="flex-1">
                  <span className="font-medium">{item.label}</span>
                  {item.description && !isActive && (
                    <p className="text-xs text-gray-500 group-hover:text-gray-400 hidden lg:block">
                      {item.description}
                    </p>
                  )}
                </div>
                {isActive && (
                  <div className="w-1 h-6 bg-white rounded-full opacity-60"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="pt-6 mt-6 border-t border-gray-800">
          <div className="px-4 mb-4">
            <p className="text-xs text-gray-500">Logged in as</p>
            <p className="text-sm text-gray-300 truncate">{session?.user?.email}</p>
          </div>
          
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center space-x-3 px-4 py-2.5 w-full rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-all duration-200 group"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5 text-gray-400 group-hover:text-white" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}