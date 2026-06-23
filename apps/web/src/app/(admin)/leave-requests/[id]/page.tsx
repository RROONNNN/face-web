import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { getLeaveRequest } from '@/lib/admin/data';
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
            <LeaveActionButtons id={leaveRequest.id} status={leaveRequest.status} />
          </div>
        }
        description="Review details of the leave request."
        eyebrow="Leave Requests"
        title={`Request from ${leaveRequest.employee?.name ?? 'Unknown'}`}
      />
      <Notice searchParams={urlParams} />

      <div className="form-panel" style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Request Details</h3>
        <dl style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', margin: 0 }}>
          <dt style={{ fontWeight: 'bold' }}>Status</dt>
          <dd style={{ margin: 0 }}>{leaveRequest.status}</dd>

          <dt style={{ fontWeight: 'bold' }}>Dates</dt>
          <dd style={{ margin: 0 }}>{leaveRequest.startDate} to {leaveRequest.endDate}</dd>

          <dt style={{ fontWeight: 'bold' }}>Reason</dt>
          <dd style={{ margin: 0 }}>{leaveRequest.reason}</dd>

          <dt style={{ fontWeight: 'bold' }}>Requested At</dt>
          <dd style={{ margin: 0 }}>{new Date(leaveRequest.createdAt).toLocaleString()}</dd>

          {leaveRequest.reviewedBy && (
            <>
              <dt style={{ fontWeight: 'bold' }}>Reviewed By</dt>
              <dd style={{ margin: 0 }}>{leaveRequest.reviewedBy.name}</dd>
            </>
          )}

          {leaveRequest.rejectionReason && (
            <>
              <dt style={{ fontWeight: 'bold', color: 'red' }}>Rejection Reason</dt>
              <dd style={{ margin: 0 }}>{leaveRequest.rejectionReason}</dd>
            </>
          )}
        </dl>
      </div>
    </main>
  );
}
