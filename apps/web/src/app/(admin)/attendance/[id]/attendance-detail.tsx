import type { AttendanceRecord, AttendanceStatus, AuditEntry } from '@/lib/api/types';
import Link from 'next/link';

export function AttendanceDetail({
  backHref,
  record,
}: {
  backHref: string;
  record: AttendanceRecord;
}) {
  const shiftName = record.shiftAssignment?.shift?.name ?? 'Unassigned shift';

  return (
    <section className="attendance-detail-panel" aria-labelledby="attendance-detail-heading">
      <div className="attendance-detail-header">
        <div>
          <span>Attendance record</span>
          <h2 id="attendance-detail-heading">
            {record.employee?.name ?? record.employeeId}
          </h2>
          <p>{record.workDate} · {record.id}</p>
        </div>
        <Link className="secondary-link compact-link" href={backHref}>
          Back to attendance
        </Link>
      </div>

      <div className="attendance-detail-grid">
        <DetailItem label="Employee code" value={record.employee?.employeeCode ?? '-'} />
        <DetailItem label="Department" value={record.employee?.department ?? '-'} />
        <DetailItem label="Shift" value={shiftName} />
        <DetailItem label="Status" value={formatStatus(record.status)} />
        <DetailItem label="Expected check-in" value={formatDateTime(record.expectedCheckInAt)} />
        <DetailItem label="Expected check-out" value={formatDateTime(record.expectedCheckOutAt)} />
        <DetailItem label="Actual check-in" value={formatDateTime(record.checkedInAt)} />
        <DetailItem label="Actual check-out" value={formatDateTime(record.checkedOutAt)} />
        <DetailItem label="Check-in source" value={formatSource(record.checkInSource)} />
        <DetailItem label="Check-out source" value={formatSource(record.checkOutSource)} />
        <DetailItem label="Late minutes" value={record.lateMinutes > 0 ? String(record.lateMinutes) : '-'} />
        <DetailItem label="Assignment source" value={formatSource(record.shiftAssignment?.source)} />
      </div>

      <div className="attendance-detail-audit-grid">
        <AuditTimeline entries={record.auditCheckIn ?? []} title="Check-in history" />
        <AuditTimeline entries={record.auditCheckOut ?? []} title="Check-out history" />
      </div>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="attendance-detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AuditTimeline({ entries, title }: { entries: AuditEntry[]; title: string }) {
  return (
    <section className="attendance-audit-section">
      <h3>{title}</h3>
      {entries.length > 0 ? (
        <ol className="attendance-audit-list">
          {entries.map((entry, index) => (
            <li key={`${entry.occurredAt}-${index}`}>
              <div className="attendance-audit-time">
                <strong>{formatDateTime(entry.occurredAt)}</strong>
              </div>
              <AuditMeta entry={entry} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="attendance-audit-empty">No audit events recorded.</p>
      )}
    </section>
  );
}

function AuditMeta({ entry }: { entry: AuditEntry }) {
  const location = formatLocation(entry);

  return (
    <div className="attendance-audit-meta">
      <span>{formatSource(entry.source)}</span>
      {entry.deviceId ? <span>Device {entry.deviceId}</span> : null}
      {location ? <span>{location}</span> : null}
      {entry.isOutOfZone === true ? <span>Out of zone</span> : null}
      {entry.isOutOfZone === false ? <span>Inside zone</span> : null}
    </div>
  );
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatStatus(status: AttendanceStatus): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatSource(source?: string | null): string {
  if (!source) return '-';

  return source
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatLocation(entry: AuditEntry): string | null {
  if (entry.latitude == null || entry.longitude == null) {
    return null;
  }

  return `${entry.latitude.toFixed(5)}, ${entry.longitude.toFixed(5)}`;
}
