import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { logoutAction } from '@/lib/auth/actions';
import { getSession } from '@/lib/auth/session';

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/employees', label: 'Employees' },
  { href: '/departments', label: 'Departments' },
  { href: '/shifts', label: 'Shifts' },
  { href: '/shift-assignments', label: 'Assignments' },
  { href: '/attendance', label: 'Attendance' },
  { href: '/leave-requests', label: 'Leave' },
  { href: '/holidays', label: 'Holidays' },
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await getSession();

  if (!session || session.user.accountRole !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div>
          <p className="sidebar-kicker">Face Web</p>
          <h2>Admin</h2>
        </div>

        <nav className="admin-nav">
          {navigationItems.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="topbar-label">Signed in as</p>
            <p className="topbar-user">
              {session.user.name}
              <span>{session.user.employeeCode}</span>
            </p>
          </div>

          <form action={logoutAction}>
            <button className="secondary-button" type="submit">
              Sign out
            </button>
          </form>
        </header>

        {children}
      </div>
    </div>
  );
}
