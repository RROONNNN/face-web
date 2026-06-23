import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { logoutAction } from '@/lib/auth/actions';
import { getSession } from '@/lib/auth/session';

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
      <AdminSidebar userName={session.user.name} employeeCode={session.user.employeeCode} />

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
