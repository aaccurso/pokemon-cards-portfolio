"use client";

/** Runtime error boundary for the app segment; data errors fail the build before this can render. */
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container error-page">
      <h1>Something went wrong</h1>
      <p className="error-detail">{error.message}</p>
      <button className="action-button primary" onClick={reset}>
        Reload
      </button>
    </main>
  );
}
