

import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { firstParam } from '@/lib/api/query';
import { getEmployeeAttendance, getUser } from '@/lib/admin/data';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmployeeAttendanceCalendar } from './employee-attendance-calendar';

type EmployeeDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Employee Detail | Face Web Admin',
};

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: EmployeeDetailPageProps) {
  const [{ id }, noticeParams] = await Promise.all([params, searchParams]);
  const selectedMonth = parseMonth(firstParam(noticeParams.month));
  const monthRange = getMonthRange(selectedMonth.year, selectedMonth.month);

  const [user, attendance] = await Promise.all([
    getUser(id).catch(() => null),
    getEmployeeAttendance({
      employeeId: id,
      startDate: monthRange.startDate,
      endDate: monthRange.endDate,
    }),
  ]);

  if (!user) {
    notFound();
  }

  const previousMonth = shiftMonth(selectedMonth.year, selectedMonth.month, -1);
  const nextMonth = shiftMonth(selectedMonth.year, selectedMonth.month, 1);

  return (
    <main className="admin-content">
      <PageHeader
        actions={
          <div className="employee-detail-actions">
            <Link className="secondary-link" href="/employees">
              Back to employees
            </Link>
            <Link className="primary-link" href={`/employees/${user.id}/update`}>
              Edit employee
            </Link>
          </div>
        }
        description="Review employee identity and month-by-month attendance activity."
        eyebrow="People"
        title={user.name}
      />
      <Notice searchParams={noticeParams} />

      <div className="employee-detail-layout">
        <aside className="employee-profile-panel" aria-label="Employee profile">
          <div className="employee-avatar" aria-hidden="true">
            {getInitials(user.name)}
          </div>
          <div>
            <h2>{user.name}</h2>
            <p>{[user.jobTitle, user.department].filter(Boolean).join(' / ') || 'Unassigned'}</p>
          </div>
          <div className="employee-profile-meta">
            <span>{user.employeeCode}</span>
            <span>{user.phone ?? 'No phone'}</span>
            <StatusBadge active={user.isActive} />
          </div>
          <dl className="employee-profile-list">
            <div>
              <dt>Email</dt>
              <dd>{user.email ?? '-'}</dd>
            </div>
            <div>
              <dt>Date of birth</dt>
              <dd>{user.dateOfBirth ?? '-'}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{user.accountRole}</dd>
            </div>
          </dl>
          <div className="employee-attendance-summary">
            <SummaryItem label="Present" value={attendance.metaData.presentCount} />
            <SummaryItem label="Leave" value={attendance.metaData.leaveCount} />
            <SummaryItem label="Absent" value={attendance.metaData.absentCount} />
            <SummaryItem label="Missing Check Out" value={attendance.metaData.missingCheckOutCount} />
          </div>
        </aside>

        <section className="employee-calendar-panel" aria-label="Monthly attendance calendar">
          <div className="employee-calendar-toolbar">
            <div>
              <span className="employee-calendar-eyebrow">Monthly attendance</span>
              <h2>{formatMonthTitle(selectedMonth.year, selectedMonth.month)}</h2>
            </div>
            <div className="employee-calendar-controls">
              <Link
                aria-label="Previous month"
                className="secondary-link compact-link"
                href={`/employees/${user.id}?month=${formatMonthParam(previousMonth.year, previousMonth.month)}`}
              >
                Previous
              </Link>
              <form className="month-picker-form">
                <input
                  aria-label="Select month"
                  defaultValue={formatMonthParam(selectedMonth.year, selectedMonth.month)}
                  name="month"
                  type="month"
                />
                <button className="secondary-button" type="submit">
                  Apply
                </button>
              </form>
              <Link
                aria-label="Next month"
                className="secondary-link compact-link"
                href={`/employees/${user.id}?month=${formatMonthParam(nextMonth.year, nextMonth.month)}`}
              >
                Next
              </Link>
            </div>
          </div>
          <EmployeeAttendanceCalendar
            employeeId={user.id}
            month={selectedMonth.month}
            records={attendance.items}
            returnPath={`/employees/${user.id}?month=${formatMonthParam(selectedMonth.year, selectedMonth.month)}`}
            year={selectedMonth.year}
          />
        </section>
      </div>
    </main>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function parseMonth(value: string | undefined): { year: number; month: number } {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function getMonthRange(year: number, month: number): { startDate: string; endDate: string } {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    startDate: `${formatMonthParam(year, month)}-01`,
    endDate: `${formatMonthParam(year, month)}-${String(lastDay).padStart(2, '0')}`,
  };
}

function shiftMonth(year: number, month: number, offset: number): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function formatMonthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatMonthTitle(year: number, month: number): string {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
