import { Pencil, Plus, Trash2 } from 'lucide-react';
import type {
  AttendanceEventSummary,
  AttendanceRow,
  Employee,
  PaginatedResponse,
} from '@face-web/shared';
import { AttendanceStatus } from '@face-web/shared';
import { EmptyState } from '@/components/admin/empty-state';
import { MessageBanner } from '@/components/admin/message-banner';
import { Pagination } from '@/components/admin/pagination';
import { SubmitButton } from '@/components/forms/submit-button';
import {
  createManualCheckInAction,
  createManualCheckOutAction,
  deleteAttendanceEventAction,
  updateAttendanceEventAction,
} from '@/lib/actions';
import { backendFetch } from '@/lib/api';
import { formatDateTime, formatHours, today } from '@/lib/format';
import {
  asInt,
  asString,
  buildReturnTo,
  type PageSearchParams,
} from '@/lib/search';

function datetimeLocal(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}

function EventEditor({
  type,
  event,
  returnPath,
  workDate,
}: {
  type: 'checkIn' | 'checkOut';
  event: AttendanceEventSummary;
  returnPath: string;
  workDate: string;
}) {
  return (
    <details className="row-details">
      <summary className="icon-button" title={`Edit ${type}`}>
        <Pencil aria-hidden="true" size={16} />
      </summary>
      <form
        className="stacked-form"
        action={updateAttendanceEventAction.bind(null, type, event.id)}
      >
        <input type="hidden" name="returnTo" value={returnPath} />
        <div className="form-grid compact">
          <label className="field">
            <span>Time</span>
            <input
              name="time"
              type="datetime-local"
              required
              defaultValue={datetimeLocal(event.time)}
            />
          </label>
          <label className="field">
            <span>Work date</span>
            <input name="workDate" type="date" required defaultValue={workDate} />
          </label>
          <label className="field">
            <span>Latitude</span>
            <input name="lat" type="number" step="any" defaultValue={event.latitude ?? ''} />
          </label>
          <label className="field">
            <span>Longitude</span>
            <input name="lon" type="number" step="any" defaultValue={event.longitude ?? ''} />
          </label>
          <label className="checkbox-field">
            <input
              name="isOutOfZone"
              type="checkbox"
              defaultChecked={event.isOutOfZone}
            />
            Out of zone
          </label>
        </div>
        <SubmitButton className="primary-button">Save event</SubmitButton>
      </form>
    </details>
  );
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const date = asString(params.date) ?? today();
  const empId = asString(params.empId);
  const status = asString(params.status);
  const late = asString(params.late);
  const early = asString(params.early);
  const page = asInt(params.page);
  const limit = 10;
  const query = new URLSearchParams({ date, page: String(page), limit: String(limit) });
  if (empId) query.set('empId', empId);
  if (status) query.set('status', status);
  if (late) query.set('late', late);
  if (early) query.set('early', early);

  const [attendance, employees] = await Promise.all([
    backendFetch<PaginatedResponse<AttendanceRow>>(
      `/attendance?${query.toString()}`,
    ),
    backendFetch<PaginatedResponse<Employee>>('/employees?limit=100'),
  ]);
  const returnPath = buildReturnTo('/attendance', {
    date,
    empId,
    status,
    late,
    early,
    page: String(page),
  });

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Daily records</p>
          <h1>Attendance</h1>
          <p className="muted">Review aggregated days and manage manual events.</p>
        </div>
      </section>

      <MessageBanner
        error={asString(params.error)}
        message={asString(params.message)}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Attendance table</h2>
            <p className="muted">{attendance.total} rows for {date}</p>
          </div>
          <details className="inline-details">
            <summary className="primary-button">
              <Plus aria-hidden="true" size={17} />
              Manual event
            </summary>
            <div className="split-forms">
              <form className="stacked-form" action={createManualCheckInAction}>
                <input type="hidden" name="returnTo" value={returnPath} />
                <h3>Manual check-in</h3>
                <ManualEventFields employees={employees.items} date={date} />
                <SubmitButton className="primary-button">Create check-in</SubmitButton>
              </form>
              <form className="stacked-form" action={createManualCheckOutAction}>
                <input type="hidden" name="returnTo" value={returnPath} />
                <h3>Manual check-out</h3>
                <ManualEventFields employees={employees.items} date={date} />
                <SubmitButton className="primary-button">Create check-out</SubmitButton>
              </form>
            </div>
          </details>
        </div>

        <form className="filter-bar">
          <label>
            <span>Date</span>
            <input name="date" type="date" defaultValue={date} required />
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
          <label>
            <span>Status</span>
            <select name="status" defaultValue={status ?? ''}>
              <option value="">All</option>
              {Object.values(AttendanceStatus).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Late</span>
            <select name="late" defaultValue={late ?? ''}>
              <option value="">All</option>
              <option value="true">Late</option>
              <option value="false">Not late</option>
            </select>
          </label>
          <label>
            <span>Early</span>
            <select name="early" defaultValue={early ?? ''}>
              <option value="">All</option>
              <option value="true">Early</option>
              <option value="false">Not early</option>
            </select>
          </label>
          <button className="secondary-button" type="submit">
            Filter
          </button>
        </form>

        {attendance.items.length === 0 ? (
          <EmptyState
            title="No attendance rows"
            detail="Try another date or create a manual attendance event."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Status</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Hours</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {attendance.items.map((row) => (
                  <tr key={`${row.employee.id}-${row.workDate}`}>
                    <td>
                      <strong>{row.employee.name}</strong>
                      <span className="subtext">{row.employee.employeeCode}</span>
                    </td>
                    <td>
                      <span className={`pill status-${row.status}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      {row.checkIn ? (
                        <EventCell
                          type="checkIn"
                          event={row.checkIn}
                          returnPath={returnPath}
                          workDate={row.workDate}
                        />
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      {row.checkOut ? (
                        <EventCell
                          type="checkOut"
                          event={row.checkOut}
                          returnPath={returnPath}
                          workDate={row.workDate}
                        />
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{formatHours(row.totalWorkHours)}</td>
                    <td>
                      <div className="pill-row">
                        {row.late ? <span className="pill warning">Late</span> : null}
                        {row.early ? <span className="pill warning">Early</span> : null}
                        {row.outOfZone ? (
                          <span className="pill danger">Out of zone</span>
                        ) : null}
                        {!row.late && !row.early && !row.outOfZone ? '-' : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          basePath="/attendance"
          page={attendance.page}
          limit={attendance.limit}
          total={attendance.total}
          searchParams={{ date, empId, status, late, early }}
        />
      </section>
    </main>
  );
}

function ManualEventFields({
  employees,
  date,
}: {
  employees: Employee[];
  date: string;
}) {
  return (
    <div className="form-grid compact">
      <label className="field">
        <span>Employee</span>
        <select name="empId" required>
          <option value="">Select employee</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.employeeCode} - {employee.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Time</span>
        <input name="time" type="datetime-local" required />
      </label>
      <label className="field">
        <span>Work date</span>
        <input name="workDate" type="date" required defaultValue={date} />
      </label>
      <label className="field">
        <span>Latitude</span>
        <input name="lat" type="number" step="any" />
      </label>
      <label className="field">
        <span>Longitude</span>
        <input name="lon" type="number" step="any" />
      </label>
    </div>
  );
}

function EventCell({
  type,
  event,
  returnPath,
  workDate,
}: {
  type: 'checkIn' | 'checkOut';
  event: AttendanceEventSummary;
  returnPath: string;
  workDate: string;
}) {
  return (
    <div className="event-cell">
      <span>{formatDateTime(event.time)}</span>
      <div className="action-row">
        <EventEditor
          type={type}
          event={event}
          returnPath={returnPath}
          workDate={workDate}
        />
        <form action={deleteAttendanceEventAction.bind(null, type, event.id)}>
          <input type="hidden" name="returnTo" value={returnPath} />
          <button className="icon-button danger" title={`Delete ${type}`}>
            <Trash2 aria-hidden="true" size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
