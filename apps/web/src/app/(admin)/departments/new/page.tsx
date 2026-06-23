import Link from 'next/link';
import type { Metadata } from 'next';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { createDepartmentAction } from '@/lib/admin/actions';
import { getShifts } from '@/lib/admin/data';

type NewDepartmentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'New Department | Face Web Admin',
};

export default async function NewDepartmentPage({
  searchParams,
}: NewDepartmentPageProps) {
  const params = await searchParams;
  const shifts = await getShifts({
    limit: 100,
    isActive: true,
    sortBy: 'name',
    sortOrder: 'ASC',
  });

  return (
    <main className="admin-content">
      <PageHeader
        actions={
          <Link className="secondary-link" href="/departments">
            Back to departments
          </Link>
        }
        description="Create a department and assign its default active shift."
        eyebrow="Organization"
        title="New department"
      />
      <Notice searchParams={params} />
      <DepartmentForm
        action={createDepartmentAction}
        buttonLabel="Create department"
        shifts={shifts.items}
      />
    </main>
  );
}

function DepartmentForm({
  action,
  buttonLabel,
  shifts,
}: {
  action: (formData: FormData) => void;
  buttonLabel: string;
  shifts: Array<{ id: string; name: string }>;
}) {
  return (
    <form action={action} className="form-panel">
      <div className="form-grid">
        <label className="field">
          <span>Code</span>
          <input name="code" pattern="[A-Za-z0-9_-]+" required />
        </label>
        <label className="field">
          <span>Name</span>
          <input name="name" required />
        </label>
        <label className="field">
          <span>Default shift</span>
          <select name="defaultShiftId" required>
            <option value="">Select shift</option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.name}
              </option>
            ))}
          </select>
        </label>
        <label className="check-field">
          <input defaultChecked name="isActive" type="checkbox" />
          <span>Active</span>
        </label>
      </div>
      <label className="field">
        <span>Description</span>
        <textarea name="description" rows={4} />
      </label>
      <button className="primary-button" type="submit">
        {buttonLabel}
      </button>
    </form>
  );
}
