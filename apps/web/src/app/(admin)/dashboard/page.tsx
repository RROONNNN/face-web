import Link from 'next/link';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/admin/empty-state';
import { Notice } from '@/components/admin/notice';
import { StatusBadge } from '@/components/admin/status-badge';
import { firstParam } from '@/lib/api/query';
import type {
  AttendanceDashboardAttention,
  AttendanceDashboardTotals,
  DashboardAttendanceStatus,
} from '@/lib/api/types';
import { getAttendanceDashboard, getDepartments, getUsers } from '@/lib/admin/data';
import { AttendanceActionButtons } from '../attendance/attendance-actions';

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const metricCards: Array<{
  key: keyof AttendanceDashboardTotals;
  label: string;
  tone?: 'good' | 'warning' | 'danger' | 'muted';
}> = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'checkedIn', label: 'Checked in now', tone: 'good' },
  { key: 'completed', label: 'Completed', tone: 'good' },
  { key: 'late', label: 'Late', tone: 'warning' },
  { key: 'missingCheckOut', label: 'Missing checkout', tone: 'danger' },
  { key: 'absent', label: 'Absent', tone: 'danger' },
  { key: 'onLeave', label: 'On leave', tone: 'muted' },
  { key: 'pending', label: 'Pending / no record', tone: 'warning' },
];

export const metadata: Metadata = {
  title: 'Attendance Dashboard | Face Web Admin',
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const workDate = firstParam(params.workDate) ?? todayInAppTimezone();
  const departmentId = firstParam(params.departmentId);
  const returnPath = `/dashboard?${new URLSearchParams(
    Object.entries({ workDate, departmentId })
      .filter(([, value]) => value)
      .map(([key, value]) => [key, String(value)]),
  ).toString()}`;

  const [dashboard, departments, employees] = await Promise.all([
    getAttendanceDashboard({ workDate, departmentId }),
    getDepartments({ limit: 100, isActive: true, sortBy: 'name', sortOrder: 'ASC' }),
    getUsers({ limit: 100, isActive: true, sortBy: 'name', sortOrder: 'ASC' }),
  ]);
  const pendingTotal = dashboard.totals.pending + dashboard.totals.noRecord;

  return (
    <main className="admin-content">
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Today Ops</p>
          <h1>Attendance Dashboard</h1>
          <p>
            Monitor scheduled employees, current attendance state, and exceptions
            that need admin action.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <Link className="secondary-link" href={`/attendance?date=${dashboard.workDate}`}>
            Attendance table
          </Link>
          <Link className="secondary-link" href={`/shift-assignments?workDate=${dashboard.workDate}`}>
            Shift assignments
          </Link>
          <Link className="secondary-link" href="/leave-requests?status=pending">
            Leave requests
          </Link>
        </div>
      </section>

      <Notice searchParams={params} />

      <form className="dashboard-filter-bar">
        <label className="field">
          <span>Work date</span>
          <input defaultValue={dashboard.workDate} name="workDate" type="date" />
        </label>
        <label className="field">
          <span>Department</span>
          <select defaultValue={departmentId ?? ''} name="departmentId">
            <option value="">All departments</option>
            {departments.items.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button" type="submit">
          Refresh
        </button>
      </form>

      <section className="dashboard-meta-row">
        <span>Generated {formatDateTime(dashboard.generatedAt)}</span>
        <span>{dashboard.timezone}</span>
        <span>{dashboard.rates.attendanceRate}% attendance</span>
        <span>{dashboard.rates.completionRate}% completion</span>
        <span>{dashboard.rates.lateRate}% late</span>
      </section>

      <section className="dashboard-metric-grid" aria-label="Attendance metrics">
        {metricCards.map((metric) => (
          <article className={`dashboard-metric-card tone-${metric.tone ?? 'default'}`} key={metric.key}>
            <span>{metric.label}</span>
            <strong>
              {metric.key === 'pending'
                ? pendingTotal
                : dashboard.totals[metric.key]}
            </strong>
          </article>
        ))}
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-panel dashboard-attention-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Needs attention</h2>
              <p>Sorted by operational severity.</p>
            </div>
            <Link className="secondary-link compact-link" href={`/attendance?date=${dashboard.workDate}`}>
              View all
            </Link>
          </div>

          {dashboard.attention.length === 0 ? (
            <EmptyState message="No attendance exceptions for the selected date." />
          ) : (
            <div className="table-wrap dashboard-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Status</th>
                    <th>Expected</th>
                    <th>Actual</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.attention.map((row) => (
                    <tr key={`${row.shiftAssignmentId}-${row.status}`}>
                      <td>
                        <Link className="table-link" href={`/employees/${row.employeeId}`}>
                          {row.employeeName}
                        </Link>
                        <span>{row.employeeCode} - {row.departmentName ?? 'Unassigned'}</span>
                      </td>
                      <td>
                        <StatusBadge active={isPresentStatus(row.status)}>
                          {formatStatus(row.status)}
                        </StatusBadge>
                        {row.lateMinutes > 0 ? <span>{row.lateMinutes} min late</span> : null}
                      </td>
                      <td>
                        {formatTime(row.expectedCheckInAt)}
                        <span>{formatTime(row.expectedCheckOutAt)}</span>
                      </td>
                      <td>
                        {row.checkedInAt ? formatTime(row.checkedInAt) : '-'}
                        <span>{row.checkedOutAt ? formatTime(row.checkedOutAt) : '-'}</span>
                      </td>
                      <td>{actionLink(row, dashboard.workDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <aside className="dashboard-side-stack">
          <article className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <h2>Admin actions</h2>
                <p>Manual tools for today.</p>
              </div>
            </div>
            <div className="dashboard-actions">
              <AttendanceActionButtons
                defaultWorkDate={dashboard.workDate}
                employees={employees.items}
                returnPath={returnPath}
              />
              <Link className="secondary-link" href="/leave-requests?status=pending">
                View pending leave requests
              </Link>
              <Link className="secondary-link" href={`/shift-assignments?workDate=${dashboard.workDate}`}>
                View today shift assignments
              </Link>
              <div className="dashboard-finalize-note">
                <strong>{dashboard.actions.canFinalizeDay ? 'Ready to finalize' : 'No finalization needed'}</strong>
                <span>
                  {dashboard.actions.finalizablePendingCount} pending,{' '}
                  {dashboard.actions.finalizableCheckedInCount} checked in
                </span>
              </div>
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <h2>Department breakdown</h2>
                <p>Counts are scoped to the selected date and filter.</p>
              </div>
            </div>

            {dashboard.departments.length === 0 ? (
              <EmptyState message="No scheduled departments for this date." />
            ) : (
              <div className="table-wrap dashboard-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Scheduled</th>
                      <th>Present</th>
                      <th>Late</th>
                      <th>Exceptions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.departments.map((department) => (
                      <tr key={department.id ?? 'unassigned'}>
                        <td>{department.name}</td>
                        <td>{department.scheduled}</td>
                        <td>{department.checkedIn + department.completed}</td>
                        <td>{department.late}</td>
                        <td>{department.absent + department.missingCheckOut + department.pending}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </aside>
      </section>
    </main>
  );
}

function todayInAppTimezone(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date());
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en', { timeStyle: 'short' }).format(
    new Date(value),
  );
}

function formatStatus(status: DashboardAttendanceStatus): string {
  return status.replace(/_/g, ' ');
}

function isPresentStatus(status: DashboardAttendanceStatus): boolean {
  return status === 'checked_in' || status === 'completed';
}

function actionLink(row: AttendanceDashboardAttention, workDate: string) {
  const statusQuery = row.status === 'no_record' ? '' : `&status=${row.status}`;
  const attendanceHref = `/attendance?date=${workDate}&employeeId=${row.employeeId}${statusQuery}`;
  const assignmentHref = `/shift-assignments?workDate=${workDate}&employeeId=${row.employeeId}`;

  if (row.recommendedAction === 'manual_check_in') {
    return (
      <Link className="table-link" href={row.status === 'no_record' ? assignmentHref : attendanceHref}>
        Manual check-in
      </Link>
    );
  }
  if (row.recommendedAction === 'manual_check_out') {
    return <Link className="table-link" href={attendanceHref}>Manual check-out</Link>;
  }
  if (row.recommendedAction === 'review_absence') {
    return <Link className="table-link" href={`/employees/${row.employeeId}`}>Review</Link>;
  }
  return <Link className="table-link" href={attendanceHref}>Open</Link>;
}
