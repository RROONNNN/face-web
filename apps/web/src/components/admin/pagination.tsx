import Link from 'next/link';
import type { PaginationMeta } from '@/lib/api/types';

type PaginationProps = {
  basePath: string;
  meta: PaginationMeta;
  query: Record<string, string | number | boolean | undefined>;
};

export function Pagination({ basePath, meta, query }: PaginationProps) {
  const previousPage = meta.page - 1;
  const nextPage = meta.page + 1;

  return (
    <nav className="pagination" aria-label="Pagination">
      <PaginationLink
        basePath={basePath}
        disabled={meta.page <= 1}
        label="Previous"
        page={previousPage}
        query={query}
      />
      <span>
        Page {meta.page} of {Math.max(meta.totalPages, 1)}
      </span>
      <PaginationLink
        basePath={basePath}
        disabled={meta.page >= meta.totalPages}
        label="Next"
        page={nextPage}
        query={query}
      />
    </nav>
  );
}

function PaginationLink({
  basePath,
  disabled,
  label,
  page,
  query,
}: {
  basePath: string;
  disabled: boolean;
  label: string;
  page: number;
  query: Record<string, string | number | boolean | undefined>;
}) {
  if (disabled) {
    return <span className="pagination-disabled">{label}</span>;
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries({ ...query, page })) {
    if (value !== undefined && String(value) !== '') {
      params.set(key, String(value));
    }
  }

  return <Link href={`${basePath}?${params.toString()}`}>{label}</Link>;
}
