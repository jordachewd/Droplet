"use client";

import Button from "@/components/shared/button";

interface ChatErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ChatErrorPage({
  error: _error,
  reset,
}: ChatErrorPageProps) {
  void _error;

  return (
    <div className="ChatErrorPage flex min-h-dvh items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-lg border border-slate-500 bg-lavenderHaze-100 p-6 text-center dark:border-slate-500 dark:bg-nightIndigo-900">
        <h1 className="heading-4">Something went wrong</h1>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
