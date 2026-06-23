import Link from 'next/link';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/admin/empty-state';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { firstParam, numberParam } from '@/lib/api/query';
import { getDepartments } from '@/lib/admin/data';

type DepartmentsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Departments | Face Web Admin',
};

export default async function DepartmentsPage({
  searchParams,
}: DepartmentsPageProps) {
  const params = await searchParams;
  const query = {
    page: numberParam(params.page, 1),
    limit: numberParam(params.limit, 20),
    search: firstParam(params.search),
    isActive: parseBoolean(firstParam(params.isActive)),
    sortBy: 'createdAt' as const,
    sortOrder: 'DESC' as const,
  };
  const departments = await getDepartments(query);

  return (
    <main className="admin-content">
      <PageHeader
        actions={
          <Link className="primary-link" href="/departments/new">
            New department
          </Link>
        }
        description="Manage departments and the default shift assigned to their employees."
        eyebrow="Organization"
        title="Departments"
      />
      <Notice searchParams={params} />

      <form className="filter-bar">
        <input
          defaultValue={query.search}
          name="search"
          placeholder="Search code or name"
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

      {departments.items.length === 0 ? (
        <EmptyState message="No departments match the current filters." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Code</th>
                <th>Default shift</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {departments.items.map((department) => (
                <tr key={department.id}>
                  <td>
                    <Link className="table-link" href={`/departments/${department.id}`}>
                      {department.name}
                    </Link>
                    <span>{department.description ?? 'No description'}</span>
                  </td>
                  <td>{department.code}</td>
                  <td>{department.defaultShift?.name ?? department.defaultShiftId}</td>
                  <td>
                    <StatusBadge active={department.isActive} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/departments" meta={departments.meta} query={query} />
    </main>
  );
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}
