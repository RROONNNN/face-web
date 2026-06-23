import { firstParam } from '@/lib/api/query';

type NoticeProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export function Notice({ searchParams }: NoticeProps) {
  const error = firstParam(searchParams.error);
  const success = firstParam(searchParams.success);

  if (!error && !success) {
    return null;
  }

  return (
    <div
      className={error ? 'notice notice-error' : 'notice notice-success'}
      role={error ? 'alert' : 'status'}
    >
      {error ?? success}
    </div>
  );
}
