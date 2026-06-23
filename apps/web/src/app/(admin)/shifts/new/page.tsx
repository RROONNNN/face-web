import Link from 'next/link';
import type { Metadata } from 'next';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { createShiftAction } from '@/lib/admin/actions';

type NewShiftPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'New Shift | Face Web Admin',
};

export default async function NewShiftPage({ searchParams }: NewShiftPageProps) {
  const params = await searchParams;

  return (
    <main className="admin-content">
      <PageHeader
        actions={
          <Link className="secondary-link" href="/shifts">
            Back to shifts
          </Link>
        }
        description="Create a shift template with one or more work periods."
        eyebrow="Scheduling"
        title="New shift"
      />
      <Notice searchParams={params} />
      <ShiftForm action={createShiftAction} />
    </main>
  );
}

function ShiftForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="form-panel">
      <div className="form-grid">
        <label className="field">
          <span>Name</span>
          <input name="name" required />
        </label>
        <label className="field">
          <span>Late grace minutes</span>
          <input defaultValue={0} min={0} name="lateGraceMinutes" type="number" />
        </label>
        <label className="check-field">
          <input defaultChecked name="isActive" type="checkbox" />
          <span>Active</span>
        </label>
      </div>
      <WorkPeriodFields />
      <button className="primary-button" type="submit">
        Create shift
      </button>
    </form>
  );
}

function WorkPeriodFields() {
  return (
    <fieldset className="fieldset">
      <legend>Work periods</legend>
      {[0, 1, 2, 3].map((index) => (
        <div className="period-row" key={index}>
          <label className="field">
            <span>Name</span>
            <input
              name={`workPeriods.${index}.name`}
              placeholder={index === 0 ? 'Morning' : 'Optional'}
              required={index === 0}
            />
          </label>
          <label className="field">
            <span>Start</span>
            <input
              name={`workPeriods.${index}.startTime`}
              required={index === 0}
              type="time"
            />
          </label>
          <label className="field">
            <span>End</span>
            <input
              name={`workPeriods.${index}.endTime`}
              required={index === 0}
              type="time"
            />
          </label>
          <label className="check-field">
            <input name={`workPeriods.${index}.isCrossMidnight`} type="checkbox" />
            <span>Crosses midnight</span>
          </label>
        </div>
      ))}
    </fieldset>
  );
}
