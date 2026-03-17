"use client";

import classNames from "classnames";
import { useFormStatus } from "react-dom";
import LoadingBubbles from "@/components/shared/loading-bubbles";

interface AdminFormSubmitButtonProps {
  label: string;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function AdminFormSubmitButton({
  label,
  pendingLabel,
  className,
  disabled = false,
}: AdminFormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={classNames(className)}
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <LoadingBubbles size="small" className="w-auto gap-0.5" />
          {pendingLabel ?? `${label}...`}
        </span>
      ) : (
        label
      )}
    </button>
  );
}
