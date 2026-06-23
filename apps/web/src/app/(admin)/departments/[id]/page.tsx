import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { updateDepartmentAction } from '@/lib/admin/actions';
import { getDepartment, getShifts } from '@/lib/admin/data';

type DepartmentDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Department Detail | Face Web Admin',
};

export default async function DepartmentDetailPage({
  params,
  searchParams,
}: DepartmentDetailPageProps) {
  const [{ id }, noticeParams] = await Promise.all([params, searchParams]);
  const [department, shifts] = await Promise.all([
    getDepartment(id).catch(() => null),
    getShifts({ limit: 100, isActive: true, sortBy: 'name', sortOrder: 'ASC' }),
  ]);

  if (!department) {
    notFound();
  }

  return (
    <main className="admin-content">
      <PageHeader
        actions={
          <Link className="secondary-link" href="/departments">
            Back to departments
          </Link>
        }
        description="Update department metadata and default shift."
        eyebrow="Organization"
        title={department.name}
      />
      <Notice searchParams={noticeParams} />
      <div className="detail-summary">
        <span>{department.code}</span>
        <StatusBadge active={department.isActive} />
      </div>

      <form action={updateDepartmentAction} className="form-panel">
        <input name="id" type="hidden" value={department.id} />
        <div className="form-grid">
          <label className="field">
            <span>Code</span>
            <input
              defaultValue={department.code}
              name="code"
              pattern="[A-Za-z0-9_-]+"
              required
            />
          </label>
          <label className="field">
            <span>Name</span>
            <input defaultValue={department.name} name="name" required />
          </label>
          <label className="field">
            <span>Default shift</span>
            <select defaultValue={department.defaultShiftId} name="defaultShiftId" required>
              {shifts.items.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name}
                </option>
              ))}
            </select>
          </label>
          <label className="check-field">
            <input
              defaultChecked={department.isActive}
              name="isActive"
              type="checkbox"
            />
            <span>Active</span>
          </label>
        </div>
        <label className="field">
          <span>Description</span>
          <textarea
            defaultValue={department.description ?? ''}
            name="description"
            rows={4}
          />
        </label>
        <button className="primary-button" type="submit">
          Save changes
        </button>
      </form>
    </main>
  );
}
