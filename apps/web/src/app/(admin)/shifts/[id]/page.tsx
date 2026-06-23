import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import {
  deactivateShiftAction,
  updateShiftAction,
} from '@/lib/admin/actions';
import { getShift } from '@/lib/admin/data';
import type { ShiftWorkPeriod } from '@/lib/api/types';

type ShiftDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Shift Detail | Face Web Admin',
};

export default async function ShiftDetailPage({
  params,
  searchParams,
}: ShiftDetailPageProps) {
  const [{ id }, noticeParams] = await Promise.all([params, searchParams]);
  const shift = await getShift(id);

  if (!shift) {
    notFound();
  }

  return (
    <main className="admin-content">
      <PageHeader
        actions={
          <Link className="secondary-link" href="/shifts">
            Back to shifts
          </Link>
        }
        description="Update shift details and work periods."
        eyebrow="Scheduling"
        title={shift.name}
      />
      <Notice searchParams={noticeParams} />
      <div className="detail-summary">
        <StatusBadge active={shift.isActive} />
        <span>{shift.lateGraceMinutes} grace minutes</span>
      </div>

      <form action={updateShiftAction} className="form-panel">
        <input name="id" type="hidden" value={shift.id} />
        <div className="form-grid">
          <label className="field">
            <span>Name</span>
            <input defaultValue={shift.name} name="name" required />
          </label>
          <label className="field">
            <span>Late grace minutes</span>
            <input
              defaultValue={shift.lateGraceMinutes}
              min={0}
              name="lateGraceMinutes"
              type="number"
            />
          </label>
          <label className="check-field">
            <input defaultChecked={shift.isActive} name="isActive" type="checkbox" />
            <span>Active</span>
          </label>
        </div>
        <WorkPeriodFields periods={shift.workPeriods ?? []} />
        <button className="primary-button" type="submit">
          Save changes
        </button>
      </form>

      {shift.isActive ? (
        <form action={deactivateShiftAction} className="danger-panel">
          <input name="id" type="hidden" value={shift.id} />
          <div>
            <h2>Deactivate shift</h2>
            <p>Deactivated shifts remain available in history but cannot be assigned.</p>
          </div>
          <button className="danger-button" type="submit">
            Deactivate
          </button>
        </form>
      ) : null}
    </main>
  );
}

function WorkPeriodFields({ periods }: { periods: ShiftWorkPeriod[] }) {
  const rows = [...periods, ...Array.from({ length: Math.max(0, 4 - periods.length) })].slice(0, 4);

  return (
    <fieldset className="fieldset">
      <legend>Work periods</legend>
      {rows.map((period, index) => {
        const value = period as ShiftWorkPeriod | undefined;

        return (
          <div className="period-row" key={value?.id ?? index}>
            <label className="field">
              <span>Name</span>
              <input
                defaultValue={value?.name ?? ''}
                name={`workPeriods.${index}.name`}
                required={index === 0}
              />
            </label>
            <label className="field">
              <span>Start</span>
              <input
                defaultValue={toTimeInputValue(value?.startTime)}
                name={`workPeriods.${index}.startTime`}
                required={index === 0}
                type="time"
              />
            </label>
            <label className="field">
              <span>End</span>
              <input
                defaultValue={toTimeInputValue(value?.endTime)}
                name={`workPeriods.${index}.endTime`}
                required={index === 0}
                type="time"
              />
            </label>
            <label className="check-field">
              <input
                defaultChecked={value?.isCrossMidnight ?? false}
                name={`workPeriods.${index}.isCrossMidnight`}
                type="checkbox"
              />
              <span>Crosses midnight</span>
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}

function toTimeInputValue(value: string | undefined): string {
  return value?.slice(0, 5) ?? '';
}
