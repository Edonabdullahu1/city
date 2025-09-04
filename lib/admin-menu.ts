import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  PaperAirplaneIcon,
  TruckIcon,
  TicketIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  MapPinIcon,
  CubeIcon,
  CalendarDaysIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline';

export interface MenuItem {
  href: string;
  label: string;
  icon: any;
  description?: string;
}

// Centralized admin menu configuration
export const adminMenuItems: MenuItem[] = [
  { 
    href: '/admin/dashboard', 
    label: 'Dashboard', 
    icon: HomeIcon,
    description: 'Overview and statistics'
  },
  { 
    href: '/admin/bookings', 
    label: 'Bookings', 
    icon: CalendarDaysIcon,
    description: 'Manage reservations'
  },
  { 
    href: '/admin/packages', 
    label: 'Packages', 
    icon: CubeIcon,
    description: 'Travel packages'
  },
  { 
    href: '/admin/locations', 
    label: 'Locations', 
    icon: MapPinIcon,
    description: 'Countries, cities & airports'
  },
  { 
    href: '/admin/hotels', 
    label: 'Hotels', 
    icon: BuildingOfficeIcon,
    description: 'Hotel inventory'
  },
  { 
    href: '/admin/flights', 
    label: 'Flights', 
    icon: PaperAirplaneIcon,
    description: 'Flight blocks & seats'
  },
  { 
    href: '/admin/transfers', 
    label: 'Transfers', 
    icon: TruckIcon,
    description: 'Transfer services'
  },
  { 
    href: '/admin/excursions', 
    label: 'Excursions', 
    icon: TicketIcon,
    description: 'Tours & activities'
  },
  { 
    href: '/admin/price-calculator', 
    label: 'Price Calculator', 
    icon: CalculatorIcon,
    description: 'Calculate package prices'
  },
  { 
    href: '/admin/users', 
    label: 'Users', 
    icon: UsersIcon,
    description: 'User management'
  },
  { 
    href: '/admin/reports', 
    label: 'Reports', 
    icon: ChartBarIcon,
    description: 'Analytics & reports'
  },
  { 
    href: '/admin/settings', 
    label: 'Settings', 
    icon: Cog6ToothIcon,
    description: 'System configuration'
  }
];