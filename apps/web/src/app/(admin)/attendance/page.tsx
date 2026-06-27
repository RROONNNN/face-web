import { EmptyState } from '@/components/admin/empty-state';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { getAttendance, getUsers } from '@/lib/admin/data';
import { firstParam, numberParam, toQueryString } from '@/lib/api/query';
import type { AttendanceStatus } from '@/lib/api/types';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AttendanceActionButtons } from './attendance-actions';

type AttendancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Attendance | Face Web Admin',
};

export default async function AttendancePage({
  searchParams,
}: AttendancePageProps) {
  const params = await searchParams;
  const selectedDate = firstParam(params.date) ?? getTodayWorkDate();
  const query = {
    page: numberParam(params.page, 1),
    limit: numberParam(params.limit, 20),
    employeeId: firstParam(params.employeeId),
    date: selectedDate,
    status: firstParam(params.status) as AttendanceStatus | undefined,
    shouldShowPending: false,
  };
  const listQuery = {
    page: query.page,
    limit: query.limit,
    employeeId: query.employeeId,
    date: query.date,
    status: query.status,
    shouldShowPending: query.shouldShowPending,
  };

  const [attendanceRecords, employees] = await Promise.all([
    getAttendance(query),
    getUsers({ limit: 100, isActive: true, sortBy: 'name', sortOrder: 'ASC' }),
  ]);

  return (
    <main className="admin-content">
      <PageHeader
        actions={
          <AttendanceActionButtons employees={employees.items} />
        }
        description="View and manage employee attendance records."
        eyebrow="Time & Attendance"
        title="Attendance"
      />
      <Notice searchParams={params} />

      <form className="filter-bar">
        <select defaultValue={query.employeeId ?? ''} name="employeeId">
          <option value="">All employees</option>
          {employees.items.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
        <input
          defaultValue={query.date ?? ''}
          name="date"
          type="date"
          placeholder="Filter by Date"
        />
        <select defaultValue={query.status ?? ''} name="status">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="checked_in">Checked In</option>
          <option value="completed">Completed</option>
          <option value="missing_check_out">Missing Check-out</option>
          <option value="absent">Absent</option>
          <option value="on_leave">On Leave</option>
          <option value="invalid">Invalid</option>
        </select>
        <button className="secondary-button" type="submit">
          Apply
        </button>
      </form>

      {attendanceRecords.items.length === 0 ? (
        <EmptyState message="No attendance records match the current filters." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Status</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Late (min)</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.items.map((record) => (
                <tr key={record.id}>
                  <td>{record.workDate}</td>
                  <td>{record.employee?.name ?? record.employeeId}</td>
                  <td>
                    <StatusBadge active={record.status === 'completed' || record.status === 'checked_in'} />
                    <span style={{ marginLeft: '8px' }}>{record.status}</span>
                  </td>
                  <td>{record.checkedInAt ? formatTime(record.checkedInAt) : '-'}</td>
                  <td>{record.checkedOutAt ? formatTime(record.checkedOutAt) : '-'}</td>
                  <td>{record.lateMinutes > 0 ? record.lateMinutes : '-'}</td>
                  <td>
                    <Link
                      className="table-link"
                      href={`/attendance/${record.id}${toQueryString(listQuery)}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/attendance" meta={attendanceRecords.meta} query={query} />
    </main>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en', { timeStyle: 'short' }).format(
    new Date(value),
  );
}

function getTodayWorkDate(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date());
}
