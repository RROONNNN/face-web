import type { MonthlyReport, PresentEmployee } from '@face-web/shared';
import { RealtimeRefresh } from '@/components/admin/realtime-refresh';
import { EmptyState } from '@/components/admin/empty-state';
import { backendFetch } from '@/lib/api';
import { currentMonth, formatDateTime, formatHours } from '@/lib/format';

export default async function DashboardPage() {
  const month = currentMonth();
  const [present, report] = await Promise.all([
    backendFetch<PresentEmployee[]>('/dashboard/present'),
    backendFetch<MonthlyReport>(`/reports/monthly?month=${month}&limit=100`),
  ]);

  const totals = report.items.reduce(
    (acc, item) => ({
      hours: acc.hours + item.totalWorkHours,
      late: acc.late + item.lateCount,
      early: acc.early + item.earlyLeaveCount,
      outOfZone: acc.outOfZone + item.outOfZoneCount,
    }),
    { hours: 0, late: 0, early: 0, outOfZone: 0 },
  );

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Dashboard</h1>
          <p className="muted">Present employees and current month signals.</p>
        </div>
        <RealtimeRefresh />
      </section>

      <section className="metric-grid">
        <article className="metric">
          <span>Present now</span>
          <strong>{present.length}</strong>
        </article>
        <article className="metric">
          <span>Month hours</span>
          <strong>{formatHours(totals.hours)}</strong>
        </article>
        <article className="metric">
          <span>Late arrivals</span>
          <strong>{totals.late}</strong>
        </article>
        <article className="metric">
          <span>Out of zone</span>
          <strong>{totals.outOfZone}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Present today</h2>
            <p className="muted">Employees checked in without a later checkout.</p>
          </div>
        </div>

        {present.length === 0 ? (
          <EmptyState
            title="No one is currently present"
            detail="New check-ins will appear here when the dashboard receives an update."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Check-in</th>
                  <th>Status</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {present.map((row) => (
                  <tr key={row.employee.id}>
                    <td>
                      <strong>{row.employee.name}</strong>
                      <span className="subtext">{row.employee.employeeCode}</span>
                    </td>
                    <td>{formatDateTime(row.checkIn.time)}</td>
                    <td>
                      <span className={row.late ? 'pill warning' : 'pill'}>
                        {row.late ? 'Late' : 'On time'}
                      </span>
                    </td>
                    <td>
                      <span className={row.outOfZone ? 'pill danger' : 'pill'}>
                        {row.outOfZone ? 'Out of zone' : 'In zone'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
