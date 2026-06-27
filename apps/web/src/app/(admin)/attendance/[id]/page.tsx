import { PageHeader } from '@/components/admin/page-header';
import { getAttendanceRecord } from '@/lib/admin/data';
import { toQueryString } from '@/lib/api/query';
import { ApiRequestError } from '@/lib/api/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AttendanceDetail } from './attendance-detail';

type AttendanceDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Attendance Detail | Face Web Admin',
};

export default async function AttendanceDetailPage({
  params,
  searchParams,
}: AttendanceDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const record = await getRecordOrNotFound(id);
  const backHref = `/attendance${toQueryString({
    page: firstValue(query.page),
    limit: firstValue(query.limit),
    employeeId: firstValue(query.employeeId),
    date: firstValue(query.date),
    status: firstValue(query.status),
  })}`;

  return (
    <main className="admin-content">
      <PageHeader
        description="Review the full attendance record, expected times, event sources, and audit history."
        eyebrow="Time & Attendance"
        title="Attendance Detail"
      />
      <AttendanceDetail backHref={backHref} record={record} />
    </main>
  );
}

async function getRecordOrNotFound(id: string) {
  try {
    return await getAttendanceRecord(id);
  } catch (error) {
    if (error instanceof ApiRequestError && error.statusCode === 404) {
      notFound();
    }

    throw error;
  }
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
