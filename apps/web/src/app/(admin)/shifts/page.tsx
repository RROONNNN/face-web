import Link from 'next/link';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/admin/empty-state';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { firstParam, numberParam } from '@/lib/api/query';
import { getShifts } from '@/lib/admin/data';

type ShiftsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Shifts | Face Web Admin',
};

export default async function ShiftsPage({ searchParams }: ShiftsPageProps) {
  const params = await searchParams;
  const query = {
    page: numberParam(params.page, 1),
    limit: numberParam(params.limit, 20),
    search: firstParam(params.search),
    isActive: parseBoolean(firstParam(params.isActive)),
    sortBy: 'createdAt' as const,
    sortOrder: 'DESC' as const,
  };
  const shifts = await getShifts(query);

  return (
    <main className="admin-content">
      <PageHeader
        actions={
          <Link className="primary-link" href="/shifts/new">
            New shift
          </Link>
        }
        description="Manage work periods, grace minutes, and active shift templates."
        eyebrow="Scheduling"
        title="Shifts"
      />
      <Notice searchParams={params} />

      <form className="filter-bar">
        <input
          defaultValue={query.search}
          name="search"
          placeholder="Search shift name"
          type="search"
        />
        <select defaultValue={firstParam(params.isActive) ?? ''} name="isActive">
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button className="secondary-button" type="submit">
          Apply
        </button>
      </form>

      {shifts.items.length === 0 ? (
        <EmptyState message="No shifts match the current filters." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Shift</th>
                <th>Work periods</th>
                <th>Grace</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shifts.items.map((shift) => (
                <tr key={shift.id}>
                  <td>
                    <Link className="table-link" href={`/shifts/${shift.id}`}>
                      {shift.name}
                    </Link>
                    <span>{shift.id}</span>
                  </td>
                  <td>
                    {shift.workPeriods?.length
                      ? shift.workPeriods
                          .map((period) => `${period.name} ${period.startTime}-${period.endTime}`)
                          .join(', ')
                      : 'No periods'}
                  </td>
                  <td>{shift.lateGraceMinutes} min</td>
                  <td>
                    <StatusBadge active={shift.isActive} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/shifts" meta={shifts.meta} query={query} />
    </main>
  );
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}
