import { CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react';
import type { PaginatedResponse, Shift } from '@face-web/shared';
import { EmptyState } from '@/components/admin/empty-state';
import { ShiftFields } from '@/components/admin/form-fields';
import { MessageBanner } from '@/components/admin/message-banner';
import { Pagination } from '@/components/admin/pagination';
import { SubmitButton } from '@/components/forms/submit-button';
import {
  activateShiftAction,
  createShiftAction,
  deleteShiftAction,
  updateShiftAction,
} from '@/lib/actions';
import { backendFetch } from '@/lib/api';
import {
  asInt,
  asString,
  buildReturnTo,
  type PageSearchParams,
} from '@/lib/search';

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const page = asInt(params.page);
  const limit = 10;
  const shifts = await backendFetch<PaginatedResponse<Shift>>(
    `/shifts?page=${page}&limit=${limit}`,
  );
  const returnPath = buildReturnTo('/shifts', { page: String(page) });

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Schedule</p>
          <h1>Shifts</h1>
          <p className="muted">Manage the company-wide active shift.</p>
        </div>
      </section>

      <MessageBanner
        error={asString(params.error)}
        message={asString(params.message)}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Shift rules</h2>
            <p className="muted">Only one shift should be active at a time.</p>
          </div>
          <details className="inline-details">
            <summary className="primary-button">
              <Plus aria-hidden="true" size={17} />
              New shift
            </summary>
            <form className="stacked-form" action={createShiftAction}>
              <input type="hidden" name="returnTo" value={returnPath} />
              <ShiftFields />
              <SubmitButton className="primary-button">Create shift</SubmitButton>
            </form>
          </details>
        </div>

        {shifts.items.length === 0 ? (
          <EmptyState
            title="No shifts configured"
            detail="Create and activate a shift before attendance records are created."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.items.map((shift) => (
                  <tr key={shift.id}>
                    <td>
                      <strong>{shift.name}</strong>
                    </td>
                    <td>
                      {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                    </td>
                    <td>
                      <span className={shift.isActive ? 'pill success' : 'pill'}>
                        {shift.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-row">
                        {!shift.isActive ? (
                          <form action={activateShiftAction.bind(null, shift.id)}>
                            <input
                              type="hidden"
                              name="returnTo"
                              value={returnPath}
                            />
                            <button className="icon-button" title="Activate">
                              <CheckCircle2 aria-hidden="true" size={16} />
                            </button>
                          </form>
                        ) : null}
                        <details className="row-details">
                          <summary className="icon-button" title="Edit shift">
                            <Pencil aria-hidden="true" size={16} />
                          </summary>
                          <form
                            className="stacked-form"
                            action={updateShiftAction.bind(null, shift.id)}
                          >
                            <input
                              type="hidden"
                              name="returnTo"
                              value={returnPath}
                            />
                            <ShiftFields shift={shift} />
                            <SubmitButton className="primary-button">
                              Save shift
                            </SubmitButton>
                          </form>
                        </details>
                        <form action={deleteShiftAction.bind(null, shift.id)}>
                          <input type="hidden" name="returnTo" value={returnPath} />
                          <button className="icon-button danger" title="Delete">
                            <Trash2 aria-hidden="true" size={16} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          basePath="/shifts"
          page={shifts.page}
          limit={shifts.limit}
          total={shifts.total}
        />
      </section>
    </main>
  );
}
