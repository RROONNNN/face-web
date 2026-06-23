import { EmptyState } from '@/components/admin/empty-state';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import {
  generateShiftAssignmentsAction,
  upsertShiftAssignmentAction,
} from '@/lib/admin/actions';
import { getShiftAssignments, getShifts, getUsers } from '@/lib/admin/data';
import { firstParam, numberParam } from '@/lib/api/query';
import type { ShiftAssignmentSource } from '@/lib/api/types';
import type { Metadata } from 'next';

type ShiftAssignmentsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Shift Assignments | Face Web Admin',
};

export default async function ShiftAssignmentsPage({
  searchParams,
}: ShiftAssignmentsPageProps) {
  const params = await searchParams;
  const query = {
    page: numberParam(params.page, 1),
    limit: numberParam(params.limit, 20),
    employeeId: firstParam(params.employeeId),
    employeeSearch: firstParam(params.employeeSearch),
    shiftId: firstParam(params.shiftId),
    workDate: firstParam(params.workDate),
    dateFrom: firstParam(params.dateFrom),
    dateTo: firstParam(params.dateTo),
    source: firstParam(params.source) as ShiftAssignmentSource | undefined,
    sortBy: 'workDate' as const,
    sortOrder: 'DESC' as const,
  };

  const [assignments, users, shifts] = await Promise.all([
    getShiftAssignments(query),
    getUsers({
      limit: 100,
      accountRole: 'employee',
      isActive: true,
      sortBy: 'name',
      sortOrder: 'ASC',
    }),
    getShifts({ limit: 100, isActive: true, sortBy: 'name', sortOrder: 'ASC' }),
  ]);

  return (
    <main className="admin-content">
      <PageHeader
        description="Review generated shift assignments and manually override an employee's shift for a work date."
        eyebrow="Scheduling"
        title="Shift assignments"
      />
      <Notice searchParams={params} />

      <details className="settings-panel">
        <summary>Actions</summary>
        <section className="action-grid">
          <form action={upsertShiftAssignmentAction} className="form-panel compact-form">
            <h2>Assign shift</h2>
            <div className="form-grid">
              <label className="field">
                <span>Employee</span>
                <select name="employeeId" required>
                  <option value="">Select employee</option>
                  {users.items.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.employeeCode})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Shift</span>
                <select name="shiftId" required>
                  <option value="">Select shift</option>
                  {shifts.items.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Work date</span>
                <input name="workDate" required type="date" />
              </label>
              <label className="field">
                <span>Note</span>
                <input name="note" />
              </label>
            </div>
            <button className="primary-button" type="submit">
              Save assignment
            </button>
          </form>

          <form action={generateShiftAssignmentsAction} className="form-panel compact-form">
            <h2>Generate assignments</h2>
            <div className="form-grid">
              <label className="field">
                <span>Start date</span>
                <input name="startDate" type="date" />
              </label>
              <label className="field">
                <span>End date</span>
                <input name="endDate" type="date" />
              </label>
              <label className="field">
                <span>Employee</span>
                <select name="employeeId">
                  <option value="">All employees</option>
                  {users.items.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.employeeCode})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="secondary-button" type="submit">
              Generate
            </button>
          </form>
        </section>
      </details>

      <form className="filter-bar">
        <input
          defaultValue={query.employeeSearch ?? ''}
          name="employeeSearch"
          placeholder="Employee name or code"
          type="search"
        />
        <select defaultValue={query.shiftId ?? ''} name="shiftId">
          <option value="">All shifts</option>
          {shifts.items.map((shift) => (
            <option key={shift.id} value={shift.id}>
              {shift.name}
            </option>
          ))}
        </select>
        <input defaultValue={query.workDate} name="workDate" type="date" />
        <select defaultValue={query.source ?? ''} name="source">
          <option value="">All sources</option>
          <option value="department_default">Department default</option>
          <option value="admin_manual">Admin manual</option>
        </select>
        <button className="secondary-button" type="submit">
          Apply
        </button>
      </form>

      {assignments.items.length === 0 ? (
        <EmptyState message="No shift assignments match the current filters." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Work date</th>
                <th>Employee</th>
                <th>Shift</th>
                <th>Source</th>
                <th>Assigned by</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {assignments.items.map((assignment) => (
                <tr key={assignment.id}>
                  <td>{assignment.workDate}</td>
                  <td>
                    {assignment.employee?.name ?? assignment.employeeId}
                    <span>{assignment.employee?.employeeCode ?? ''}</span>
                  </td>
                  <td>{assignment.shift?.name ?? assignment.shiftId}</td>
                  <td>{formatSource(assignment.source)}</td>
                  <td>{assignment.assignedByUser?.name ?? 'System'}</td>
                  <td>{assignment.note ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/shift-assignments" meta={assignments.meta} query={query} />
    </main>
  );
}

function formatSource(source: ShiftAssignmentSource): string {
  return source === 'admin_manual' ? 'Admin manual' : 'Department default';
}
