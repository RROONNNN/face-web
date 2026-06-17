import Link from 'next/link';

type PaginationProps = {
  page: number;
  limit: number;
  total: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
};

function hrefFor(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  page: number,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== 'message' && key !== 'error') {
      params.set(key, value);
    }
  }

  params.set('page', String(page));
  return `${basePath}?${params.toString()}`;
}

export function Pagination({
  page,
  limit,
  total,
  basePath,
  searchParams = {},
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <Link
        className={page <= 1 ? 'disabled page-button' : 'page-button'}
        aria-disabled={page <= 1}
        href={hrefFor(basePath, searchParams, Math.max(1, page - 1))}
      >
        Previous
      </Link>
      <span>
        Page {page} of {totalPages}
      </span>
      <Link
        className={page >= totalPages ? 'disabled page-button' : 'page-button'}
        aria-disabled={page >= totalPages}
        href={hrefFor(basePath, searchParams, Math.min(totalPages, page + 1))}
      >
        Next
      </Link>
    </div>
  );
}
