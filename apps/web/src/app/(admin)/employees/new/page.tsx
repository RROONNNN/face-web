import Link from 'next/link';
import type { Metadata } from 'next';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { createUserAction } from '@/lib/admin/actions';
import { getDepartments } from '@/lib/admin/data';

type NewEmployeePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'New Employee | Face Web Admin',
};

export default async function NewEmployeePage({
  searchParams,
}: NewEmployeePageProps) {
  const params = await searchParams;
  const departments = await getDepartments({
    limit: 100,
    isActive: true,
    sortBy: 'name',
    sortOrder: 'ASC',
  });

  return (
    <main className="admin-content">
      <PageHeader
        actions={
          <Link className="secondary-link" href="/employees">
            Back to employees
          </Link>
        }
        description="Create an employee or admin account. If employee code is omitted, the API can generate one from date of birth."
        eyebrow="People"
        title="New employee"
      />
      <Notice searchParams={params} />
      <UserForm
        action={createUserAction}
        departments={departments.items}
        mode="create"
      />
    </main>
  );
}

function UserForm({
  action,
  departments,
  mode,
}: {
  action: (formData: FormData) => void;
  departments: Array<{ id: string; name: string }>;
  mode: 'create';
}) {
  return (
    <form action={action} className="form-panel">
      <div className="form-grid">
        <label className="field">
          <span>Employee code</span>
          <input name="employeeCode" placeholder="EMP001" />
        </label>
        <label className="field">
          <span>Name</span>
          <input name="name" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input minLength={6} name="password" required type="password" />
        </label>
        <label className="field">
          <span>Role</span>
          <select defaultValue="employee" name="accountRole">
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="field">
          <span>Department</span>
          <select name="departmentId">
            <option value="">Unassigned</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Job title</span>
          <input name="jobTitle" />
        </label>
        <label className="field">
          <span>Phone</span>
          <input name="phone" />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" />
        </label>
        <label className="field">
          <span>Date of birth</span>
          <input name="dateOfBirth" type="date" />
        </label>
      </div>
      <button className="primary-button" type="submit">
        {mode === 'create' ? 'Create employee' : 'Save changes'}
      </button>
    </form>
  );
}
