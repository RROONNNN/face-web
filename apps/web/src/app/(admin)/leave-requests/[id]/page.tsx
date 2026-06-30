import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { getLeaveRequest } from '@/lib/admin/data';
import type { LeaveStatus } from '@/lib/api/types';
import { LeaveActionButtons } from './leave-actions';

export const metadata: Metadata = {
  title: 'Leave Request | Face Web Admin',
};

type LeaveRequestPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeaveRequestPage({
  params,
  searchParams,
}: LeaveRequestPageProps) {
  const { id } = await params;
  const urlParams = await searchParams;
  let leaveRequest;

  try {
    leaveRequest = await getLeaveRequest(id);
  } catch {
    notFound();
  }

  return (
    <main className="admin-content">
      <PageHeader
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link className="secondary-link" href="/leave-requests">
              Back to leave requests
            </Link>
            <LeaveActionButtons
              id={leaveRequest.id}
              returnPath={`/leave-requests/${leaveRequest.id}`}
              status={leaveRequest.status}
            />
          </div>
        }
        description="Review details of the leave request."
        eyebrow="Leave Requests"
        title={`Request from ${leaveRequest.employee?.name ?? 'Unknown'}`}
      />
      <Notice searchParams={urlParams} />

      <div className="form-panel" style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Request Details</h3>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: '1rem',
            margin: 0,
          }}
        >
          <dt style={{ fontWeight: 'bold' }}>Status</dt>
          <dd style={{ margin: 0 }}>
            <StatusBadge active={statusIsActive(leaveRequest.status)}>
              {formatStatus(leaveRequest.status)}
            </StatusBadge>
          </dd>

          <dt style={{ fontWeight: 'bold' }}>Employee</dt>
          <dd style={{ margin: 0 }}>
            {leaveRequest.employee?.name ?? leaveRequest.employeeId}
            {leaveRequest.employee?.employeeCode ? (
              <span
                style={{ display: 'block', color: 'var(--muted-foreground)' }}
              >
                {leaveRequest.employee.employeeCode}
              </span>
            ) : null}
          </dd>

          <dt style={{ fontWeight: 'bold' }}>Dates</dt>
          <dd style={{ margin: 0 }}>
            {leaveRequest.startDate} to {leaveRequest.endDate}
          </dd>

          <dt style={{ fontWeight: 'bold' }}>Reason</dt>
          <dd style={{ margin: 0 }}>{leaveRequest.reason}</dd>

          <dt style={{ fontWeight: 'bold' }}>Requested At</dt>
          <dd style={{ margin: 0 }}>
            {new Date(leaveRequest.createdAt).toLocaleString()}
          </dd>

          {leaveRequest.reviewedBy && (
            <>
              <dt style={{ fontWeight: 'bold' }}>Reviewed By</dt>
              <dd style={{ margin: 0 }}>{leaveRequest.reviewedBy.name}</dd>
            </>
          )}

          {leaveRequest.reviewedAt && (
            <>
              <dt style={{ fontWeight: 'bold' }}>Reviewed At</dt>
              <dd style={{ margin: 0 }}>
                {new Date(leaveRequest.reviewedAt).toLocaleString()}
              </dd>
            </>
          )}

          {leaveRequest.cancelledAt && (
            <>
              <dt style={{ fontWeight: 'bold' }}>Cancelled At</dt>
              <dd style={{ margin: 0 }}>
                {new Date(leaveRequest.cancelledAt).toLocaleString()}
              </dd>
            </>
          )}

          {leaveRequest.rejectionReason && (
            <>
              <dt style={{ fontWeight: 'bold', color: 'red' }}>
                Rejection Reason
              </dt>
              <dd style={{ margin: 0 }}>{leaveRequest.rejectionReason}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Work date</th>
              <th>Scope</th>
              <th>Requested periods</th>
            </tr>
          </thead>
          <tbody>
            {leaveRequest.days.map((day) => (
              <tr key={day.id}>
                <td>{day.workDate}</td>
                <td>{formatScope(day.scope)}</td>
                <td>
                  {day.requestedPeriods.length > 0
                    ? day.requestedPeriods.map((period) => (
                        <span key={period.workPeriodId}>
                          {period.name} ({period.startTime}-{period.endTime})
                        </span>
                      ))
                    : 'All periods'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function statusIsActive(status: LeaveStatus): boolean | undefined {
  if (status === 'approved') return true;
  if (status === 'pending') return undefined;
  return false;
}

function formatStatus(status: LeaveStatus): string {
  return status.replace(/_/g, ' ');
}

function formatScope(scope: string): string {
  return scope === 'work_periods' ? 'Work periods' : 'Full day';
}
