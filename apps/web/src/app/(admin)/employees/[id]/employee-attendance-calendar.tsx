'use client';

import { adminCheckInAction, adminCheckOutAction } from '@/lib/admin/actions';
import type {
  AttendanceRecord,
  AttendanceSource,
  AuditEntry,
} from '@/lib/api/types';
import {
  Clock,
  Fingerprint,
  LogIn,
  LogOut,
  MapPin,
  Smartphone,
  UserCog,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

type EmployeeAttendanceCalendarProps = {
  employeeId: string;
  records: AttendanceRecord[];
  returnPath: string;
  year: number;
  month: number;
};

type CalendarDay = {
  date: string;
  dayOfMonth: number;
  record?: AttendanceRecord;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function EmployeeAttendanceCalendar({
  employeeId,
  records,
  returnPath,
  year,
  month,
}: EmployeeAttendanceCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const days = useMemo(() => buildCalendarDays(year, month, records), [year, month, records]);

  useEffect(() => {
    if (!selectedDay) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedDay(null);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedDay]);

  return (
    <>
      <div className="attendance-calendar-grid">
        {WEEKDAYS.map((weekday) => (
          <div className="attendance-calendar-weekday" key={weekday}>
            {weekday}
          </div>
        ))}
        {days.map((day, index) =>
          day ? (
            <button
              className={`attendance-calendar-day ${getStatusClass(day.record)}`}
              key={day.date}
              onClick={() => setSelectedDay(day)}
              type="button"
            >
              <span className="attendance-calendar-date">{day.dayOfMonth}</span>
              {day.record ? (
                <DayRecordSummary record={day.record} />
              ) : (
                <span className="attendance-day-content">
                  <span className="attendance-status-label">-------</span>
                </span>
              )}
            </button>
          ) : (
            <div
              aria-hidden="true"
              className="attendance-calendar-day attendance-calendar-day-empty"
              key={`blank-${index}`}
            />
          ),
        )}
      </div>

      {selectedDay ? (
        <div
          aria-labelledby="attendance-detail-title"
          aria-modal="true"
          className="attendance-modal-backdrop"
          role="dialog"
        >
          <div className="attendance-modal">
            <div className="attendance-modal-header">
              <div>
                <span className="employee-calendar-eyebrow">Attendance detail</span>
                <h2 id="attendance-detail-title">
                  {formatFullDate(selectedDay.date)}
                </h2>
              </div>
              <button
                aria-label="Close attendance detail"
                className="icon-button"
                onClick={() => setSelectedDay(null)}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="attendance-modal-status">
              <span className={`attendance-status-pill ${getStatusClass(selectedDay.record)}`}>
                {selectedDay.record ? getStatusLabel(selectedDay.record) : 'No record'}
              </span>
              <span>{selectedDay.record ? formatTimeRange(selectedDay.record) : 'No check-in - No check-out'}</span>
            </div>
            {selectedDay.record ? (
              <>
                <AuditSection
                  entries={selectedDay.record.auditCheckIn}
                  fallbackSource={selectedDay.record.checkInSource}
                  title="Check in"
                  type="in"
                />
                <AuditSection
                  entries={selectedDay.record.auditCheckOut}
                  fallbackSource={selectedDay.record.checkOutSource}
                  title="Check out"
                  type="out"
                />
              </>
            ) : (
              <p className="attendance-audit-empty">
                No attendance record exists for this day yet.
              </p>
            )}
            <ManualAttendanceActions
              employeeId={employeeId}
              record={selectedDay.record}
              returnPath={returnPath}
              workDate={selectedDay.date}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function ManualAttendanceActions({
  employeeId,
  record,
  returnPath,
  workDate,
}: {
  employeeId: string;
  record?: AttendanceRecord;
  returnPath: string;
  workDate: string;
}) {
  return (
    <section className="attendance-manual-section">
      <h3>Manual attendance</h3>
      <div className="attendance-manual-grid">
        <form action={adminCheckInAction} className="attendance-manual-form">
          <input name="employeeId" type="hidden" value={employeeId} />
          <input name="workDate" type="hidden" value={workDate} />
          <input name="returnPath" type="hidden" value={returnPath} />
          <label className="field">
            <span>Check-in time</span>
            <input
              defaultValue={timeInputValue(record?.checkedInAt ?? record?.expectedCheckInAt, '09:00')}
              name="occurredAt"
              required
              type="time"
            />
          </label>
          <label className="field">
            <span>Note</span>
            <input name="note" placeholder="Optional note" />
          </label>
          <ManualSubmitButton label="Manual check-in" pendingLabel="Checking in..." />
        </form>

        <form action={adminCheckOutAction} className="attendance-manual-form">
          <input name="employeeId" type="hidden" value={employeeId} />
          <input name="workDate" type="hidden" value={workDate} />
          <input name="returnPath" type="hidden" value={returnPath} />
          <label className="field">
            <span>Check-out time</span>
            <input
              defaultValue={timeInputValue(record?.checkedOutAt ?? record?.expectedCheckOutAt, '18:00')}
              name="occurredAt"
              required
              type="time"
            />
          </label>
          <label className="field">
            <span>Note</span>
            <input name="note" placeholder="Optional note" />
          </label>
          <ManualSubmitButton label="Manual check-out" pendingLabel="Checking out..." />
        </form>
      </div>
    </section>
  );
}

function ManualSubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className="primary-button" disabled={pending} type="submit">
      {pending ? pendingLabel : label}
    </button>
  );
}

function DayRecordSummary({ record }: { record: AttendanceRecord }) {
  const hasCheckInLocation = record.auditCheckIn.some(hasLocation);

  return (
    <span className="attendance-day-content">
      <span className="attendance-status-label">{getStatusLabel(record)}</span>
      <span className="attendance-day-times">
        <Clock aria-hidden="true" size={13} />
        {record.checkedInAt ? formatTime(record.checkedInAt) : '--:--'}
        <span aria-hidden="true">/</span>
        {record.checkedOutAt ? formatTime(record.checkedOutAt) : '--:--'}
      </span>
      <span className="attendance-day-icons">
        {record.checkInSource ? <SourceIcon source={record.checkInSource} /> : null}
        {record.checkOutSource ? <SourceIcon source={record.checkOutSource} /> : null}
        {hasCheckInLocation ? (
          <MapPin aria-label="Check-in location captured" size={14} />
        ) : null}
      </span>
    </span>
  );
}

function AuditSection({
  entries,
  fallbackSource,
  title,
  type,
}: {
  entries: AuditEntry[];
  fallbackSource?: AttendanceSource | null;
  title: string;
  type: 'in' | 'out';
}) {
  return (
    <section className="attendance-audit-section">
      <h3>
        {type === 'in' ? <LogIn aria-hidden="true" size={16} /> : <LogOut aria-hidden="true" size={16} />}
        {title}
      </h3>
      {entries.length > 0 ? (
        <ol className="attendance-audit-list">
          {entries.map((entry, index) => (
            <li key={`${entry.occurredAt}-${entry.source}-${index}`}>
              <div className="attendance-audit-time">
                <SourceIcon source={entry.source} />
                <span>{formatTime(entry.occurredAt)}</span>
              </div>
              <div className="attendance-audit-meta">
                <span>{formatSource(entry.source)}</span>
                {entry.deviceId ? <span>Device {entry.deviceId}</span> : null}
                {hasLocation(entry) ? (
                  <span>
                    <MapPin aria-hidden="true" size={13} />
                    {formatLocation(entry)}
                  </span>
                ) : null}
                {entry.isOutOfZone === true ? <span>Out of zone</span> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="attendance-audit-empty">
          No audit entries{fallbackSource ? ` from ${formatSource(fallbackSource)}` : ''}.
        </p>
      )}
    </section>
  );
}

function SourceIcon({ source }: { source: AttendanceSource }) {
  const label = formatSource(source);
  if (source === 'mobile_face_recognition') {
    return <Smartphone aria-label={label} size={14} />;
  }
  if (source === 'admin_manual') {
    return <UserCog aria-label={label} size={14} />;
  }
  return <Fingerprint aria-label={label} size={14} />;
}

function buildCalendarDays(
  year: number,
  month: number,
  records: AttendanceRecord[],
): Array<CalendarDay | null> {
  const recordsByDate = new Map(records.map((record) => [record.workDate, record]));
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const leadingBlanks = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days: Array<CalendarDay | null> = Array.from({ length: leadingBlanks }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push({
      date,
      dayOfMonth: day,
      record: recordsByDate.get(date),
    });
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function getStatusClass(record?: AttendanceRecord | null): string {
  if (!record) return '';
  if (record.status !== 'on_leave' && (record.shiftAssignment?.leaveShiftWorkPeriodIds?.length ?? 0) > 0) {
    return 'attendance-status-partial-leave';
  }
  if (record.status === 'completed' || record.status === 'checked_in') {
    return 'attendance-status-present';
  }
  if (record.status === 'absent') return 'attendance-status-absent';
  if (record.status === 'missing_check_out') return 'attendance-status-missing';
  if (record.status === 'on_leave') return 'attendance-status-leave';
  return 'attendance-status-pending';
}

function getStatusLabel(record: AttendanceRecord): string {
  if (record.status !== 'on_leave' && (record.shiftAssignment?.leaveShiftWorkPeriodIds?.length ?? 0) > 0) {
    return 'Partial Leave';
  }

  const labels: Record<AttendanceRecord['status'], string> = {
    pending: 'Pending',
    checked_in: 'Checked In',
    completed: 'Present',
    missing_check_out: 'Missing Check Out',
    absent: 'Absent',
    on_leave: 'Leave Full Day',
    invalid: 'Invalid',
  };
  return labels[record.status];
}

function formatSource(source: AttendanceSource): string {
  const labels: Record<AttendanceSource, string> = {
    mobile_face_recognition: 'Mobile face recognition',
    admin_manual: 'Admin manual',
    fingerprint_device: 'Fingerprint device',
  };
  return labels[source];
}

function formatTimeRange(record: AttendanceRecord): string {
  const checkIn = record.checkedInAt ? formatTime(record.checkedInAt) : 'No check-in';
  const checkOut = record.checkedOutAt ? formatTime(record.checkedOutAt) : 'No check-out';
  return `${checkIn} - ${checkOut}`;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function timeInputValue(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'full',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function hasLocation(entry: AuditEntry): boolean {
  return entry.latitude != null && entry.longitude != null;
}

function formatLocation(entry: AuditEntry): string {
  if (!hasLocation(entry)) return '';
  return `${entry.latitude?.toFixed(5)}, ${entry.longitude?.toFixed(5)}`;
}
