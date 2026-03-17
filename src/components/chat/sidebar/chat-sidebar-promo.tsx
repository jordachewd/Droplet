"use client";

import Link from "next/link";
import classNames from "classnames";
import { PlanName } from "@/types/PlanData.d";
import { UserRoles } from "@/types/UserData.d";

interface ChatSidebarPromoProps {
  isOpen: boolean;
  userRole?: UserRoles;
  planName?: PlanName | null;
}

export default function ChatSidebarPromo({
  isOpen,
  userRole,
  planName,
}: ChatSidebarPromoProps) {
  if (userRole === "admin") {
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
            Admin Access
          </p>
          <p className="text-sm">Full permissions enabled for admin users.</p>
        </article>
      </section>
    );
  }

  if (planName === "Premium") {
    return null;
  }

  const promoMessage =
    planName === "Pro"
      ? "Upgrade to Premium for highest limits and premium workflows."
      : "Upgrade to Pro for higher usage limits and more persona access.";

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
        <p className="mb-3 text-sm">{promoMessage}</p>
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
