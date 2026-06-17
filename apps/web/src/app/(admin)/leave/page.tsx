import { Check, X } from 'lucide-react';
import type { Employee, LeaveRequest, PaginatedResponse } from '@face-web/shared';
import { LeaveStatus } from '@face-web/shared';
import { EmptyState } from '@/components/admin/empty-state';
import { MessageBanner } from '@/components/admin/message-banner';
import { Pagination } from '@/components/admin/pagination';
import { SubmitButton } from '@/components/forms/submit-button';
import { approveLeaveAction, rejectLeaveAction } from '@/lib/actions';
import { backendFetch } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import {
  asInt,
  asString,
  buildReturnTo,
  type PageSearchParams,
} from '@/lib/search';

export default async function LeavePage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const status = asString(params.status);
  const empId = asString(params.empId);
  const page = asInt(params.page);
  const limit = 10;
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) query.set('status', status);
  if (empId) query.set('empId', empId);

  const [leave, employees] = await Promise.all([
    backendFetch<PaginatedResponse<LeaveRequest>>(`/leave?${query.toString()}`),
    backendFetch<PaginatedResponse<Employee>>('/employees?limit=100'),
  ]);
  const returnPath = buildReturnTo('/leave', {
    status,
    empId,
    page: String(page),
  });

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Requests</p>
          <h1>Leave</h1>
          <p className="muted">Review pending and historical leave requests.</p>
        </div>
      </section>

      <MessageBanner
        error={asString(params.error)}
        message={asString(params.message)}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Leave requests</h2>
            <p className="muted">{leave.total} requests</p>
          </div>
        </div>

        <form className="filter-bar">
          <label>
            <span>Status</span>
            <select name="status" defaultValue={status ?? ''}>
              <option value="">All</option>
              {Object.values(LeaveStatus).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
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

        {leave.items.length === 0 ? (
          <EmptyState
            title="No leave requests"
            detail="Leave requests created from the mobile app will appear here."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Range</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Review</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leave.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.employee?.name ?? item.employeeId}</strong>
                      <span className="subtext">
                        {item.employee?.employeeCode ?? '-'}
                      </span>
                    </td>
                    <td>
                      {formatDate(item.startDate)} - {formatDate(item.endDate)}
                    </td>
                    <td>{item.reason}</td>
                    <td>
                      <span className={`pill status-${item.status}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.reviewedAt ? formatDateTime(item.reviewedAt) : '-'}
                      <span className="subtext">
                        {item.rejectionReason ?? item.reviewedBy?.name ?? ''}
                      </span>
                    </td>
                    <td>
                      {item.status === LeaveStatus.Pending ? (
                        <div className="action-row">
                          <form action={approveLeaveAction.bind(null, item.id)}>
                            <input
                              type="hidden"
                              name="returnTo"
                              value={returnPath}
                            />
                            <button className="icon-button" title="Approve">
                              <Check aria-hidden="true" size={16} />
                            </button>
                          </form>
                          <details className="row-details">
                            <summary className="icon-button danger" title="Reject">
                              <X aria-hidden="true" size={16} />
                            </summary>
                            <form
                              className="stacked-form"
                              action={rejectLeaveAction.bind(null, item.id)}
                            >
                              <input
                                type="hidden"
                                name="returnTo"
                                value={returnPath}
                              />
                              <label className="field">
                                <span>Reject reason</span>
                                <textarea name="reason" required />
                              </label>
                              <SubmitButton className="primary-button">
                                Reject request
                              </SubmitButton>
                            </form>
                          </details>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          basePath="/leave"
          page={leave.page}
          limit={leave.limit}
          total={leave.total}
          searchParams={{ status, empId }}
        />
      </section>
    </main>
  );
}
