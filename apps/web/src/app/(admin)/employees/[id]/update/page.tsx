import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import {
  deactivateUserAction,
  updateUserAction,
} from '@/lib/admin/actions';
import { getDepartments, getUser } from '@/lib/admin/data';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type EmployeeDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Employee Detail | Face Web Admin',
};

export default async function UpdateEmployeePage({
  params,
  searchParams,
}: EmployeeDetailPageProps) {
  const [{ id }, noticeParams] = await Promise.all([params, searchParams]);
  const [user, departments] = await Promise.all([
    getUser(id).catch(() => null),
    getDepartments({ limit: 100, isActive: true, sortBy: 'name', sortOrder: 'ASC' }),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <main className="admin-content">
      <PageHeader
        actions={
          <Link className="secondary-link" href="/employees">
            Back to employees
          </Link>
        }
        description="Update account details or deactivate the employee account."
        eyebrow="People"
        title={user.name}
      />
      <Notice searchParams={noticeParams} />
      <div className="detail-summary">
        <span>{user.employeeCode}</span>
        <span>{user.accountRole}</span>
        <StatusBadge active={user.isActive} />
      </div>

      <form action={updateUserAction} className="form-panel">
        <input name="id" type="hidden" value={user.id} />
        <div className="form-grid">
          <label className="field">
            <span>Employee code</span>
            <input defaultValue={user.employeeCode} name="employeeCode" required />
          </label>
          <label className="field">
            <span>Name</span>
            <input defaultValue={user.name} name="name" required />
          </label>
          <label className="field">
            <span>New password</span>
            <input minLength={6} name="password" type="password" />
          </label>
          <label className="field">
            <span>Role</span>
            <select defaultValue={user.accountRole} name="accountRole">
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="field">
            <span>Department</span>
            <select defaultValue={user.departmentId ?? ''} name="departmentId">
              <option value="">Unassigned</option>
              {departments.items.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Job title</span>
            <input defaultValue={user.jobTitle ?? ''} name="jobTitle" />
          </label>
          <label className="field">
            <span>Phone</span>
            <input defaultValue={user.phone ?? ''} name="phone" />
          </label>
          <label className="field">
            <span>Email</span>
            <input defaultValue={user.email ?? ''} name="email" type="email" />
          </label>
          <label className="field">
            <span>Date of birth</span>
            <input
              defaultValue={user.dateOfBirth ?? ''}
              name="dateOfBirth"
              type="date"
            />
          </label>
        </div>
        <button className="primary-button" type="submit">
          Save changes
        </button>
      </form>

      {user.isActive ? (
        <form action={deactivateUserAction} className="danger-panel">
          <input name="id" type="hidden" value={user.id} />
          <div>
            <h2>Deactivate account</h2>
            <p>Deactivation keeps history intact and removes the account from active operations.</p>
          </div>
          <button className="danger-button" type="submit">
            Deactivate
          </button>
        </form>
      ) : null}
    </main>
  );
}
