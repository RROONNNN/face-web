import Link from 'next/link';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/admin/empty-state';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { firstParam, numberParam } from '@/lib/api/query';
import type { AccountRole } from '@/lib/api/types';
import { getDepartments, getUsers } from '@/lib/admin/data';

type EmployeesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Employees | Face Web Admin',
};

export default async function EmployeesPage({
  searchParams,
}: EmployeesPageProps) {
  const params = await searchParams;
  const query = {
    page: numberParam(params.page, 1),
    limit: numberParam(params.limit, 20),
    search: firstParam(params.search),
    departmentId: firstParam(params.departmentId),
    accountRole: firstParam(params.accountRole) as AccountRole | undefined,
    isActive: parseBoolean(firstParam(params.isActive)),
    sortBy: 'createdAt' as const,
    sortOrder: 'DESC' as const,
  };

  const [users, departments] = await Promise.all([
    getUsers(query),
    getDepartments({ limit: 100, isActive: true, sortBy: 'name', sortOrder: 'ASC' }),
  ]);

  return (
    <main className="admin-content">
      <PageHeader
        actions={
          <Link className="primary-link" href="/employees/new">
            New employee
          </Link>
        }
        description="Manage employee accounts, roles, departments, and activation status."
        eyebrow="People"
        title="Employees"
      />
      <Notice searchParams={params} />

      <form className="filter-bar">
        <input
          defaultValue={query.search}
          name="search"
          placeholder="Search name or employee code"
          type="search"
        />
        <select defaultValue={query.departmentId ?? ''} name="departmentId">
          <option value="">All departments</option>
          {departments.items.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <select defaultValue={query.accountRole ?? ''} name="accountRole">
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="employee">Employee</option>
        </select>
        <select defaultValue={firstParam(params.isActive) ?? ''} name="isActive">
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button className="secondary-button" type="submit">
          Apply
        </button>
      </form>

      {users.items.length === 0 ? (
        <EmptyState message="No employees match the current filters." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Code</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {users.items.map((user) => (
                <tr key={user.id}>
                  <td>
                    <Link className="table-link" href={`/employees/${user.id}`}>
                      {user.name}
                    </Link>
                    <span>{user.jobTitle ?? 'No job title'}</span>
                  </td>
                  <td>{user.employeeCode}</td>
                  <td>{user.accountRole}</td>
                  <td>{user.department ?? 'Unassigned'}</td>
                  <td>
                    <StatusBadge active={user.isActive} />
                  </td>
                  <td>{formatDate(user.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/employees" meta={users.meta} query={query} />
    </main>
  );
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}
