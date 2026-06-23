import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Face Web Admin',
};

export default function DashboardPage() {
  return (
    <main className="admin-content">
      <section className="page-heading">
        <p className="eyebrow">Deferred</p>
        <h1>Dashboard</h1>
        <p>
          Dashboard metrics and summaries are intentionally deferred until the
          admin feature pages are complete.
        </p>
      </section>
      <Link className="primary-link" href="/employees">
        Go to employees
      </Link>
    </main>
  );
}
