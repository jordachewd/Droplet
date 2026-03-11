"use client";

import Link from "next/link";
import classNames from "classnames";

interface ChatSidebarPromoProps {
  isOpen: boolean;
}

export default function ChatSidebarPromo({ isOpen }: ChatSidebarPromoProps) {
  return (
    <section
      className={classNames("ChatSidebarPromo p-3", !isOpen && "hidden")}
    >
      <article
        className={classNames(
          "rounded-xl border p-3 shadow-sm",
          "border-lightBorders-400 bg-white/70 dark:border-darkBorders-500 dark:bg-jwdMarine-900/70",
        )}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">
          Plan Status
        </p>
        <p className="mb-3 text-sm">
          Unlock image and audio features with Pro.
        </p>
        <Link
          className="btn btn-sm btn-contained w-full justify-center"
          href="/app/plans"
        >
          Manage Plan
        </Link>
      </article>
    </section>
  );
}
