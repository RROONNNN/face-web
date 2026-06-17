import type { Employee, MonthlyReport, PaginatedResponse } from '@face-web/shared';
import { EmptyState } from '@/components/admin/empty-state';
import { MessageBanner } from '@/components/admin/message-banner';
import { Pagination } from '@/components/admin/pagination';
import { backendFetch } from '@/lib/api';
import { currentMonth, formatHours } from '@/lib/format';
import {
  asInt,
  asString,
  type PageSearchParams,
} from '@/lib/search';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const month = asString(params.month) ?? currentMonth();
  const empId = asString(params.empId);
  const page = asInt(params.page);
  const limit = 10;
  const query = new URLSearchParams({
    month,
    page: String(page),
    limit: String(limit),
  });
  if (empId) query.set('empId', empId);

  const [report, employees] = await Promise.all([
    backendFetch<MonthlyReport>(`/reports/monthly?${query.toString()}`),
    backendFetch<PaginatedResponse<Employee>>('/employees?limit=100'),
  ]);

  const totals = report.items.reduce(
    (acc, item) => ({
      hours: acc.hours + item.totalWorkHours,
      leave: acc.leave + item.leaveDays,
      late: acc.late + item.lateCount,
      early: acc.early + item.earlyLeaveCount,
      outOfZone: acc.outOfZone + item.outOfZoneCount,
    }),
    { hours: 0, leave: 0, late: 0, early: 0, outOfZone: 0 },
  );

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Insights</p>
          <h1>Reports</h1>
          <p className="muted">Monthly attendance metrics by employee.</p>
        </div>
      </section>

      <MessageBanner
        error={asString(params.error)}
        message={asString(params.message)}
      />

      <section className="metric-grid">
        <article className="metric">
          <span>Total hours</span>
          <strong>{formatHours(totals.hours)}</strong>
        </article>
        <article className="metric">
          <span>Leave days</span>
          <strong>{totals.leave}</strong>
        </article>
        <article className="metric">
          <span>Late count</span>
          <strong>{totals.late}</strong>
        </article>
        <article className="metric">
          <span>Early leave</span>
          <strong>{totals.early}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{month} report</h2>
            <p className="muted">{report.total} employees</p>
          </div>
        </div>

        <form className="filter-bar">
          <label>
            <span>Month</span>
            <input name="month" type="month" defaultValue={month} required />
          </label>
          <label>
            <span>Employee</span>
            <select name="empId" defaultValue={empId ?? ''}>
              <option value="">All</option>
              {employees.items.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeCode} - {employee.name}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary-button" type="submit">
            Filter
          </button>
        </form>

        {report.items.length === 0 ? (
          <EmptyState
            title="No report rows"
            detail="Try another month or employee filter."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Work days</th>
                  <th>Hours</th>
                  <th>Leave</th>
                  <th>Late</th>
                  <th>Early</th>
                  <th>Out of zone</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((item) => (
                  <tr key={item.employee.id}>
                    <td>
                      <strong>{item.employee.name}</strong>
                      <span className="subtext">{item.employee.employeeCode}</span>
                    </td>
                    <td>{item.totalWorkDays}</td>
                    <td>{formatHours(item.totalWorkHours)}</td>
                    <td>{item.leaveDays}</td>
                    <td>{item.lateCount}</td>
                    <td>{item.earlyLeaveCount}</td>
                    <td>{item.outOfZoneCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          basePath="/reports"
          page={report.page}
          limit={report.limit}
          total={report.total}
          searchParams={{ month, empId }}
        />
      </section>
    </main>
  );
}
