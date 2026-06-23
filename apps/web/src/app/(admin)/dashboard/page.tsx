import type { Metadata } from 'next';

const foundationItems = [
  'API envelope and error handling utilities',
  'HTTP-only cookie session persistence',
  'Admin-only route protection',
  'Refresh-and-retry request helper',
];

export const metadata: Metadata = {
  title: 'Dashboard | Face Web Admin',
};

export default function DashboardPage() {
  return (
    <main className="admin-content">
      <section className="page-heading">
        <p className="eyebrow">Operations</p>
        <h1>Dashboard</h1>
        <p>
          The admin foundation is ready for feature pages to connect to the
          existing attendance APIs.
        </p>
      </section>

      <section className="status-grid" aria-label="Completed foundation work">
        {foundationItems.map((item) => (
          <article className="status-card" key={item}>
            <span className="status-indicator" aria-hidden="true" />
            <p>{item}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
