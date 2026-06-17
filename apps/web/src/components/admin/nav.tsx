'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CalendarCheck,
  Clock3,
  FileText,
  Fingerprint,
  LayoutDashboard,
  MapPin,
  Users,
} from 'lucide-react';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/shifts', label: 'Shifts', icon: Clock3 },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/leave', label: 'Leave', icon: FileText },
  { href: '/face', label: 'Face data', icon: Fingerprint },
  { href: '/geofence', label: 'Geofence', icon: MapPin },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label="Admin sections">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? 'nav-link active' : 'nav-link'}
          >
            <Icon aria-hidden="true" size={18} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
