import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { AdminNav } from '@/components/admin/nav';
import { logoutAction } from '@/lib/actions';
import { getSession } from '@/lib/session';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">FW</span>
          <div>
            <strong>Face Web</strong>
            <span>Attendance admin</span>
          </div>
        </div>
        <AdminNav />
      </aside>
      <div className="admin-main">
        <header className="topbar">
          <div>
            <span className="topbar-label">Signed in as</span>
            <strong>{session.user.name}</strong>
          </div>
          <form action={logoutAction}>
            <button className="ghost-button" type="submit">
              <LogOut aria-hidden="true" size={17} />
              Logout
            </button>
          </form>
        </header>
        {children}
      </div>
    </div>
  );
}
