import Link from "next/link";
import classNames from "classnames";

interface AccountLoadErrorStateProps {
  supportEmail: string;
  retryHref: string;
  containerClassName?: string;
}

export default function AccountLoadErrorState({
  supportEmail,
  retryHref,
  containerClassName,
}: AccountLoadErrorStateProps) {
  return (
    <div
      className={classNames(
        "AccountLoadErrorState flex h-dvh items-center justify-center",
        containerClassName,
      )}
    >
      <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
        <p className="mb-4 text-red-700 dark:text-red-300">
          We&apos;re having trouble loading your account. Please try refreshing
          the page or contact support.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href={`mailto:${supportEmail}`}
            className="text-sm text-blue-600 underline dark:text-blue-400"
          >
            Contact Support
          </a>
          <Link
            href={retryHref}
            className="text-sm text-blue-600 underline dark:text-blue-400"
          >
            Retry
          </Link>
        </div>
      </div>
    </div>
  );
}
