'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import { useState } from 'react';

const management = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/employees', label: 'Employees', icon: UsersIcon },
  { href: '/departments', label: 'Departments', icon: BuildingIcon },
  { href: '/attendance', label: 'Attendance', icon: CalendarIcon },
  { href: '/shifts', label: 'Shifts', icon: ClockIcon },
  { href: '/shift-assignments', label: 'Assignments', icon: ScheduleIcon },
] as const;

const administration = [
  { href: '/leave-requests', label: 'Leave Requests', icon: FileIcon },
  { href: '/holidays', label: 'Holidays', icon: CalendarIcon },
] as const;

type AdminSidebarProps = {
  userName: string;
  employeeCode: string;
};

export function AdminSidebar({ userName, employeeCode }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const initials = getInitials(userName);
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/' || pathname === href : pathname.startsWith(href);

  return (
    <aside className={isCollapsed ? 'admin-sidebar is-collapsed' : 'admin-sidebar'} aria-label="Admin navigation">
      <div className="sidebar-brand">
        <Link href="/dashboard" className="sidebar-brand-link" aria-label="Face Web dashboard">
          <span className="sidebar-brand-mark">F</span>
          <span className="sidebar-brand-text">
            <span className="sidebar-brand-name">Face Web</span>
            <span className="sidebar-brand-subtitle">Admin Portal</span>
          </span>
        </Link>
      </div>

      <nav className="admin-nav">
        <NavSection title="Management" items={management} isActive={isActive} isCollapsed={isCollapsed} />
        <NavSection title="Administration" items={administration} isActive={isActive} isCollapsed={isCollapsed} />
      </nav>

      <div className="sidebar-user">
        <span className="sidebar-avatar" title={isCollapsed ? userName : undefined}>{initials}</span>
        <span className="sidebar-user-copy">
          <span className="sidebar-user-name">{userName}</span>
          <span className="sidebar-user-role">{employeeCode}</span>
        </span>
      </div>

      <button
        className="sidebar-collapse-btn"
        onClick={() => setIsCollapsed((v) => !v)}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronIcon className={isCollapsed ? 'sidebar-collapse-icon is-collapsed' : 'sidebar-collapse-icon'} />
      </button>
    </aside>
  );
}

function NavSection({
  title,
  items,
  isActive,
  isCollapsed,
}: {
  title: string;
  items: readonly {
    href: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
    badge?: number;
  }[];
  isActive: (href: string) => boolean;
  isCollapsed: boolean;
}) {
  return (
    <div className="admin-nav-section">
      <p className="admin-nav-heading">{title}</p>
      {items.map((item) => (
        <NavItem key={item.href} {...item} active={isActive(item.href)} isCollapsed={isCollapsed} />
      ))}
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
  isCollapsed,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  badge?: number;
  isCollapsed: boolean;
}) {
  return (
    <Link
      href={href}
      className={active ? 'admin-nav-link is-active' : 'admin-nav-link'}
      title={isCollapsed ? label : undefined}
    >
      <Icon className="admin-nav-icon" />
      <span className="admin-nav-label">{label}</span>
      {badge ? <span className="admin-nav-badge">{badge}</span> : null}
    </Link>
  );
}

function getInitials(name: string) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'FW';
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4Zm9 0A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5v-4Zm-9 9A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4Zm9 0a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4Z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M9.5 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.59 0-6.5 1.73-6.5 3.86V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-1.14C16 15.73 13.09 14 9.5 14Zm7.75-2.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Zm.5 2.2c-.69 0-1.34.07-1.95.2 1.34.86 2.2 2.02 2.2 3.71V20h3a1 1 0 0 0 1-1v-.95c0-2.27-1.9-4.1-4.25-4.1Z" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 20V5.5A1.5 1.5 0 0 1 6.5 4h7A1.5 1.5 0 0 1 15 5.5V9h2.5A1.5 1.5 0 0 1 19 10.5V20h-5v-4h-4v4H5Zm3-12h2V6H8v2Zm4 0h1V6h-1v2Zm-4 4h2v-2H8v2Zm4 0h1v-2h-1v2Zm3 0h2v-1h-2v1Zm0 3h2v-1h-2v1Z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 3a1 1 0 0 1 1 1v1h8V4a1 1 0 1 1 2 0v1h1.5A1.5 1.5 0 0 1 21 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-12A1.5 1.5 0 0 1 4.5 5H6V4a1 1 0 0 1 1-1Zm12 7H5v8h14v-8Zm-6.3 5.7 3.8-3.8a1 1 0 0 0-1.4-1.4L12 13.59l-1.1-1.09a1 1 0 0 0-1.4 1.41l1.8 1.79a1 1 0 0 0 1.4 0Z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm1 9.59 3.21 3.2-1.42 1.42-3.5-3.5A1 1 0 0 1 11 13V7h2v5.59Z" />
    </svg>
  );
}

function ScheduleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5.5 4A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 18.5 4h-13ZM7 8h10v2H7V8Zm0 4h4v2H7v-2Zm6 0h4v2h-4v-2Zm-6 4h4v2H7v-2Zm6 0h4v2h-4v-2Z" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h6.09c.4 0 .78.16 1.06.44l3.91 3.91c.28.28.44.66.44 1.06V20.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20.5v-17ZM14 4.5V8h3.5L14 4.5ZM9 12h6v-2H9v2Zm0 4h6v-2H9v2Z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59Z" />
    </svg>
  );
}
