'use client';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="content">
      <section className="panel">
        <p className="eyebrow">Error</p>
        <h1>Unable to load this view</h1>
        <p className="muted">{error.message}</p>
        <button className="primary-button" type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
