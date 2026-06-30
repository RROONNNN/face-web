import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/admin/empty-state';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import {
  createHolidayAction,
  deleteHolidayAction,
  importHolidaysAction,
  updateHolidayAction,
} from '@/lib/admin/actions';
import { getHolidays } from '@/lib/admin/data';
import { firstParam, numberParam } from '@/lib/api/query';
import type { Holiday, SortOrder } from '@/lib/api/types';
import { getSession } from '@/lib/auth/session';

type HolidaysPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type HolidaySortBy = 'date' | 'name' | 'createdAt';

export const metadata: Metadata = {
  title: 'Holidays | Face Web Admin',
};

export default async function HolidaysPage({ searchParams }: HolidaysPageProps) {
  const [params, session] = await Promise.all([searchParams, getSession()]);

  if (!session || session.user.accountRole !== 'admin') {
    redirect('/login');
  }

  const query = {
    page: numberParam(params.page, 1),
    limit: numberParam(params.limit, 20),
    search: firstParam(params.search),
    year: yearParam(firstParam(params.year)),
    sortBy: sortByParam(firstParam(params.sortBy)),
    sortOrder: sortOrderParam(firstParam(params.sortOrder)),
  };
  const holidays = await getHolidays(query);

  return (
    <main className="admin-content">
      <PageHeader
        description="Manage company holidays used by attendance calendars, leave validation, and working-day calculations."
        eyebrow="Administration"
        title="Holidays"
      />
      <Notice searchParams={params} />

      <details className="settings-panel holiday-actions" open>
        <summary>Create and import</summary>
        <section className="holiday-action-grid">
          <form action={createHolidayAction} className="form-panel holiday-create-form">
            <div className="form-grid">
              <label className="field">
                <span>Date</span>
                <input name="date" required type="date" />
              </label>
              <label className="field">
                <span>Name</span>
                <input maxLength={200} name="name" required type="text" />
              </label>
            </div>
            <label className="field">
              <span>Description</span>
              <textarea name="description" rows={3} />
            </label>
            <button className="primary-button" type="submit">
              Create holiday
            </button>
          </form>

          <form action={importHolidaysAction} className="form-panel holiday-import-form">
            <label className="field">
              <span>Excel file</span>
              <input
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                name="file"
                required
                type="file"
              />
            </label>
            <p className="form-hint">
              Expected columns: date, name, description. Supported date formats:
              YYYY-MM-DD, dd/mm/yyyy, or Excel serial date.
            </p>
            <button className="secondary-button" type="submit">
              Import Excel
            </button>
          </form>
        </section>
      </details>

      <form className="filter-bar holiday-filter">
        <input
          defaultValue={query.search ?? ''}
          name="search"
          placeholder="Search holiday name"
          type="search"
        />
        <input
          defaultValue={query.year ?? ''}
          inputMode="numeric"
          min="1900"
          name="year"
          placeholder="Year"
          type="number"
        />
        <select defaultValue={query.sortBy} name="sortBy">
          <option value="date">Date</option>
          <option value="name">Name</option>
          <option value="createdAt">Created</option>
        </select>
        <select defaultValue={query.sortOrder} name="sortOrder">
          <option value="ASC">Ascending</option>
          <option value="DESC">Descending</option>
        </select>
        <select defaultValue={query.limit} name="limit">
          <option value="10">10 per page</option>
          <option value="20">20 per page</option>
          <option value="50">50 per page</option>
          <option value="100">100 per page</option>
        </select>
        <button className="secondary-button" type="submit">
          Apply
        </button>
      </form>

      {holidays.items.length === 0 ? (
        <EmptyState message="No holidays match the current filters." />
      ) : (
        <div className="table-wrap holiday-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Holiday</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {holidays.items.map((holiday) => (
                <tr key={holiday.id}>
                  <td>{formatHolidayDate(holiday.date)}</td>
                  <td>
                    <strong>{holiday.name}</strong>
                    <span>{holiday.description || 'No description'}</span>
                  </td>
                  <td>{formatDateTime(holiday.createdAt)}</td>
                  <td>{formatDateTime(holiday.updatedAt)}</td>
                  <td>
                    <div className="holiday-row-actions">
                      <details className="holiday-edit-panel">
                        <summary>Edit</summary>
                        <HolidayEditForm holiday={holiday} />
                      </details>
                      <form action={deleteHolidayAction} className="holiday-delete-form">
                        <input name="id" type="hidden" value={holiday.id} />
                        <button className="danger-button" type="submit">
                          Delete
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

      <Pagination basePath="/holidays" meta={holidays.meta} query={query} />
    </main>
  );
}

function HolidayEditForm({ holiday }: { holiday: Holiday }) {
  return (
    <form action={updateHolidayAction} className="holiday-edit-form">
      <input name="id" type="hidden" value={holiday.id} />
      <label className="field">
        <span>Date</span>
        <input defaultValue={holiday.date} name="date" required type="date" />
      </label>
      <label className="field">
        <span>Name</span>
        <input
          defaultValue={holiday.name}
          maxLength={200}
          name="name"
          required
          type="text"
        />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea defaultValue={holiday.description ?? ''} name="description" rows={3} />
      </label>
      <button className="primary-button" type="submit">
        Save
      </button>
    </form>
  );
}

function yearParam(value: string | undefined): number | undefined {
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1900 ? parsed : undefined;
}

function sortByParam(value: string | undefined): HolidaySortBy {
  if (value === 'name' || value === 'createdAt') {
    return value;
  }

  return 'date';
}

function sortOrderParam(value: string | undefined): SortOrder {
  return value === 'DESC' ? 'DESC' : 'ASC';
}

function formatHolidayDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
