'use client';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="admin-content">
      <section className="error-panel">
        <p className="eyebrow">Error</p>
        <h1>Something went wrong</h1>
        <p>{error.message}</p>
        <button className="primary-button" onClick={reset} type="button">
          Try again
        </button>
      </section>
    </main>
  );
}
