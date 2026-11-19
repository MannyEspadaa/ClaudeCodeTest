"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted">You may not have access to this page, or it failed to load.</p>
      <button type="button" onClick={reset} className="rounded-md border border-border px-4 py-2">
        Try again
      </button>
    </div>
  );
}
