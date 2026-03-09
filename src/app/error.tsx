"use client";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error: _error, reset }: ErrorPageProps) {
  void _error;

  return (
    <div className="ErrorPage flex min-h-dvh items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-lg border border-lightBorders-500 bg-white p-6 text-center dark:border-darkBorders-500 dark:bg-jwdMarine-900">
        <h1 className="heading-4">Something went wrong</h1>
        <button className="btn btn-contained" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}
