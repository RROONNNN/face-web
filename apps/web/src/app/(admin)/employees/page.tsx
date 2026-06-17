import { Pencil, Plus } from 'lucide-react';
import type { Employee, PaginatedResponse } from '@face-web/shared';
import { EmptyState } from '@/components/admin/empty-state';
import { EmployeeFields } from '@/components/admin/form-fields';
import { MessageBanner } from '@/components/admin/message-banner';
import { Pagination } from '@/components/admin/pagination';
import { SubmitButton } from '@/components/forms/submit-button';
import { createEmployeeAction, updateEmployeeAction } from '@/lib/actions';
import { backendFetch } from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  asInt,
  asString,
  buildReturnTo,
  type PageSearchParams,
} from '@/lib/search';

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const search = asString(params.search);
  const department = asString(params.department);
  const page = asInt(params.page);
  const limit = 10;
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (department) query.set('department', department);
  query.set('page', String(page));
  query.set('limit', String(limit));

  const employees = await backendFetch<PaginatedResponse<Employee>>(
    `/employees?${query.toString()}`,
  );
  const returnPath = buildReturnTo('/employees', {
    search,
    department,
    page: String(page),
  });

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <p className="eyebrow">People</p>
          <h1>Employees</h1>
          <p className="muted">Create accounts and maintain employee profiles.</p>
        </div>
      </section>

      <MessageBanner
        error={asString(params.error)}
        message={asString(params.message)}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Directory</h2>
            <p className="muted">{employees.total} employee records</p>
          </div>
          <details className="inline-details">
            <summary className="primary-button">
              <Plus aria-hidden="true" size={17} />
              New employee
            </summary>
            <form className="stacked-form" action={createEmployeeAction}>
              <input type="hidden" name="returnTo" value={returnPath} />
              <EmployeeFields />
              <SubmitButton className="primary-button">Create employee</SubmitButton>
            </form>
          </details>
        </div>

        <form className="filter-bar">
          <label>
            <span>Search</span>
            <input
              name="search"
              placeholder="Name or code"
              defaultValue={search ?? ''}
            />
          </label>
          <label>
            <span>Department</span>
            <input name="department" defaultValue={department ?? ''} />
          </label>
          <button className="secondary-button" type="submit">
            Filter
          </button>
        </form>

        {employees.items.length === 0 ? (
          <EmptyState
            title="No employees found"
            detail="Adjust filters or create the first employee account."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Date of birth</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.items.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <strong>{employee.name}</strong>
                      <span className="subtext">{employee.employeeCode}</span>
                    </td>
                    <td>
                      {employee.department ?? '-'}
                      <span className="subtext">{employee.jobTitle ?? '-'}</span>
                    </td>
                    <td>
                      {employee.email ?? '-'}
                      <span className="subtext">{employee.phone ?? '-'}</span>
                    </td>
                    <td>{formatDate(employee.dateOfBirth)}</td>
                    <td>
                      <details className="row-details">
                        <summary className="icon-button" title="Edit employee">
                          <Pencil aria-hidden="true" size={16} />
                        </summary>
                        <form
                          className="stacked-form"
                          action={updateEmployeeAction.bind(null, employee.id)}
                        >
                          <input type="hidden" name="returnTo" value={returnPath} />
                          <EmployeeFields employee={employee} />
                          <SubmitButton className="primary-button">
                            Save changes
                          </SubmitButton>
                        </form>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          basePath="/employees"
          page={employees.page}
          limit={employees.limit}
          total={employees.total}
          searchParams={{ search, department }}
        />
      </section>
    </main>
  );
}
