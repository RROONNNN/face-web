import { ExternalLink, Trash2 } from 'lucide-react';
import type { FaceData, PaginatedResponse } from '@face-web/shared';
import { EmptyState } from '@/components/admin/empty-state';
import { MessageBanner } from '@/components/admin/message-banner';
import { Pagination } from '@/components/admin/pagination';
import { deleteFaceDataAction } from '@/lib/actions';
import { backendFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import {
  asInt,
  asString,
  buildReturnTo,
  type PageSearchParams,
} from '@/lib/search';

export default async function FacePage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const page = asInt(params.page);
  const limit = 10;
  const records = await backendFetch<PaginatedResponse<FaceData>>(
    `/face?page=${page}&limit=${limit}`,
  );
  const returnPath = buildReturnTo('/face', { page: String(page) });

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Biometrics</p>
          <h1>Face data</h1>
          <p className="muted">Review synced face records and image references.</p>
        </div>
      </section>

      <MessageBanner
        error={asString(params.error)}
        message={asString(params.message)}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Face records</h2>
            <p className="muted">{records.total} records</p>
          </div>
        </div>

        {records.items.length === 0 ? (
          <EmptyState
            title="No face data"
            detail="Face data synced from employees will appear here."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Image</th>
                  <th>Embeddings</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.employee?.name ?? item.employeeId}</strong>
                      <span className="subtext">
                        {item.employee?.employeeCode ?? '-'}
                      </span>
                    </td>
                    <td>
                      <div className="image-link-cell">
                        <span
                          className="image-thumb"
                          aria-hidden="true"
                          style={{ backgroundImage: `url("${item.imageUrl}")` }}
                        />
                        <a href={item.imageUrl} target="_blank" rel="noreferrer">
                          Open image
                          <ExternalLink aria-hidden="true" size={14} />
                        </a>
                      </div>
                    </td>
                    <td>{item.listFaceEmbedding.length}</td>
                    <td>{formatDateTime(item.updatedTime)}</td>
                    <td>
                      <form
                        action={deleteFaceDataAction.bind(null, item.employeeId)}
                      >
                        <input type="hidden" name="returnTo" value={returnPath} />
                        <button className="icon-button danger" title="Delete">
                          <Trash2 aria-hidden="true" size={16} />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          basePath="/face"
          page={records.page}
          limit={records.limit}
          total={records.total}
        />
      </section>
    </main>
  );
}
