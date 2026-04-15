"use client";

import Link from "next/link";
import Button from "@/components/shared/button";

interface AdminErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminErrorPage({
  error: _error,
  reset,
}: AdminErrorPageProps) {
  void _error;

  return (
    <section className="AdminErrorPage flex w-full items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-xl flex-col items-center gap-4 error-card">
        <h1 className="heading-4">Something went wrong</h1>
        <p className="admin-muted-text">
          The admin panel hit an unexpected error.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Link href="/admin" className="btn btn-sm btn-outlined">
            Back to Admin
          </Link>
        </div>
      </div>
    </section>
  );
}
