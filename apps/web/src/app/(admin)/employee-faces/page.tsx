import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/admin/empty-state';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import {
  deleteEmployeeFaceAction,
  importEmployeeFacesAction,
} from '@/lib/admin/actions';
import { getEmployeeFaces } from '@/lib/admin/data';
import { numberParam } from '@/lib/api/query';
import type { EmployeeFace } from '@/lib/api/types';
import { getSession } from '@/lib/auth/session';

type EmployeeFacesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Employee Faces | Face Web Admin',
};

export default async function EmployeeFacesPage({
  searchParams,
}: EmployeeFacesPageProps) {
  const [params, session] = await Promise.all([searchParams, getSession()]);

  if (!session || session.user.accountRole !== 'admin') {
    redirect('/login');
  }

  const query = {
    page: numberParam(params.page, 1),
    limit: numberParam(params.limit, 20),
  };
  const faces = await getEmployeeFaces(query);

  return (
    <main className="admin-content">
      <PageHeader
        description="Review employee face enrollment data and import mobile sync JSON files."
        eyebrow="Face Recognition"
        title="Employee faces"
      />
      <Notice searchParams={params} />

      <details className="settings-panel employee-face-actions" open>
        <summary>Import</summary>
        <section className="employee-face-import-panel">
          <form action={importEmployeeFacesAction} className="employee-face-upload-form">
            <label className="field">
              <span>Face data JSON</span>
              <input accept="application/json,.json" name="file" required type="file" />
            </label>
            <button className="primary-button" type="submit">
              Import JSON
            </button>
          </form>
          <div className="employee-face-summary" aria-label="Face data totals">
            <span>Total records</span>
            <strong>{faces.meta.total}</strong>
          </div>
        </section>
      </details>

      <form className="filter-bar employee-face-filter">
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

      {faces.items.length === 0 ? (
        <EmptyState message="No employee face data has been enrolled." />
      ) : (
        <div className="table-wrap employee-face-table">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Code</th>
                <th>Department</th>
                <th>Embedding</th>
                <th>Image</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {faces.items.map((face) => (
                <tr key={face.id}>
                  <td>
                    {face.employee ? (
                      <Link className="table-link" href={`/employees/${face.employee.id}`}>
                        {face.employee.name}
                      </Link>
                    ) : (
                      face.employeeId
                    )}
                    <span>{face.employee?.jobTitle ?? 'No job title'}</span>
                  </td>
                  <td>{face.employee?.employeeCode ?? '-'}</td>
                  <td>{face.employee?.department ?? 'Unassigned'}</td>
                  <td>{renderEmbeddingSummary(face)}</td>
                  <td>
                    {face.imageUrl ? (
                      <a className="table-link" href={face.imageUrl} rel="noreferrer" target="_blank">
                        Open image
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{formatDateTime(face.updatedTime)}</td>
                  <td>
                    <form action={deleteEmployeeFaceAction} className="employee-face-delete-form">
                      <input name="employeeId" type="hidden" value={face.employeeId} />
                      <button className="danger-button" type="submit">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/employee-faces" meta={faces.meta} query={query} />
    </main>
  );
}

function renderEmbeddingSummary(face: EmployeeFace) {
  const vectorCount = face.listFaceEmbedding.length;
  const dimensionCount = face.listFaceEmbedding[0]?.length ?? 0;

  return (
    <>
      {vectorCount} {vectorCount === 1 ? 'vector' : 'vectors'}
      <span>{dimensionCount} dimensions</span>
    </>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
