import Link from 'next/link';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/admin/empty-state';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { firstParam, numberParam } from '@/lib/api/query';
import type { LeaveStatus } from '@/lib/api/types';
import { getLeaveRequests, getUsers } from '@/lib/admin/data';

type LeaveRequestsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Leave Requests | Face Web Admin',
};

export default async function LeaveRequestsPage({
  searchParams,
}: LeaveRequestsPageProps) {
  const params = await searchParams;
  const query = {
    page: numberParam(params.page, 1),
    limit: numberParam(params.limit, 20),
    employeeId: firstParam(params.employeeId),
    fromDate: firstParam(params.fromDate),
    toDate: firstParam(params.toDate),
    status: firstParam(params.status) as LeaveStatus | undefined,
  };

  const [leaveRequests, employees] = await Promise.all([
    getLeaveRequests(query),
    getUsers({ limit: 100, isActive: true, sortBy: 'name', sortOrder: 'ASC' }),
  ]);

  return (
    <main className="admin-content">
      <PageHeader
        description="Review and manage employee leave requests."
        eyebrow="Time & Attendance"
        title="Leave Requests"
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
          defaultValue={query.fromDate ?? ''}
          name="fromDate"
          type="date"
          placeholder="From Date"
        />
        <input
          defaultValue={query.toDate ?? ''}
          name="toDate"
          type="date"
          placeholder="To Date"
        />
        <select defaultValue={query.status ?? ''} name="status">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button className="secondary-button" type="submit">
          Apply
        </button>
      </form>

      {leaveRequests.items.length === 0 ? (
        <EmptyState message="No leave requests match the current filters." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Status</th>
                <th>Requested At</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.items.map((request) => (
                <tr key={request.id}>
                  <td>
                    <Link className="table-link" href={`/leave-requests/${request.id}`}>
                      {request.employee?.name ?? request.employeeId}
                    </Link>
                  </td>
                  <td>{request.startDate} to {request.endDate}</td>
                  <td>{request.days?.length ?? '-'}</td>
                  <td>
                    <StatusBadge active={request.status === 'approved'} />
                    <span style={{ marginLeft: '8px' }}>{request.status}</span>
                  </td>
                  <td>{formatDate(request.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/leave-requests" meta={leaveRequests.meta} query={query} />
    </main>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}
